import type { ServiceGraph } from '@domain/model/service-graph';
import type { ApplicationFormId, FormStepId } from '@domain/model/ids';
import { validateGraph } from '@domain/invariants';
import { moveByAnchor } from '@domain/ordered-move';
import { validStepTransitions } from '@domain/step-transitions';
import type { Command } from './command';
import { InvariantViolationError } from './errors';
import { findFormById } from './graph-lookup';

// Перенос шага формы заявки внутри формы (dnd заголовка шага [owner
// 2026-10-14]) — как ReorderInLayer у страниц колонки: позиция — якорь
// (соседний шаг и сторона от него), шаги упорядочены массивом (БТ 6.5).
// Каскад: переходы, ставшие переходами назад, рвутся (validStepTransitions);
// переходы вперёд через несколько шагов допустимы и остаются.

export type StepDropAnchor = {
  /** Шаг-якорь той же формы: перемещаемый встаёт до/после него. */
  stepId: FormStepId;
  placement: 'before' | 'after';
};

export class MoveFormStep implements Command {
  readonly name = 'MoveFormStep';

  constructor(
    private readonly formId: ApplicationFormId,
    private readonly stepId: FormStepId,
    private readonly anchor: StepDropAnchor,
  ) {}

  apply(draft: ServiceGraph): void {
    const form = findFormById(draft, this.formId);
    if (!form) {
      throw new Error(`Форма не найдена: ${this.formId}`);
    }
    if (!form.steps.some((step) => step.id === this.stepId)) {
      throw new Error(`Шаг не найден: ${this.stepId} (форма ${this.formId})`);
    }
    if (!form.steps.some((step) => step.id === this.anchor.stepId)) {
      throw new Error(`Шаг-якорь не найден: ${this.anchor.stepId} (форма ${this.formId})`);
    }
    moveByAnchor(form.steps, this.stepId, { id: this.anchor.stepId, placement: this.anchor.placement });
    draft.stepTransitions = validStepTransitions(draft);

    const violations = validateGraph(draft);
    if (violations.length > 0) {
      throw new InvariantViolationError(violations);
    }
  }
}
