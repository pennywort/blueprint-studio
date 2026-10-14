import type { ServiceGraph } from '@domain/model/service-graph';
import type { StepTransitionId } from '@domain/model/ids';
import { validateGraph } from '@domain/invariants';
import { computeAllFormStepDepths } from '@domain/form-step-depths';
import type { Command } from './command';
import { preserveFormStepDepths } from './depth-preservation';
import { InvariantViolationError } from './errors';

// Удаление перехода между шагами [owner 2026-10-14]: удаление ребра на
// канвасе = удаление перехода из коллекции.
export class RemoveStepTransition implements Command {
  readonly name = 'RemoveStepTransition';

  constructor(private readonly transitionId: StepTransitionId) {}

  apply(draft: ServiceGraph): void {
    // Уровни шагов до мутации: шаг, потерявший входящий переход, остаётся на месте (ADR-15).
    const stepDepthsBefore = computeAllFormStepDepths(draft);
    const index = draft.stepTransitions.findIndex((transition) => transition.id === this.transitionId);
    if (index < 0) {
      throw new Error(`Переход между шагами не найден: ${this.transitionId}`);
    }
    draft.stepTransitions.splice(index, 1);
    preserveFormStepDepths(draft, stepDepthsBefore);

    const violations = validateGraph(draft);
    if (violations.length > 0) {
      throw new InvariantViolationError(violations);
    }
  }
}
