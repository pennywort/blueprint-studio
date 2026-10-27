import type { ServiceGraph } from '@domain/model/service-graph';
import type { ElementId } from '@domain/model/ids';
import { computeGraphDepths } from '@domain/graph-depths';
import { computeFormElementDepths } from '@domain/step-element-depths';
import { computeAllFormStepDepths } from '@domain/form-step-depths';
import { validStepTransitions } from '@domain/step-transitions';
import type { Command, CommandContext } from './command';
import { preserveFormElementDepths, preservePageDepths, preserveFormStepDepths } from './depth-preservation';
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
// сторона от неё), чтобы UI не считал индексы списков:
// команда сама переводит якорь в позицию среди остающихся элементов
// приёмника — сдвиг индексов приёмника не снаружи.

export type MoveElementTarget = CanvasElementTarget;

export type DropAnchor = {
  /** Карточка-якорь в приёмнике: элемент встаёт до/после неё. */
  elementId: ElementId;
  placement: 'before' | 'after';
};

// Группа выделенных элементов [owner 2026-10-27] переносится той же командой
// (один шаг undo): элементы встают подряд, в переданном порядке, на место
// якоря; каскады — те же, что у одного элемента, для каждого из группы.
export class MoveElement implements Command {
  readonly name = 'MoveElement';

  constructor(
    private readonly elementIds: readonly ElementId[],
    private readonly target: MoveElementTarget,
    private readonly anchor?: DropAnchor,
    // Колонка внутри шага-приёмника [owner 2026-10-13] (только для formStep):
    // dnd бросил компонент в колонку шага; undefined — колонка не меняется
    // (переупорядочивание внутри колонки или перенос без выбора колонки).
    private readonly layerDepth?: number,
  ) {}

  apply(draft: ServiceGraph, { rules }: CommandContext): void {
    // Уровни шагов до мутации: шаг, потерявший входящий переход, остаётся на месте (ADR-15).
    const stepDepthsBefore = computeAllFormStepDepths(draft);
    // Уровни до мутации: страницы, потерявшие связи, остаются на месте (ADR-15).
    const depthsBeforeRemoval = computeGraphDepths(draft);
    const elementDepthsBefore = computeFormElementDepths(draft);
    const movedIds = new Set<string>(this.elementIds);
    const targetList = resolveElementTarget(draft, this.target);
    if (!targetList) {
      throw new Error('Приёмник для переноса не найден');
    }
    // Совместимость вида элемента и блока не проверяется: любой элемент —
    // в любом блоке [owner 2026-10-13].

    // Позиция — до изъятия: место якоря среди НЕпереносимых элементов
    // приёмника. Так якорем может быть и сам элемент группы (группу бросили
    // на её же карточку) — группа встаёт на прежнее место, индексы не снаружи.
    let toIndex: number | null = null;
    if (this.anchor) {
      const anchorIndex = targetList.findIndex((item) => item.id === this.anchor!.elementId);
      if (anchorIndex >= 0) {
        const position = this.anchor.placement === 'before' ? anchorIndex : anchorIndex + 1;
        toIndex = targetList.slice(0, position).filter((item) => !movedIds.has(item.id)).length;
      }
    }

    const elements = this.elementIds.map((elementId) => {
      const location = findElementLocation(draft, elementId);
      if (!location) {
        throw new Error(`Элемент не найден: ${elementId}`);
      }
      const [moved] = location.list.splice(location.index, 1);
      const element = moved!;

      // Каскад сложной логики: элемент уходит в ДРУГОЙ блок (шаг той же или
      // другой формы, страницу) — правила, где он источник или цель, невалидны
      // (L-I5: логика только внутри одного шага, ADR-14). Перенос в другую
      // колонку своего шага рвёт их же [owner 2026-10-13]: колонку меняет и
      // группа целиком — старые связи теряют смысл (как ADR-22 для копий).
      // Порядок внутри колонки правил не трогает.
      const changesBlock = targetList !== location.list;
      const changesColumn =
        this.layerDepth !== undefined && this.layerDepth !== elementDepthsBefore.get(elementId);
      if (changesBlock || changesColumn) {
        draft.logicRules = draft.logicRules.filter(
          (rule) => rule.sourceElementId !== elementId && rule.targetElementId !== elementId,
        );
        // Колонка — только внутри шага; в чужом блоке прежняя колонка не имеет смысла.
        if (this.target.kind === 'formStep' && this.layerDepth !== undefined) {
          element.layerDepth = this.layerDepth;
        } else {
          delete element.layerDepth;
        }
      }
      return element;
    });

    targetList.splice(toIndex ?? targetList.length, 0, ...elements);

    // Каскад N4: исходящие связи перенесённого элемента осмысленны только
    // между смежными уровнями «источник + 1 = цель» — после смены владельца
    // страницы несмежные связи рвутся (то же правило, что у SetPageLayerDepth).
    // Уровни — ПОСЛЕ закрепления ADR-15: иначе новая связь «через» перенесённый
    // элемент пересчитывала уровень цели в смежный, связь оставалась, а затем
    // закрепление возвращало цель на прежний уровень (доводка dnd, ADR-17).
    preservePageDepths(draft, depthsBeforeRemoval);
    removeNonAdjacentLinks(draft, (link) => movedIds.has(link.sourceElementId));

    preservePageDepths(draft, depthsBeforeRemoval);
    preserveFormElementDepths(draft, elementDepthsBefore, movedIds);

    // Каскад переходов между шагами [owner 2026-10-14]: переходы, ставшие
    // недопустимыми (элемент перенесён в другой шаг/блок), уходят вместе с причиной.
    preserveFormStepDepths(draft, stepDepthsBefore);
    draft.stepTransitions = validStepTransitions(draft, rules);
  }
}
