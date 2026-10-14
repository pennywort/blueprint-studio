import type { ServiceGraph } from '@domain/model/service-graph';
import type { PageLink } from '@domain/model/page-link';
import { computeGraphDepths } from '@domain/graph-depths';
import { connectableTargets } from '@domain/connection-rules';
import { moveByAnchor } from '@domain/ordered-move';
import { preservePageDepths } from './depth-preservation';
import { findOwnerPageId, findPageEntry, setPageLayerDepth, walkPages } from './graph-lookup';

// Каскад N4 (решение владельца): связь осмысленна только между смежными
// уровнями «источник + 1 = цель». Рвёт связи, отобранные affects, у которых
// это перестало выполняться. Общая часть SetPageLayerDepth, MoveElement и
// ConnectElements/ReconnectElements (R1, A2).
export function removeNonAdjacentLinks(draft: ServiceGraph, affects: (link: PageLink) => boolean): void {
  const depths = computeGraphDepths(draft);
  draft.links = draft.links.filter((link) => {
    if (!affects(link)) {
      return true;
    }
    const sourcePageId = findOwnerPageId(draft, link.sourceElementId);
    const sourceDepth = sourcePageId !== null ? depths.get(sourcePageId) : undefined;
    const targetDepth = depths.get(link.targetId);
    if (sourceDepth === undefined || targetDepth === undefined) {
      return true; // битая ссылка — инварианты фиксируют, здесь не трогаем
    }
    return targetDepth === sourceDepth + 1;
  });
}

// Единое правило навигационной связи (R1, A2, [owner 2026-10-14]): цель —
// только из connectableTargets (то же правило, что у подсветки). graph —
// граф без проверяемой связи (для reconnect — без неё самой).
export function assertConnectableTarget(
  graph: ServiceGraph,
  sourceElementId: string,
  targetId: string,
): void {
  const allowed = connectableTargets(graph, { kind: 'navigation', elementId: sourceElementId });
  if (!allowed.pages.has(targetId)) {
    throw new Error('Связь возможна только на блок колонки правее источника');
  }
}

// Правило запрета перескока слоёв (Epic 002, T-036; D7/D13; R1 [owner
// 2026-10-14]) — вызывается ПОСЛЕ создания/переназначения связи на черновике.
// Цель всегда встаёт на уровень «источник + 1» явным layerDepth; если колонка
// изменилась — в конец новой колонки (orderIndex, D7). Связи самой цели,
// ставшие несмежными, рвёт каскад N4; прочие страницы, чей уровень сдвинулся
// из-за разрыва, закрепляются на прежнем (ADR-15).
export function placeLinkTargetIntoNextLayer(
  draft: ServiceGraph,
  sourceElementId: string,
  targetId: string,
  depthsBefore: ReadonlyMap<string, number>,
): void {
  const sourcePageId = findOwnerPageId(draft, sourceElementId);
  if (!sourcePageId) {
    return; // существование источника проверяют команды до вызова
  }
  const sourceDepth = computeGraphDepths(draft).get(sourcePageId);
  const pages = [...walkPages(draft)].sort((left, right) => left.orderIndex - right.orderIndex);
  const entry = findPageEntry(draft, targetId);
  if (sourceDepth === undefined || !entry || entry.kind === 'home') {
    return;
  }
  const target = entry.page;
  const targetDepth = sourceDepth + 1;
  setPageLayerDepth(entry, targetDepth);

  removeNonAdjacentLinks(
    draft,
    (link) => link.targetId === targetId || findOwnerPageId(draft, link.sourceElementId) === targetId,
  );
  preservePageDepths(draft, depthsBefore, new Set([targetId]));

  if (depthsBefore.get(targetId) === targetDepth) {
    return; // связь в тот же слой не перекидывает страницу в конец колонки
  }
  const depthsAfter = computeGraphDepths(draft);
  const column = pages.filter((page) => page.id !== targetId && depthsAfter.get(page.id) === targetDepth);
  const lastInColumn = column[column.length - 1];
  if (!lastInColumn || lastInColumn.orderIndex < target.orderIndex) {
    return; // цель единственная в колонке или уже стоит в её конце
  }
  moveByAnchor(pages, targetId, { id: lastInColumn.id, placement: 'after' });
  pages.forEach((page, index) => {
    page.orderIndex = index;
  });
}
