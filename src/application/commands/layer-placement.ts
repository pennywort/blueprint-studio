import type { ServiceGraph } from '@domain/model/service-graph';
import { computeGraphDepths } from '@domain/graph-depths';
import { findElementOwnerPageId, walkPages } from './graph-lookup';

// Правило запрета перескока слоёв (Epic 002, T-036; D7/D13) — общая часть
// команд ConnectElements/ReconnectElements: вызывается ПОСЛЕ структурного
// создания/переназначения связи на черновике.
//
// Колонка страницы — производная связей (глубина = кратчайший путь от корня,
// computeGraphDepths): новая связь сама «притягивает» цель в слой «глубина
// источника + 1», если даёт кратчайший путь. Команда доводит перенос до конца
// через персистентный orderIndex: страница, сменившая колонку из-за этой
// связи, встаёт в конец новой колонки (под низ, D7).
//
// Связь «назад» (у цели уже есть путь короче, чем через новый источник) слои
// не ломает — цель остаётся на своём orderIndex. Перенос выполняется только
// когда глубина цели ИЗМЕНИЛАСЬ этой командой: повторная связь в тот же слой
// не перекидывает страницу в конец колонки.
export function placeLinkTargetIntoNextLayer(
  draft: ServiceGraph,
  sourceElementId: string,
  targetId: string,
  depthsBefore: ReadonlyMap<string, number>,
): void {
  const sourcePageId = findElementOwnerPageId(draft, sourceElementId);
  if (!sourcePageId) {
    return; // существование источника проверяют команды до вызова
  }

  const depthsAfter = computeGraphDepths(draft);
  const sourceDepth = depthsAfter.get(sourcePageId);
  const targetDepth = depthsAfter.get(targetId);
  if (sourceDepth === undefined || targetDepth === undefined) {
    return;
  }

  const layerChanged = depthsBefore.get(targetId) !== targetDepth;
  if (targetDepth !== sourceDepth + 1 || !layerChanged) {
    return;
  }

  // Перенос в конец целевой колонки: страница вынимается из общей
  // последовательности orderIndex и вставляется после последней страницы
  // новой колонки, индексы перенумеровываются без дыр (как в ReorderInLayer).
  const pages = [...walkPages(draft)].sort((left, right) => left.orderIndex - right.orderIndex);
  const column = pages.filter((page) => page.id !== targetId && depthsAfter.get(page.id) === targetDepth);
  const lastInColumn = column[column.length - 1];
  const target = pages.find((page) => page.id === targetId);
  if (!lastInColumn || !target || lastInColumn.orderIndex < target.orderIndex) {
    return; // цель единственная в колонке или уже стоит в её конце
  }

  const from = pages.findIndex((page) => page.id === targetId);
  const [moved] = pages.splice(from, 1);
  const to = pages.findIndex((page) => page.id === lastInColumn.id) + 1;
  pages.splice(to, 0, moved!);
  pages.forEach((page, index) => {
    page.orderIndex = index;
  });
}
