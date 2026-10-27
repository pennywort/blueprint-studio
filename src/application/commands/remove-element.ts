import type { ServiceGraph } from '@domain/model/service-graph';
import type { ElementId } from '@domain/model/ids';
import { computeGraphDepths } from '@domain/graph-depths';
import { computeAllFormStepDepths } from '@domain/form-step-depths';
import { validStepTransitions } from '@domain/step-transitions';
import { computeFormElementDepths } from '@domain/step-element-depths';
import type { Command, CommandContext } from './command';
import { preserveFormElementDepths, preservePageDepths, preserveFormStepDepths } from './depth-preservation';
import { findElementLocation } from './graph-lookup';

// Команда удаления элемента канваса (Epic 002, T-035): карточки страницы
// (ListItem/WidgetCard) или компонента формы. Элемент ищется по id во всём
// графе. Каскад: вместе с элементом уходят его исходящие связи (источник
// связи — элемент страницы, D9); входящие связи на страницы не трогаются.
// Несколько id — удаление группы выделенных одним шагом undo [owner 2026-10-27].
export class RemoveElement implements Command {
  readonly name = 'RemoveElement';
  private readonly elementIds: ReadonlySet<ElementId>;

  constructor(...elementIds: ElementId[]) {
    this.elementIds = new Set(elementIds);
  }

  apply(draft: ServiceGraph, { rules }: CommandContext): void {
    // Уровни шагов до мутации: шаг, потерявший входящий переход, остаётся на месте (ADR-15).
    const stepDepthsBefore = computeAllFormStepDepths(draft);
    // Колонки элементов шагов до мутации: цель, потерявшая правило, остаётся на месте (ADR-15).
    const elementDepthsBefore = computeFormElementDepths(draft);
    // Уровни до мутации: страницы, потерявшие связи, остаются на месте (ADR-15).
    const depthsBeforeRemoval = computeGraphDepths(draft);
    for (const elementId of this.elementIds) {
      const location = findElementLocation(draft, elementId);
      if (!location) {
        throw new Error(`Элемент не найден: ${elementId}`);
      }
      location.list.splice(location.index, 1);
    }

    const removed = this.elementIds;
    draft.links = draft.links.filter((link) => !removed.has(link.sourceElementId));
    // Каскад сложной логики (T-037, §6 дизайн-дока): вместе с элементом
    // уходят правила, где он источник или цель.
    draft.logicRules = draft.logicRules.filter(
      (rule) => !removed.has(rule.sourceElementId) && !removed.has(rule.targetElementId),
    );

    preservePageDepths(draft, depthsBeforeRemoval);

    preserveFormElementDepths(draft, elementDepthsBefore);

    // Каскад переходов между шагами [owner 2026-10-14]: переходы, ставшие
    // недопустимыми (удалён элемент-источник), уходят вместе с причиной.
    preserveFormStepDepths(draft, stepDepthsBefore);
    draft.stepTransitions = validStepTransitions(draft, rules);
  }
}
