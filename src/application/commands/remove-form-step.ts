import type { ServiceGraph } from '@domain/model/service-graph';
import type { ApplicationFormId, FormStepId } from '@domain/model/ids';
import type { Command, CommandContext } from './command';
import { elementIdsOf } from '@domain/cascade-removal';
import { removeWithCascade } from './cascade-remove';
import { findFormById } from './graph-lookup';

// Команда удаления шага формы заявки (Epic 002, T-035). Компоненты шага уходят
// вместе с ним; каскад — общий (R-CMD-1): их исходящие связи, правила логики
// (T-037) и переходы, ставшие недопустимыми [owner 2026-10-14]. Блоки, потерявшие
// связи или переходы, остаются на своём уровне (ADR-15).
export class RemoveFormStep implements Command {
  readonly name = 'RemoveFormStep';

  constructor(
    private readonly formId: ApplicationFormId,
    private readonly stepId: FormStepId,
  ) {}

  apply(draft: ServiceGraph, { rules }: CommandContext): void {
    removeWithCascade(draft, rules, () => {
      const form = findFormById(draft, this.formId);
      if (!form) {
        throw new Error(`Форма не найдена: ${this.formId}`);
      }
      const index = form.steps.findIndex((step) => step.id === this.stepId);
      if (index < 0) {
        throw new Error(`Шаг не найден: ${this.stepId} (форма ${this.formId})`);
      }
      const [step] = form.steps.splice(index, 1);
      return { elementIds: elementIdsOf([step!]) };
    });
  }
}
