import type { ServiceGraph } from '@domain/model/service-graph';
import type { SubScenario } from '@domain/model/scenario';
import { walkPages, walkSubScenarios, type PageEntity } from '@domain/graph-walk';
import type { CanvasElement } from '@domain/model/canvas-element';
import type { PageEntityId } from '@domain/model/ids';
import { findElementInGraph, type ElementContainer } from '@domain/element-containers';
import { computeGraphDepths } from '@domain/graph-depths';

// Обходные помощники команд canvas (Epic 002, T-035): поиск страниц, элементов
// и связей внутри черновика Immer. Чистые функции над ServiceGraph — работают
// и на замороженном состоянии, и на draft внутри apply().

// Обходы страниц — единый доменный модуль (ревью A5, R4); здесь реэкспорт
// для команд.
export { walkPages, walkSubScenarios, findPageEntry, setPageLayerDepth } from '@domain/graph-walk';
export { findOwnerPageId } from '@domain/element-containers';

// Следующий персистентный порядковый номер сущности-страницы (D13):
// последовательность общая для всех страниц карты (в колонке канваса формы
// и подсценарии перемешаны, D12), поэтому максимум считается по всем видам.
export function nextPageOrderIndex(graph: ServiceGraph): number {
  let max = -1;
  for (const page of walkPages(graph)) {
    if (page.orderIndex > max) {
      max = page.orderIndex;
    }
  }
  return max + 1;
}

// Колонка нового узла (AddScenario/AddForm): следующий уровень за самой
// глубокой страницей — несвязанный узел не падает в нулевую колонку
// (замечание владельца); расчёт перенесён из UI в команды (ревью A3, R3).
export function nextPageLayerDepth(graph: ServiceGraph): number {
  const depths = computeGraphDepths(graph);
  return depths.size === 0 ? 0 : Math.max(...depths.values()) + 1;
}

// Сущность-страница по id среди всех видов страниц (ReorderInLayer, T-035).
export function findPageById(graph: ServiceGraph, pageId: PageEntityId): PageEntity | null {
  for (const page of walkPages(graph)) {
    if (page.id === pageId) {
      return page;
    }
  }
  return null;
}

// Подсценарий по id.
export function findSubScenarioById(graph: ServiceGraph, scenarioId: string): SubScenario | null {
  for (const scenario of walkSubScenarios(graph.subScenarios)) {
    if (scenario.id === scenarioId) {
      return scenario;
    }
  }
  return null;
}

export function findFormById(
  graph: ServiceGraph,
  formId: string,
): ServiceGraph['applicationForms'][number] | null {
  return graph.applicationForms.find((form) => form.id === formId) ?? null;
}

// Цель связи — страница МИПа: подсценарий (D13) или форма заявки (D12).
// Главная целью быть не может (PageLinkTargetId — только ScenarioId | ApplicationFormId).
export function isLinkTargetPresent(graph: ServiceGraph, targetId: string): boolean {
  return findSubScenarioById(graph, targetId) !== null || findFormById(graph, targetId) !== null;
}

// Положение элемента: блок-владелец (любой вид, [owner 2026-10-13]),
// его список и индекс — для изъятия/замены элемента командами.
export type ElementLocation = {
  container: ElementContainer;
  list: CanvasElement[];
  index: number;
};

export function findElementLocation(graph: ServiceGraph, elementId: string): ElementLocation | null {
  const found = findElementInGraph(graph, elementId);
  return found ? { container: found.container, list: found.container.elements, index: found.index } : null;
}
