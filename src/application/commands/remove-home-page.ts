import type { ServiceGraph } from '@domain/model/service-graph';
import { computeGraphDepths } from '@domain/graph-depths';
import type { Command } from './command';
import { preservePageDepths } from './depth-preservation';

// Команда удаления Главной страницы (Epic 002, T-034). Удаление разрешено
// (D8: Главная необязательна). Каскад связей: уходят исходящие связи
// элементов Главной (источник связи — элемент страницы, D9); входящих нет —
// Главная не может быть целью связи (PageLinkTargetId).
export class RemoveHomePage implements Command {
  readonly name = 'RemoveHomePage';

  apply(draft: ServiceGraph): void {
    // Уровни до мутации: страницы, потерявшие связи, остаются на месте (ADR-15).
    const depthsBeforeRemoval = computeGraphDepths(draft);
    const home = draft.homePage;
    if (!home) {
      throw new Error('Главная страница отсутствует в карте (D8)');
    }

    const elementIds = new Set<string>([...home.elements.map((element) => element.id)]);
    draft.homePage = undefined;
    draft.links = draft.links.filter((link) => !elementIds.has(link.sourceElementId));

    preservePageDepths(draft, depthsBeforeRemoval);
  }
}
