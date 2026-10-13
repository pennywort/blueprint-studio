import type { ServiceGraph } from '@domain/model/service-graph';
import type { ApplicationFormId, FormStepId } from '@domain/model/ids';
import { computeGraphDepths } from '@domain/graph-depths';
import { validateGraph } from '@domain/invariants';
import type { Command } from './command';
import { preservePageDepths } from './depth-preservation';
import { InvariantViolationError } from './errors';
import { findFormById } from './graph-lookup';

// Команда удаления шага формы заявки (Epic 002, T-035). Компоненты шага
// уходят вместе с ним, а с ними — их исходящие навигационные связи
// (компонент формы — тоже источник связи) и правила логики. Страницы,
// потерявшие связи, остаются на своём уровне (ADR-15).
export class RemoveFormStep implements Command {
  readonly name = 'RemoveFormStep';

  constructor(
    private readonly formId: ApplicationFormId,
    private readonly stepId: FormStepId,
  ) {}

  apply(draft: ServiceGraph): void {
    const depthsBeforeRemoval = computeGraphDepths(draft);
    const form = findFormById(draft, this.formId);
    if (!form) {
      throw new Error(`Форма не найдена: ${this.formId}`);
    }

    const index = form.steps.findIndex((step) => step.id === this.stepId);
    if (index < 0) {
      throw new Error(`Шаг не найден: ${this.stepId} (форма ${this.formId})`);
    }
    // Каскад сложной логики (T-037): компоненты шага уходят вместе с ним —
    // правила, где они источник или цель, удаляются.
    const componentIds = new Set<string>(form.steps[index]!.elements.map((component) => component.id));
    form.steps.splice(index, 1);
    draft.links = draft.links.filter((link) => !componentIds.has(link.sourceElementId));
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
