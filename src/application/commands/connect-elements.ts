import type { ServiceGraph } from '@domain/model/service-graph';
import type { PageLink } from '@domain/model/page-link';
import { validateGraph } from '@domain/invariants';
import type { Command } from './command';
import { InvariantViolationError } from './errors';
import { findElementLocation, isLinkTargetPresent } from './graph-lookup';

// Команда создания связи на канвасе (Epic 002, T-035): ребро от элемента
// страницы (source-handle на карточке, D9) к странице-цели — подсценарию
// или форме заявки (D12). Готовая связь со стабильным id приходит в
// конструктор (id — от IIdGenerator вызывающей стороны).
//
// Правило запрета перескока слоёв (перенос цели в ближайший следующий слой
// за источником, D7) — часть T-036 (S9): ему нужны глубины из
// layout-движка. Здесь — только структурное создание связи.
export class ConnectElements implements Command {
  readonly name = 'ConnectElements';

  constructor(private readonly link: PageLink) {}

  apply(draft: ServiceGraph): void {
    if (!findElementLocation(draft, this.link.sourceElementId)) {
      throw new Error(`Элемент-источник связи не найден: ${this.link.sourceElementId}`);
    }
    if (!isLinkTargetPresent(draft, this.link.targetId)) {
      throw new Error(`Страница-цель связи не найдена: ${this.link.targetId}`);
    }

    draft.links.push(this.link);

    const violations = validateGraph(draft);
    if (violations.length > 0) {
      throw new InvariantViolationError(violations);
    }
  }
}
