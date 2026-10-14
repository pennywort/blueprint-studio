import type { ServiceGraph } from '@domain/model/service-graph';
import type { StepTransition } from '@domain/model/step-transition';
import { validateGraph } from '@domain/invariants';
import { moveByAnchor } from '@domain/ordered-move';
import {
  stepTransitionSourceKey,
  stepTransitionTargetAnchor,
  validStepTransitions,
} from '@domain/step-transitions';
import type { Command } from './command';
import { InvariantViolationError } from './errors';

// Переход между шагами формы [owner 2026-10-14]: готовый переход приходит в
// конструктор (id — от IIdGenerator вызывающей стороны). У источника переход
// один — прежний переход того же элемента (варианта) заменяется новым.
// Допустимость (шаг позже, та же форма, вариант существует) проверяет
// инвариант step-transitions на черновике до фиксации.
//
// Шаг-цель встаёт сразу за шагом-источником [owner 2026-10-14] — как
// подсценарий-цель встаёт на уровень «источник + 1» (ConnectElements):
// переход из шага 1 в шаг 4 делает шаг 4 вторым. Переходы, ставшие
// после этого переходами назад, рвутся (каскад, как N4 у страниц).
export class AddStepTransition implements Command {
  readonly name = 'AddStepTransition';

  constructor(private readonly transition: StepTransition) {}

  apply(draft: ServiceGraph): void {
    const key = stepTransitionSourceKey(this.transition);
    draft.stepTransitions = draft.stepTransitions.filter(
      (existing) => stepTransitionSourceKey(existing) !== key,
    );
    draft.stepTransitions.push(this.transition);

    const anchor = stepTransitionTargetAnchor(draft, this.transition);
    if (anchor) {
      const form = draft.applicationForms.find((candidate) =>
        candidate.steps.some((step) => step.id === this.transition.targetStepId),
      );
      if (form) {
        moveByAnchor(form.steps, this.transition.targetStepId, anchor);
        draft.stepTransitions = validStepTransitions(draft);
      }
    }

    const violations = validateGraph(draft);
    if (violations.length > 0) {
      throw new InvariantViolationError(violations);
    }
  }
}
