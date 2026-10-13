import type { ServiceGraph } from '@domain/model/service-graph';
import type { FormComponent } from '@domain/model/form-components';
import type { ApplicationFormId, FormStepId } from '@domain/model/ids';
import { validateGraph } from '@domain/invariants';
import { computeStepElementDepths } from '@domain/step-element-depths';
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

    // Новый элемент без правил встаёт в колонку правее самой глубокой —
    // шаг растёт по горизонтали [owner 2026-10-13], как новый блок на
    // канвасе страниц (addNode → следующий уровень). Явная колонка
    // вызывающей стороны не переопределяется.
    const depths = [...computeStepElementDepths(step, draft.logicRules).values()];
    const nextColumn = depths.length === 0 ? 0 : Math.max(...depths) + 1;
    step.components.push({ ...this.component, layerDepth: this.component.layerDepth ?? nextColumn });

    const violations = validateGraph(draft);
    if (violations.length > 0) {
      throw new InvariantViolationError(violations);
    }
  }
}
