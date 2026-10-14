import type { ServiceGraph } from '@domain/model/service-graph';
import type { StepTransition } from '@domain/model/step-transition';
import { validateGraph } from '@domain/invariants';
import { computeAllFormStepDepths } from '@domain/form-step-depths';
import { stepTransitionSourceKey, validStepTransitions } from '@domain/step-transitions';
import type { Command } from './command';
import { InvariantViolationError } from './errors';
import { placeStepTransitionTarget } from './step-placement';

// Переход между шагами формы [owner 2026-10-14]: готовый переход приходит в
// конструктор (id — от IIdGenerator вызывающей стороны). У источника переход
// один — прежний переход того же элемента (варианта) заменяется новым.
// Допустимость (шаг следующего уровня, та же форма, вариант существует)
// проверяет инвариант step-transitions на черновике до фиксации.
//
// Шаг-цель встаёт на уровень «источник + 1» в конец его колонки — как
// подсценарий-цель связи (ConnectElements, placeLinkTargetIntoNextLayer):
// два варианта Select'а шага 1 ведут на два шага 2 друг под другом.
// Переходы цели, ставшие несмежными, рвутся (N4); шаги, потерявшие
// входящий переход, остаются на своём уровне (ADR-15).
export class AddStepTransition implements Command {
  readonly name = 'AddStepTransition';

  constructor(private readonly transition: StepTransition) {}

  apply(draft: ServiceGraph): void {
    const depthsBefore = computeAllFormStepDepths(draft);
    const key = stepTransitionSourceKey(this.transition);
    draft.stepTransitions = draft.stepTransitions.filter(
      (existing) => stepTransitionSourceKey(existing) !== key,
    );
    draft.stepTransitions.push(this.transition);
    placeStepTransitionTarget(draft, this.transition, depthsBefore);
    draft.stepTransitions = validStepTransitions(draft);

    const violations = validateGraph(draft);
    if (violations.length > 0) {
      throw new InvariantViolationError(violations);
    }
  }
}
