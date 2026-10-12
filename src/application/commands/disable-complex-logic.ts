import type { ServiceGraph } from '@domain/model/service-graph';
import type { FormComponentId } from '@domain/model/ids';
import { validateGraph } from '@domain/invariants';
import type { Command } from './command';
import { InvariantViolationError } from './errors';
import { findFormComponent } from './graph-lookup';

// Выключение режима «Сложная логика» (T-037/T-064, L4): при наличии правил —
// каскадное удаление всех рёбер этого источника (UI заранее спрашивает
// подтверждение, команда выполняет каскад атомарно вместе со снятием флага,
// поэтому undo возвращает и флаг, и правила).
export class DisableComplexLogic implements Command {
  readonly name = 'DisableComplexLogic';

  constructor(private readonly componentId: FormComponentId) {}

  apply(draft: ServiceGraph): void {
    const found = findFormComponent(draft, this.componentId);
    if (!found) {
      throw new Error(`Элемент не найден: ${this.componentId}`);
    }
    if (found.component.kind !== 'selectList') {
      throw new Error(
        `Сложная логика v1 поддерживает только Select (элемент ${this.componentId}: ${found.component.kind})`,
      );
    }
    found.component.hasComplexLogic = false;
    draft.logicRules = draft.logicRules.filter(
      (rule) => (rule.sourceElementId as string) !== this.componentId,
    );

    const violations = validateGraph(draft);
    if (violations.length > 0) {
      throw new InvariantViolationError(violations);
    }
  }
}
