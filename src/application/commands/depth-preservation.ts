import type { ServiceGraph } from '@domain/model/service-graph';
import { computeGraphDepths } from '@domain/graph-depths';
import { walkPages } from './graph-lookup';

// Блок без связей остаётся на своём уровне (ADR-15, [owner 2026-10-13]):
// уровень страницы выводится из связей, и после разрыва входящей связи
// страница «падала» в нулевую колонку к Главной. Команды, которые рвут
// связи (удаление связи/элемента/страницы, каскады переноса), вызывают это
// ПОСЛЕ мутации: страницы, чей уровень изменился, закрепляются на прежнем
// уровне явным layerDepth. exclude — страницы, чей уровень команда меняет
// намеренно (перенос dnd, новая цель связи).
export function preservePageDepths(
  draft: ServiceGraph,
  depthsBefore: ReadonlyMap<string, number>,
  exclude: ReadonlySet<string> = new Set(),
): void {
  const depthsAfter = computeGraphDepths(draft);
  for (const page of walkPages(draft)) {
    if ((draft.homePage && page.id === draft.homePage.id) || exclude.has(page.id)) {
      continue; // Главная закреплена на нулевом уровне и поля layerDepth не имеет
    }
    const before = depthsBefore.get(page.id);
    if (before !== undefined && depthsAfter.get(page.id) !== before) {
      (page as { layerDepth?: number }).layerDepth = before;
    }
  }
}
