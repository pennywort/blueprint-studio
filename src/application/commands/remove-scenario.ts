import type { ServiceGraph } from '@domain/model/service-graph';
import type { ScenarioId } from '@domain/model/ids';
import { computeGraphDepths } from '@domain/graph-depths';
import type { Command } from './command';
import { preservePageDepths } from './depth-preservation';

// Команда удаления подсценария (Epic 002, T-035) с каскадом связей:
// уходят и связи, направленные на удаляемую страницу, и связи, исходящие
// из её элементов (источник связи — элемент страницы, D9). Страницы, на
// которые она вела, остаются (список плоский, R-SCH-7).
export class RemoveScenario implements Command {
  readonly name = 'RemoveScenario';

  constructor(private readonly scenarioId: ScenarioId) {}

  apply(draft: ServiceGraph): void {
    // Уровни до мутации: страницы, потерявшие связи, остаются на месте (ADR-15).
    const depthsBeforeRemoval = computeGraphDepths(draft);
    const index = draft.subScenarios.findIndex((scenario) => scenario.id === this.scenarioId);
    if (index < 0) {
      throw new Error(`Подсценарий не найден: ${this.scenarioId}`);
    }

    const [removed] = draft.subScenarios.splice(index, 1);
    const elementIds = new Set<string>(removed!.elements.map((element) => element.id));
    draft.links = draft.links.filter(
      (link) => link.targetId !== this.scenarioId && !elementIds.has(link.sourceElementId),
    );

    preservePageDepths(draft, depthsBeforeRemoval);
  }
}
