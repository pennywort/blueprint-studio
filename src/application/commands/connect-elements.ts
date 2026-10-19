import type { ServiceGraph } from '@domain/model/service-graph';
import type { PageLink } from '@domain/model/page-link';
import { computeGraphDepths } from '@domain/graph-depths';
import type { Command } from './command';
import { findElementLocation, isLinkTargetPresent } from './graph-lookup';
import { assertConnectableTarget, placeLinkTargetIntoNextLayer } from './layer-placement';

// Команда создания связи на канвасе (Epic 002, T-035): ребро от элемента
// страницы (source-handle на карточке, D9) к странице-цели — подсценарию
// или форме заявки (D12). Готовая связь со стабильным id приходит в
// конструктор (id — от IIdGenerator вызывающей стороны).
//
// Единое правило связи (R1, [owner 2026-10-14]): цель — блок любой колонки
// правее источника (connectableTargets); после связи цель встаёт на уровень
// «источник + 1» (placeLinkTargetIntoNextLayer, каскад N4 — там же).
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
    // Дубликат связи между той же парой «элемент → страница» не создаётся:
    // второе ребро между теми же точками не несёт нового смысла.
    const duplicate = draft.links.some(
      (link) => link.sourceElementId === this.link.sourceElementId && link.targetId === this.link.targetId,
    );
    if (duplicate) {
      throw new Error('Связь между этими элементами уже существует');
    }
    assertConnectableTarget(draft, this.link.sourceElementId, this.link.targetId);

    // Глубины до мутации — чтобы отличить перенос колонки от связи в тот же слой.
    const depthsBefore = computeGraphDepths(draft);
    draft.links.push(this.link);
    placeLinkTargetIntoNextLayer(draft, this.link.sourceElementId, this.link.targetId, depthsBefore);
  }
}
