import type { ServiceGraph } from '@domain/model/service-graph';
import type { ScenarioId } from '@domain/model/ids';
import type { Command, CommandContext } from './command';
import { elementIdsOf } from '@domain/cascade-removal';
import { removeWithCascade } from './cascade-remove';

// Команда удаления подсценария (Epic 002, T-035). Каскад — общий (R-CMD-1):
// входящие связи на страницу, исходящие связи её элементов (D9) и их правила
// логики (матрица связей может включить логику на страницах). Страницы, на
// которые она вела, остаются (список плоский, R-SCH-7).
export class RemoveScenario implements Command {
  readonly name = 'RemoveScenario';

  constructor(private readonly scenarioId: ScenarioId) {}

  apply(draft: ServiceGraph, { rules }: CommandContext): void {
    removeWithCascade(draft, rules, () => {
      const index = draft.subScenarios.findIndex((scenario) => scenario.id === this.scenarioId);
      if (index < 0) {
        throw new Error(`Подсценарий не найден: ${this.scenarioId}`);
      }
      const [scenario] = draft.subScenarios.splice(index, 1);
      return { elementIds: elementIdsOf([scenario!]), targetIds: new Set([this.scenarioId]) };
    });
  }
}
