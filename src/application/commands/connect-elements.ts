import type { ServiceGraph } from '@domain/model/service-graph';
import type { PageLink } from '@domain/model/page-link';
import { computeGraphDepths } from '@domain/graph-depths';
import { validateGraph } from '@domain/invariants';
import type { Command } from './command';
import { InvariantViolationError } from './errors';
import { findElementLocation, isLinkTargetPresent } from './graph-lookup';
import { placeLinkTargetIntoNextLayer } from './layer-placement';

// Команда создания связи на канвасе (Epic 002, T-035): ребро от элемента
// страницы (source-handle на карточке, D9) к странице-цели — подсценарию
// или форме заявки (D12). Готовая связь со стабильным id приходит в
// конструктор (id — от IIdGenerator вызывающей стороны).
//
// Правило запрета перескока слоёв (D7, T-036): если связь сменила колонку
// цели, цель переносится в конец слоя «глубина источника + 1»
// (placeLinkTargetIntoNextLayer).
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

    // Глубины до мутации — чтобы отличить перенос колонки от связи в тот же слой.
    const depthsBefore = computeGraphDepths(draft);
    draft.links.push(this.link);
    placeLinkTargetIntoNextLayer(draft, this.link.sourceElementId, this.link.targetId, depthsBefore);

    const violations = validateGraph(draft);
    if (violations.length > 0) {
      throw new InvariantViolationError(violations);
    }
  }
}
