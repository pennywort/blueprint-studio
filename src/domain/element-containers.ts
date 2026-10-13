import type { ServiceGraph } from './model/service-graph';
import type { MapElement } from './model/element';
import type { SubScenario } from './model/scenario';

// Контейнеры элементов карты [owner 2026-10-13]: Главная, подсценарий, шаг
// формы — равноправные списки любых элементов. Единый обход вместо
// отдельных веток «listItems / widgetCards / components» в каждом правиле.

export type ElementContainerRef =
  { kind: 'page'; pageId: string } | { kind: 'formStep'; formId: string; stepId: string };

export type ElementContainer = {
  ref: ElementContainerRef;
  /** Страница-владелец (для формы — сама форма): слой связей навигации, D9. */
  ownerPageId: string;
  elements: MapElement[];
};

function* walkScenarioContainers(subScenarios: SubScenario[]): Generator<ElementContainer> {
  for (const scenario of subScenarios) {
    yield {
      ref: { kind: 'page', pageId: scenario.id },
      ownerPageId: scenario.id,
      elements: scenario.elements,
    };
    if (scenario.children) {
      yield* walkScenarioContainers(scenario.children);
    }
  }
}

export function* walkElementContainers(graph: ServiceGraph): Generator<ElementContainer> {
  if (graph.homePage) {
    const home = graph.homePage;
    yield { ref: { kind: 'page', pageId: home.id }, ownerPageId: home.id, elements: home.elements };
  }
  yield* walkScenarioContainers(graph.subScenarios);
  for (const form of graph.applicationForms) {
    for (const step of form.steps) {
      yield {
        ref: { kind: 'formStep', formId: form.id, stepId: step.id },
        ownerPageId: form.id,
        elements: step.elements,
      };
    }
  }
}

/** Где лежит элемент: контейнер и индекс в его списке; null — элемента нет. */
export type ElementLocation = ElementContainer & { index: number; element: MapElement };

export function findElementLocation(graph: ServiceGraph, elementId: string): ElementLocation | null {
  for (const container of walkElementContainers(graph)) {
    const index = container.elements.findIndex((element) => element.id === elementId);
    if (index >= 0) {
      return { ...container, index, element: container.elements[index]! };
    }
  }
  return null;
}

/** Контейнер по ссылке; null — контейнера нет. */
export function findElementContainer(graph: ServiceGraph, ref: ElementContainerRef): ElementContainer | null {
  for (const container of walkElementContainers(graph)) {
    const match =
      ref.kind === 'page'
        ? container.ref.kind === 'page' && container.ref.pageId === ref.pageId
        : container.ref.kind === 'formStep' &&
          container.ref.stepId === ref.stepId &&
          container.ref.formId === ref.formId;
    if (match) {
      return container;
    }
  }
  return null;
}

// Путь элемента в нарушениях инвариантов (violation-markers разбирает его
// в узел + элемент): pages[id].elements[id] или
// applicationForms[id].steps[id].elements[id].
export function elementViolationPath(container: ElementContainer, elementId: string): string {
  return container.ref.kind === 'page'
    ? `pages[${container.ref.pageId}].elements[${elementId}]`
    : `applicationForms[${container.ref.formId}].steps[${container.ref.stepId}].elements[${elementId}]`;
}
