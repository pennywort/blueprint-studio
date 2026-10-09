import type { ServiceGraph } from '@domain/model/service-graph';
import type { SubScenario } from '@domain/model/scenario';
import { validateGraph } from '@domain/invariants';
import type { Command } from './command';
import { InvariantViolationError } from './errors';
import { nextPageOrderIndex } from './graph-lookup';

// Команда добавления подсценария (Epic 002, T-035). Готовая сущность приходит
// в конструктор (id генерирует вызывающая сторона через IIdGenerator);
// персистентный порядковый номер выдаёт команда — следующий по порядку
// добавления среди всех страниц карты (D13).
export class AddScenario implements Command {
  readonly name = 'AddScenario';

  constructor(private readonly scenario: Omit<SubScenario, 'orderIndex'>) {}

  apply(draft: ServiceGraph): void {
    draft.subScenarios.push({ ...this.scenario, orderIndex: nextPageOrderIndex(draft) });

    const violations = validateGraph(draft);
    if (violations.length > 0) {
      throw new InvariantViolationError(violations);
    }
  }
}
