import type { ServiceGraph } from '@domain/model/service-graph';
import type { SubScenario } from '@domain/model/scenario';
import type { ScenarioId } from '@domain/model/ids';
import { validateGraph } from '@domain/invariants';
import type { Command } from './command';
import { InvariantViolationError } from './errors';
import { collectSubtreeElementIds, collectSubtreeScenarioIds } from './graph-lookup';

// Команда удаления подсценария (Epic 002, T-035) с каскадом связей:
// уходят и связи, направленные на удаляемые страницы, и связи, исходящие
// из их элементов (источник связи — элемент страницы, D9). Вложенные
// подсценарии (children) удаляются вместе с родителем.
export class RemoveScenario implements Command {
  readonly name = 'RemoveScenario';

  constructor(private readonly scenarioId: ScenarioId) {}

  apply(draft: ServiceGraph): void {
    const location = findContainingList(draft.subScenarios, this.scenarioId);
    if (!location) {
      throw new Error(`Подсценарий не найден: ${this.scenarioId}`);
    }

    const removed = location.list[location.index]!;
    const scenarioIds = collectSubtreeScenarioIds(removed);
    const elementIds = collectSubtreeElementIds(removed);

    location.list.splice(location.index, 1);
    draft.links = draft.links.filter(
      (link) => !scenarioIds.has(link.targetId) && !elementIds.has(link.sourceElementId),
    );

    const violations = validateGraph(draft);
    if (violations.length > 0) {
      throw new InvariantViolationError(violations);
    }
  }
}

// Подсценарий может лежать как на верхнем уровне, так и в children другого
// подсценария — ищем массив-владелец рекурсивно.
function findContainingList(
  list: SubScenario[],
  scenarioId: ScenarioId,
): { list: SubScenario[]; index: number } | null {
  const index = list.findIndex((scenario) => scenario.id === scenarioId);
  if (index >= 0) {
    return { list, index };
  }
  for (const scenario of list) {
    if (scenario.children) {
      const found = findContainingList(scenario.children, scenarioId);
      if (found) {
        return found;
      }
    }
  }
  return null;
}
