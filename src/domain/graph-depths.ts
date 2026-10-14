import type { ServiceGraph } from './model/service-graph';
import { computeLayerDepths, type LayerEdge } from './layer-depths';
import { walkElementContainers } from './element-containers';
import { walkPageEntries } from './graph-walk';

// Глубины страниц графа (Epic 002, T-036, D7/D8/D12/D13): глубина страницы —
// длина кратчайшего пути от корня (BFS по links). Ребро «элемент → страница»
// считается ребром «страница-владелец элемента → страница-цель».
//
// Главная, если есть, — глубина 0; Главная необязательна (D8), поэтому корни
// определяются общим правилом: страницы без входящих рёбер. Каждый несвязанный
// подграф раскладывается от своего корня. Формы заявки — на общих основаниях
// (D12): глубина по входящим связям, если они есть, иначе форма — корень.
//
// Чистая функция доменного слоя: без внешних импортов, работает и на
// замороженном состоянии, и на черновике Immer внутри команд.

// Глубина каждой страницы карты. Ключи — id страниц (брендированные id
// приводятся к string, чтобы функция не зависела от вида страницы).
export function computeGraphDepths(graph: ServiceGraph): ReadonlyMap<string, number> {
  const pageIds: string[] = [];
  // Явные переопределения колонки (layerDepth): узел может быть перенесён
  // dnd на другой уровень навигации — тогда глубина фиксирована и не
  // выводится из связей. У Главной поля нет (ADR-15).
  const explicitDepths = new Map<string, number>();
  for (const entry of walkPageEntries(graph)) {
    pageIds.push(entry.page.id);
    if (entry.kind !== 'home' && entry.page.layerDepth !== undefined) {
      explicitDepths.set(entry.page.id, entry.page.layerDepth);
    }
  }
  const pageSet = new Set(pageIds);

  // Владелец элемента → страница: источник связи — конкретный элемент (D9),
  // а ребро глубин идёт между страницами.
  const elementOwner = new Map<string, string>();
  for (const container of walkElementContainers(graph)) {
    for (const element of container.elements) {
      elementOwner.set(element.id, container.pageId);
    }
  }

  // Ребро уровней — «страница-владелец элемента → страница-цель»; обход —
  // общее ядро computeLayerDepths (то же, что у элементов шага формы).
  const edges: LayerEdge[] = [];
  for (const link of graph.links) {
    const source = elementOwner.get(link.sourceElementId);
    if (source && pageSet.has(link.targetId)) {
      edges.push({ from: source, to: link.targetId });
    }
  }

  return computeLayerDepths(pageIds, edges, explicitDepths);
}
