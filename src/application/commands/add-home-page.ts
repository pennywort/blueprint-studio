import type { HomePage, ServiceGraph } from '@domain/model/service-graph';
import type { Command } from './command';
import { nextPageOrderIndex } from './graph-lookup';

// Команда добавления Главной страницы (Epic 002, T-034). Главная
// необязательна (D8), но может быть только одна: при наличии — понятная
// ошибка, а не молчаливая перезапись. Порядковый номер выдаёт команда —
// следующий по порядку добавления среди всех страниц карты (D13).
export class AddHomePage implements Command {
  readonly name = 'AddHomePage';

  constructor(private readonly homePage: Omit<HomePage, 'orderIndex'>) {}

  apply(draft: ServiceGraph): void {
    if (draft.homePage) {
      throw new Error('Главная страница уже существует в карте');
    }
    draft.homePage = { ...this.homePage, orderIndex: nextPageOrderIndex(draft) };
  }
}
