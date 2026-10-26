import type { ServiceGraph } from '@domain/model/service-graph';
import type { ApplicationFormId } from '@domain/model/ids';
import { computeGraphDepths } from '@domain/graph-depths';
import { validStepTransitions } from '@domain/step-transitions';
import type { Command, CommandContext } from './command';
import { preservePageDepths } from './depth-preservation';

// Команда удаления формы заявки (Epic 002, T-035) с каскадом связей:
// удаляются все связи, направленные на эту форму (D12 — форма может быть
// целью связи на общих основаниях), и связи, исходящие из её элементов
// (ADR-17).
export class RemoveForm implements Command {
  readonly name = 'RemoveForm';

  constructor(private readonly formId: ApplicationFormId) {}

  apply(draft: ServiceGraph, { rules }: CommandContext): void {
    // Уровни до мутации: страницы, потерявшие связи, остаются на месте (ADR-15).
    const depthsBeforeRemoval = computeGraphDepths(draft);
    const index = draft.applicationForms.findIndex((form) => form.id === this.formId);
    if (index < 0) {
      throw new Error(`Форма не найдена: ${this.formId}`);
    }

    // Каскад сложной логики (T-037): правила живут в пределах одной формы
    // (L-I5) — удаляем всё, что ссылается на компоненты удаляемой формы.
    const componentIds = new Set<string>();
    for (const step of draft.applicationForms[index]!.steps) {
      for (const component of step.elements) {
        componentIds.add(component.id);
      }
    }

    draft.applicationForms.splice(index, 1);
    // Входящие связи формы и исходящие связи её элементов: элемент шага —
    // любой элемент канваса и может быть источником связи (ADR-17).
    draft.links = draft.links.filter(
      (link) => link.targetId !== this.formId && !componentIds.has(link.sourceElementId),
    );
    draft.logicRules = draft.logicRules.filter(
      (rule) => !componentIds.has(rule.sourceElementId) && !componentIds.has(rule.targetElementId),
    );

    preservePageDepths(draft, depthsBeforeRemoval);

    // Каскад переходов между шагами [owner 2026-10-14]: переходы, ставшие
    // недопустимыми (удалена форма), уходят вместе с причиной.
    draft.stepTransitions = validStepTransitions(draft, rules);
  }
}
