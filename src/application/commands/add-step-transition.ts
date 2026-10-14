import type { ServiceGraph } from '@domain/model/service-graph';
import type { StepTransition } from '@domain/model/step-transition';
import { validateGraph } from '@domain/invariants';
import { stepTransitionSourceKey } from '@domain/step-transitions';
import type { Command } from './command';
import { InvariantViolationError } from './errors';

// Переход между шагами формы [owner 2026-10-14]: готовый переход приходит в
// конструктор (id — от IIdGenerator вызывающей стороны). У источника переход
// один — прежний переход того же элемента (варианта) заменяется новым.
// Допустимость (шаг позже, та же форма, вариант существует) проверяет
// инвариант step-transitions на черновике до фиксации.
export class AddStepTransition implements Command {
  readonly name = 'AddStepTransition';

  constructor(private readonly transition: StepTransition) {}

  apply(draft: ServiceGraph): void {
    const key = stepTransitionSourceKey(this.transition);
    draft.stepTransitions = draft.stepTransitions.filter(
      (existing) => stepTransitionSourceKey(existing) !== key,
    );
    draft.stepTransitions.push(this.transition);

    const violations = validateGraph(draft);
    if (violations.length > 0) {
      throw new InvariantViolationError(violations);
    }
  }
}
