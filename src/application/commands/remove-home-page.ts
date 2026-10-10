import type { ServiceGraph } from '@domain/model/service-graph';
import { validateGraph } from '@domain/invariants';
import type { Command } from './command';
import { InvariantViolationError } from './errors';

// Команда удаления Главной страницы (Epic 002, T-034). Удаление разрешено
// (D8: Главная необязательна). Каскад связей: уходят исходящие связи
// элементов Главной (источник связи — элемент страницы, D9); входящих нет —
// Главная не может быть целью связи (PageLinkTargetId).
export class RemoveHomePage implements Command {
  readonly name = 'RemoveHomePage';

  apply(draft: ServiceGraph): void {
    const home = draft.homePage;
    if (!home) {
      throw new Error('Главная страница отсутствует в карте (D8)');
    }

    const elementIds = new Set<string>([
      ...home.listItems.map((item) => item.id),
      ...home.widgetCards.map((card) => card.id),
    ]);
    draft.homePage = undefined;
    draft.links = draft.links.filter((link) => !elementIds.has(link.sourceElementId));

    const violations = validateGraph(draft);
    if (violations.length > 0) {
      throw new InvariantViolationError(violations);
    }
  }
}
