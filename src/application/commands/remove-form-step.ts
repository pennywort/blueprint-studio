import type { ServiceGraph } from '@domain/model/service-graph';
import type { ApplicationFormId, FormStepId } from '@domain/model/ids';
import { computeGraphDepths } from '@domain/graph-depths';
import { computeAllFormStepDepths } from '@domain/form-step-depths';
import { validStepTransitions } from '@domain/step-transitions';
import type { Command, CommandContext } from './command';
import { preservePageDepths, preserveFormStepDepths } from './depth-preservation';
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

  apply(draft: ServiceGraph, { rules }: CommandContext): void {
    // Уровни шагов до мутации: шаг, потерявший входящий переход, остаётся на месте (ADR-15).
    const stepDepthsBefore = computeAllFormStepDepths(draft);
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
    const componentIds = new Set<string>(form.steps[index]!.elements.map((element) => element.id));
    form.steps.splice(index, 1);
    draft.links = draft.links.filter((link) => !componentIds.has(link.sourceElementId));
    draft.logicRules = draft.logicRules.filter(
      (rule) => !componentIds.has(rule.sourceElementId) && !componentIds.has(rule.targetElementId),
    );
    preservePageDepths(draft, depthsBeforeRemoval);

    // Каскад переходов между шагами [owner 2026-10-14]: переходы, ставшие
    // недопустимыми (удалён шаг-источник или шаг-цель), уходят вместе с причиной.
    preserveFormStepDepths(draft, stepDepthsBefore);
    draft.stepTransitions = validStepTransitions(draft, rules);
  }
}
