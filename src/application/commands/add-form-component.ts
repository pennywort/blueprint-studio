import type { ServiceGraph } from '@domain/model/service-graph';
import type { FormComponent } from '@domain/model/form-components';
import type { ApplicationFormId, FormStepId } from '@domain/model/ids';
import { validateGraph } from '@domain/invariants';
import type { Command } from './command';
import { InvariantViolationError } from './errors';

// Команда добавления форм-компонента на шаг формы заявки.
// Инварианты проверяются на черновике до фиксации: при нарушении команда
// бросает InvariantViolationError, produceWithPatches отменяется, и состояние
// остаётся нетронутым (история undo/redo не засоряется).
export class AddFormComponent implements Command {
  readonly name = 'AddFormComponent';

  constructor(
    private readonly formId: ApplicationFormId,
    private readonly stepId: FormStepId,
    private readonly component: FormComponent,
  ) {}

  apply(draft: ServiceGraph): void {
    const form = draft.applicationForms.find((candidate) => candidate.id === this.formId);
    if (!form) {
      throw new Error(`Форма не найдена: ${this.formId}`);
    }

    const step = form.steps.find((candidate) => candidate.id === this.stepId);
    if (!step) {
      throw new Error(`Шаг не найден: ${this.stepId} (форма ${this.formId})`);
    }

    step.components.push(this.component);

    const violations = validateGraph(draft);
    if (violations.length > 0) {
      throw new InvariantViolationError(violations);
    }
  }
}
