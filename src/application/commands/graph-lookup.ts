import type { ServiceGraph } from '@domain/model/service-graph';
import type { ListItem, SubScenario, WidgetCard } from '@domain/model/scenario';
import type { FormComponent } from '@domain/model/form-components';
import type { PageEntityId } from '@domain/model/ids';

// Обходные помощники команд canvas (Epic 002, T-035): поиск страниц, элементов
// и связей внутри черновика Immer. Чистые функции над ServiceGraph — работают
// и на замороженном состоянии, и на draft внутри apply().

// Вложенность подсценариев через children не ограничена (БТ, раздел 7) —
// обход всегда рекурсивный, иначе команды «не увидят» вложенные страницы.
export function* walkSubScenarios(subScenarios: SubScenario[]): Generator<SubScenario> {
  for (const subScenario of subScenarios) {
    yield subScenario;
    if (subScenario.children) {
      yield* walkSubScenarios(subScenario.children);
    }
  }
}

// Все сущности-страницы карты: Главная (если есть, D8), подсценарии
// (рекурсивно), формы заявок (D12 — в слоях на общих основаниях).
export function* walkPages(
  graph: ServiceGraph,
): Generator<NonNullable<ServiceGraph['homePage']> | SubScenario | ServiceGraph['applicationForms'][number]> {
  if (graph.homePage) {
    yield graph.homePage;
  }
  yield* walkSubScenarios(graph.subScenarios);
  yield* graph.applicationForms;
}

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

// Сущность-страница по id среди всех видов страниц (ReorderInLayer, T-035).
export function findPageById(
  graph: ServiceGraph,
  pageId: PageEntityId,
): NonNullable<ServiceGraph['homePage']> | SubScenario | ServiceGraph['applicationForms'][number] | null {
  for (const page of walkPages(graph)) {
    if (page.id === pageId) {
      return page;
    }
  }
  return null;
}

// Id всех подсценариев поддерева (включая корень) — для каскадного удаления
// связей, направленных на удаляемые страницы.
export function collectSubtreeScenarioIds(root: SubScenario): Set<string> {
  const ids = new Set<string>();
  for (const scenario of walkSubScenarios([root])) {
    ids.add(scenario.id);
  }
  return ids;
}

// Id всех элементов страниц поддерева — источники связей (D9) удаляемых
// страниц; их исходящие связи удаляются каскадом вместе со страницей.
export function collectSubtreeElementIds(root: SubScenario): Set<string> {
  const ids = new Set<string>();
  for (const scenario of walkSubScenarios([root])) {
    for (const item of scenario.listItems) {
      ids.add(item.id);
    }
  }
  return ids;
}

// Подсценарий по id с учётом неограниченной вложенности (БТ, раздел 7).
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

// Id страницы, владеющей элементом (источником связи, D9) — нужно правилу
// слоёв (T-036): глубина источника = глубина страницы-владельца.
export function findElementOwnerPageId(graph: ServiceGraph, elementId: string): string | null {
  if (graph.homePage) {
    const home = graph.homePage;
    if (
      home.listItems.some((item) => item.id === elementId) ||
      home.widgetCards.some((card) => card.id === elementId)
    ) {
      return home.id;
    }
  }

  for (const scenario of walkSubScenarios(graph.subScenarios)) {
    if (scenario.listItems.some((item) => item.id === elementId)) {
      return scenario.id;
    }
  }

  for (const form of graph.applicationForms) {
    for (const step of form.steps) {
      if (step.components.some((component) => component.id === elementId)) {
        return form.id;
      }
    }
  }

  return null;
}

export type ElementLocation =
  | { kind: 'homeListItem'; list: ListItem[]; index: number }
  | { kind: 'homeWidgetCard'; list: WidgetCard[]; index: number }
  | { kind: 'subScenarioListItem'; list: ListItem[]; index: number }
  | { kind: 'formComponent'; list: FormComponent[]; index: number };

// Элемент канваса — карточка страницы (ListItem/WidgetCard) или компонент
// формы. Id сущностей уникальны (генератор IIdGenerator), поэтому первое
// совпадение — единственное.
export function findElementLocation(graph: ServiceGraph, elementId: string): ElementLocation | null {
  if (graph.homePage) {
    const listIndex = graph.homePage.listItems.findIndex((item) => item.id === elementId);
    if (listIndex >= 0) {
      return { kind: 'homeListItem', list: graph.homePage.listItems, index: listIndex };
    }
    const widgetIndex = graph.homePage.widgetCards.findIndex((card) => card.id === elementId);
    if (widgetIndex >= 0) {
      return { kind: 'homeWidgetCard', list: graph.homePage.widgetCards, index: widgetIndex };
    }
  }

  for (const scenario of walkSubScenarios(graph.subScenarios)) {
    const index = scenario.listItems.findIndex((item) => item.id === elementId);
    if (index >= 0) {
      return { kind: 'subScenarioListItem', list: scenario.listItems, index };
    }
  }

  for (const form of graph.applicationForms) {
    for (const step of form.steps) {
      const index = step.components.findIndex((component) => component.id === elementId);
      if (index >= 0) {
        return { kind: 'formComponent', list: step.components, index };
      }
    }
  }

  return null;
}
