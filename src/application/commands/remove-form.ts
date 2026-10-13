import type { ServiceGraph } from '@domain/model/service-graph';
import type { ApplicationFormId } from '@domain/model/ids';
import { computeGraphDepths } from '@domain/graph-depths';
import { validateGraph } from '@domain/invariants';
import type { Command } from './command';
import { preservePageDepths } from './depth-preservation';
import { InvariantViolationError } from './errors';
import { walkSubScenarios } from './graph-lookup';

// Команда удаления формы заявки (Epic 002, T-035) с каскадом связей:
// удаляются все связи, направленные на эту форму (D12 — форма может быть
// целью связи на общих основаниях), и связи, исходящие из её элементов
// (ADR-17); applicationFormId сценариев type=application очищается (S8).
export class RemoveForm implements Command {
  readonly name = 'RemoveForm';

  constructor(private readonly formId: ApplicationFormId) {}

  apply(draft: ServiceGraph): void {
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
    // Сценарии type=application, ссылавшиеся на удалённую форму (S8, §6):
    // ссылка обнуляется — висячий applicationFormId не остаётся в графе.
    for (const scenario of walkSubScenarios(draft.subScenarios)) {
      if (scenario.type === 'application' && scenario.applicationFormId === this.formId) {
        delete scenario.applicationFormId;
      }
    }
    draft.logicRules = draft.logicRules.filter(
      (rule) => !componentIds.has(rule.sourceElementId) && !componentIds.has(rule.targetElementId),
    );

    preservePageDepths(draft, depthsBeforeRemoval);

    const violations = validateGraph(draft);
    if (violations.length > 0) {
      throw new InvariantViolationError(violations);
    }
  }
}
