import type { ServiceGraph } from '@domain/model/service-graph';
import type { ElementId, FormComponentId } from '@domain/model/ids';
import { findElementContainer, type ElementContainerRef } from '@domain/element-containers';
import { computeGraphDepths } from '@domain/graph-depths';
import { computeFormElementDepths } from '@domain/step-element-depths';
import { validateGraph } from '@domain/invariants';
import type { Command } from './command';
import { preserveFormElementDepths, preservePageDepths } from './depth-preservation';
import { InvariantViolationError } from './errors';
import { findElementLocation, findElementOwnerPageId } from './graph-lookup';

// Команда переноса элемента канваса (замечание приёмки N2): dnd карточек —
// переупорядочивание внутри списка узла/шага и перенос между узлами
// (List item — между Главной и подсценариями, компоненты форм — между
// шагами, в том числе другой формы). Мутация — единственный способ
// изменить граф (конституция, железное правило 1).
//
// Цель задаётся списком-приёмником; позиция — якорем (карточка-сосед и
// сторона от неё), чтобы UI не считал индексы в сжатых списках (T-033):
// команда сама находит якорь в приёмнике ПОСЛЕ изъятия элемента из
// источника — сдвиг индексов приёмника не снаружи.

// Приёмник — любой контейнер элементов (Главная, подсценарий, шаг формы):
// элементы равноправны [owner 2026-10-13], любой вид — в любой контейнер.
export type MoveElementTarget = ElementContainerRef;

export type DropAnchor = {
  /** Карточка-якорь в приёмнике: элемент встаёт до/после неё. */
  elementId: ElementId | FormComponentId;
  placement: 'before' | 'after';
};

export class MoveElement implements Command {
  readonly name = 'MoveElement';

  constructor(
    private readonly elementId: ElementId | FormComponentId,
    private readonly target: MoveElementTarget,
    private readonly anchor?: DropAnchor,
    // Колонка внутри шага-приёмника [owner 2026-10-13] (только для formStep):
    // dnd бросил компонент в колонку шага; undefined — колонка не меняется
    // (переупорядочивание внутри колонки или перенос без выбора колонки).
    private readonly layerDepth?: number,
  ) {}

  apply(draft: ServiceGraph): void {
    // Уровни до мутации: страницы, потерявшие связи, остаются на месте (ADR-15).
    const depthsBeforeRemoval = computeGraphDepths(draft);
    const elementDepthsBefore = computeFormElementDepths(draft);
    const location = findElementLocation(draft, this.elementId);
    if (!location) {
      throw new Error(`Элемент не найден: ${this.elementId}`);
    }
    const targetContainer = findElementContainer(draft, this.target);
    if (!targetContainer) {
      throw new Error('Приёмник для переноса не найден');
    }
    const targetList = targetContainer.elements;

    const [moved] = location.elements.splice(location.index, 1);

    // Каскад сложной логики: элемент уходит в ДРУГОЙ контейнер (той же или
    // другой формы) — правила, где он источник или цель, невалидны (L-I5:
    // логика только внутри одного шага, ADR-14). Перенос в другую колонку
    // своего шага рвёт их же [owner 2026-10-13]: переносится один элемент,
    // без группы, — старые связи теряют смысл. Порядок внутри колонки
    // правил не трогает.
    const changesStep = targetList !== location.elements;
    const changesColumn =
      this.layerDepth !== undefined && this.layerDepth !== elementDepthsBefore.get(this.elementId);
    const touchesStep = location.ref.kind === 'formStep' || this.target.kind === 'formStep';
    if (touchesStep && (changesStep || changesColumn)) {
      draft.logicRules = draft.logicRules.filter(
        (rule) => rule.sourceElementId !== this.elementId && rule.targetElementId !== this.elementId,
      );
      const component = moved!;
      if (this.layerDepth !== undefined) {
        component.layerDepth = this.layerDepth;
      } else {
        delete component.layerDepth; // в чужом шаге прежняя колонка не имеет смысла
      }
    }

    // Позиция: якорь ищется в приёмнике после изъятия — индексы уже чистые.
    let toIndex = targetList.length;
    if (this.anchor) {
      const anchorIndex = targetList.findIndex((item) => item.id === this.anchor!.elementId);
      if (anchorIndex >= 0) {
        toIndex = this.anchor.placement === 'before' ? anchorIndex : anchorIndex + 1;
      }
    }
    targetList.splice(toIndex, 0, moved!);

    // Каскад N4: исходящие связи перенесённого элемента осмысленны только
    // между смежными уровнями «источник + 1 = цель» — после смены владельца
    // страницы несмежные связи рвутся (то же правило, что у SetPageLayerDepth).
    const depths = computeGraphDepths(draft);
    draft.links = draft.links.filter((link) => {
      if (link.sourceElementId !== this.elementId) {
        return true;
      }
      const sourcePageId = findElementOwnerPageId(draft, link.sourceElementId);
      const sourceDepth = sourcePageId !== null ? depths.get(sourcePageId) : undefined;
      const targetDepth = depths.get(link.targetId);
      if (sourceDepth === undefined || targetDepth === undefined) {
        return true; // битая ссылка — инварианты фиксируют, здесь не трогаем
      }
      return targetDepth === sourceDepth + 1;
    });

    preservePageDepths(draft, depthsBeforeRemoval);
    preserveFormElementDepths(draft, elementDepthsBefore, new Set([this.elementId]));

    const violations = validateGraph(draft);
    if (violations.length > 0) {
      throw new InvariantViolationError(violations);
    }
  }
}
