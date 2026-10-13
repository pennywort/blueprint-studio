import type { ServiceGraph } from '@domain/model/service-graph';
import type { LogicRuleId } from '@domain/model/ids';
import { validateGraph } from '@domain/invariants';
import { computeFormElementDepths } from '@domain/step-element-depths';
import type { Command } from './command';
import { preserveFormElementDepths } from './depth-preservation';
import { InvariantViolationError } from './errors';

// Удаление правила условной видимости (T-037/T-064, L7): удаление ребра
// на канвасе = удаление правила из коллекции.
export class RemoveLogicRule implements Command {
  readonly name = 'RemoveLogicRule';

  constructor(private readonly ruleId: LogicRuleId) {}

  apply(draft: ServiceGraph): void {
    // Колонки элементов шагов до мутации: цель, потерявшая правило, остаётся на месте (ADR-15).
    const elementDepthsBefore = computeFormElementDepths(draft);
    const index = draft.logicRules.findIndex((rule) => rule.id === this.ruleId);
    if (index < 0) {
      throw new Error(`Правило сложной логики не найдено: ${this.ruleId}`);
    }
    draft.logicRules.splice(index, 1);

    preserveFormElementDepths(draft, elementDepthsBefore);

    const violations = validateGraph(draft);
    if (violations.length > 0) {
      throw new InvariantViolationError(violations);
    }
  }
}
