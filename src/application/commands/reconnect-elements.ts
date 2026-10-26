import type { ServiceGraph } from '@domain/model/service-graph';
import type { PageLinkTargetId } from '@domain/model/page-link';
import type { ElementId, PageLinkId } from '@domain/model/ids';
import { computeGraphDepths } from '@domain/graph-depths';
import type { Command, CommandContext } from './command';
import { findElementLocation, isLinkTargetPresent } from './graph-lookup';
import { assertConnectableTarget, placeLinkTargetIntoNextLayer } from './layer-placement';

// Команда переназначения связи на другой источник и/или цель (Epic 002,
// T-035; reconnect разрешён в любой момент — D7/D13). Связь — стабильная
// сущность: переназначение — обновление полей той же записи, id не меняется.
//
// Единое правило связи (R1, [owner 2026-10-14]) действует и при переназначении:
// цель — из connectableTargets, затем встаёт на уровень «новый источник + 1»
// (placeLinkTargetIntoNextLayer).
export class ReconnectElements implements Command {
  readonly name = 'ReconnectElements';

  constructor(
    private readonly linkId: PageLinkId,
    private readonly patch: { sourceElementId?: ElementId; targetId?: PageLinkTargetId },
  ) {}

  apply(draft: ServiceGraph, { rules }: CommandContext): void {
    if (this.patch.sourceElementId === undefined && this.patch.targetId === undefined) {
      throw new Error(`ReconnectElements без новых концов связи: ${this.linkId}`);
    }

    const link = draft.links.find((candidate) => candidate.id === this.linkId);
    if (!link) {
      throw new Error(`Связь не найдена: ${this.linkId}`);
    }

    // Глубины до мутации — правило слоёв срабатывает только при смене колонки.
    const depthsBefore = computeGraphDepths(draft);

    if (this.patch.sourceElementId !== undefined) {
      if (!findElementLocation(draft, this.patch.sourceElementId)) {
        throw new Error(`Элемент-источник связи не найден: ${this.patch.sourceElementId}`);
      }
      link.sourceElementId = this.patch.sourceElementId;
    }
    if (this.patch.targetId !== undefined) {
      if (!isLinkTargetPresent(draft, this.patch.targetId)) {
        throw new Error(`Страница-цель связи не найдена: ${this.patch.targetId}`);
      }
      link.targetId = this.patch.targetId;
    }

    // Правило подсветки (R1): проверка на графе без самой переназначаемой связи.
    const others = { ...draft, links: draft.links.filter((candidate) => candidate.id !== this.linkId) };
    assertConnectableTarget(others, rules, link.sourceElementId, link.targetId);
    placeLinkTargetIntoNextLayer(draft, link.sourceElementId, link.targetId, depthsBefore);
  }
}
