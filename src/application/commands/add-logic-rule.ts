import type { ServiceGraph } from '@domain/model/service-graph';
import type { LogicRule } from '@domain/model/logic-rule';
import { validateGraph } from '@domain/invariants';
import type { Command } from './command';
import { InvariantViolationError } from './errors';

// Добавление правила условной видимости (T-037/T-064): готовое правило
// приходит в конструктор (id — от IIdGenerator вызывающей стороны, как
// у остальных команд canvas). Корректность гарантируется инвариантами
// L-I1…L-I6 на черновике до фиксации: невалидное ребро (источник без
// включённой логики, другой формы, дубликат, цикл) отклоняется, и
// produceWithPatches отменяет мутацию.
export class AddLogicRule implements Command {
  readonly name = 'AddLogicRule';

  constructor(private readonly rule: LogicRule) {}

  apply(draft: ServiceGraph): void {
    draft.logicRules.push(this.rule);

    const violations = validateGraph(draft);
    if (violations.length > 0) {
      throw new InvariantViolationError(violations);
    }
  }
}
