import type { ServiceGraph } from '@domain/model/service-graph';
import type { Command, CommandContext } from './command';
import { elementIdsOf } from '@domain/cascade-removal';
import { removeWithCascade } from './cascade-remove';

// Команда удаления Главной страницы (Epic 002, T-034). Удаление разрешено
// (D8: Главная необязательна). Каскад — общий (R-CMD-1): исходящие связи и
// правила логики элементов Главной; входящих связей нет — Главная не может
// быть целью связи (PageLinkTargetId).
export class RemoveHomePage implements Command {
  readonly name = 'RemoveHomePage';

  apply(draft: ServiceGraph, { rules }: CommandContext): void {
    removeWithCascade(draft, rules, () => {
      const home = draft.homePage;
      if (!home) {
        throw new Error('Главная страница отсутствует в карте (D8)');
      }
      draft.homePage = undefined;
      return { elementIds: elementIdsOf([home]) };
    });
  }
}
