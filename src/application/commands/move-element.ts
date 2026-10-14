import type { ServiceGraph } from '@domain/model/service-graph';
import type { ElementId, FormComponentId } from '@domain/model/ids';
import { computeGraphDepths } from '@domain/graph-depths';
import { computeFormElementDepths } from '@domain/step-element-depths';
import { validateGraph } from '@domain/invariants';
import { validStepTransitions } from '@domain/step-transitions';
import type { Command } from './command';
import { preserveFormElementDepths, preservePageDepths } from './depth-preservation';
import { InvariantViolationError } from './errors';
import { removeNonAdjacentLinks } from './layer-placement';
import { resolveElementTarget, type CanvasElementTarget } from './add-element';
import { findElementLocation } from './graph-lookup';

// Команда переноса элемента канваса (замечание приёмки N2): dnd карточек —
// переупорядочивание внутри списка блока и перенос между блоками. Любой
// элемент — в любой блок [owner 2026-10-13]: List item/Widget card в шаг
// формы, компонент формы на Главную или в подсценарий и т.д. Мутация —
// единственный способ изменить граф (конституция, железное правило 1).
//
// Цель задаётся блоком-приёмником; позиция — якорем (карточка-сосед и
// сторона от неё), чтобы UI не считал индексы в сжатых списках (T-033):
// команда сама находит якорь в приёмнике ПОСЛЕ изъятия элемента из
// источника — сдвиг индексов приёмника не снаружи.

export type MoveElementTarget = CanvasElementTarget;

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
    const targetList = resolveElementTarget(draft, this.target);
    if (!targetList) {
      throw new Error('Приёмник для переноса не найден');
    }
    // Совместимость вида элемента и блока не проверяется: любой элемент —
    // в любом блоке [owner 2026-10-13].

    const [moved] = location.list.splice(location.index, 1);
    const element = moved!;

    // Каскад сложной логики: элемент уходит в ДРУГОЙ блок (шаг той же или
    // другой формы, страницу) — правила, где он источник или цель, невалидны
    // (L-I5: логика только внутри одного шага, ADR-14). Перенос в другую
    // колонку своего шага рвёт их же [owner 2026-10-13]: переносится один
    // элемент, без группы, — старые связи теряют смысл. Порядок внутри
    // колонки правил не трогает.
    const changesBlock = targetList !== location.list;
    const changesColumn =
      this.layerDepth !== undefined && this.layerDepth !== elementDepthsBefore.get(this.elementId);
    if (changesBlock || changesColumn) {
      draft.logicRules = draft.logicRules.filter(
        (rule) => rule.sourceElementId !== this.elementId && rule.targetElementId !== this.elementId,
      );
      // Колонка — только внутри шага; в чужом блоке прежняя колонка не имеет смысла.
      if (this.target.kind === 'formStep' && this.layerDepth !== undefined) {
        element.layerDepth = this.layerDepth;
      } else {
        delete element.layerDepth;
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
    targetList.splice(toIndex, 0, element);

    // Каскад N4: исходящие связи перенесённого элемента осмысленны только
    // между смежными уровнями «источник + 1 = цель» — после смены владельца
    // страницы несмежные связи рвутся (то же правило, что у SetPageLayerDepth).
    // Уровни — ПОСЛЕ закрепления ADR-15: иначе новая связь «через» перенесённый
    // элемент пересчитывала уровень цели в смежный, связь оставалась, а затем
    // закрепление возвращало цель на прежний уровень (доводка dnd, ADR-17).
    preservePageDepths(draft, depthsBeforeRemoval);
    removeNonAdjacentLinks(draft, (link) => link.sourceElementId === this.elementId);

    preservePageDepths(draft, depthsBeforeRemoval);
    preserveFormElementDepths(draft, elementDepthsBefore, new Set([this.elementId]));

    // Каскад переходов между шагами [owner 2026-10-14]: переходы, ставшие
    // недопустимыми (элемент перенесён в другой шаг/блок), уходят вместе с причиной.
    draft.stepTransitions = validStepTransitions(draft);

    const violations = validateGraph(draft);
    if (violations.length > 0) {
      throw new InvariantViolationError(violations);
    }
  }
}
