import type { ServiceGraph } from './model/service-graph';
import type { CanvasElement } from './model/canvas-element';
import { walkSubScenarios } from './graph-walk';

// Блоки-контейнеры элементов канваса [owner 2026-10-13: «элемент может быть
// в любом блоке»]: Главная, подсценарии (рекурсивно, БТ 7) и шаги форм.
// Единый обход вместо поиска по видам: вид блока больше не определяет вид
// элемента. pageId — страница-владелец (для шага — форма): глубина
// источника связи = глубина его страницы (D9, T-036).

export type ElementContainer =
  | { kind: 'page'; pageId: string; elements: CanvasElement[] }
  | { kind: 'formStep'; pageId: string; formId: string; stepId: string; elements: CanvasElement[] };

export function* walkElementContainers(graph: ServiceGraph): Generator<ElementContainer> {
  if (graph.homePage) {
    yield { kind: 'page', pageId: graph.homePage.id, elements: graph.homePage.elements };
  }
  for (const scenario of walkSubScenarios(graph.subScenarios)) {
    yield { kind: 'page', pageId: scenario.id, elements: scenario.elements };
  }
  for (const form of graph.applicationForms) {
    for (const step of form.steps) {
      yield { kind: 'formStep', pageId: form.id, formId: form.id, stepId: step.id, elements: step.elements };
    }
  }
}

// Элемент вместе с блоком-владельцем и индексом в его списке; id элементов
// уникальны в графе (IIdGenerator) — первое совпадение единственное.
export function findElementInGraph(
  graph: ServiceGraph,
  elementId: string,
): { container: ElementContainer; element: CanvasElement; index: number } | null {
  for (const container of walkElementContainers(graph)) {
    const index = container.elements.findIndex((element) => element.id === elementId);
    if (index >= 0) {
      return { container, element: container.elements[index]!, index };
    }
  }
  return null;
}

// Страница — владелец элемента (любой блок, [owner 2026-10-13]); для
// элемента шага — форма. Глубина источника связи = глубина его страницы (D9).
export function findOwnerPageId(graph: ServiceGraph, elementId: string): string | null {
  return findElementInGraph(graph, elementId)?.container.pageId ?? null;
}

// Ключ блока: два элемента в одном блоке ⇔ ключи равны (L-I5 «внутри
// одного блока», R-CFG-2). У шага — id шага, у страницы — id страницы.
export function containerKey(container: ElementContainer): string {
  return container.kind === 'formStep' ? `step:${container.stepId}` : `page:${container.pageId}`;
}

// Путь элемента для нарушений инвариантов (формат violation-markers).
export function elementViolationPath(container: ElementContainer, elementId: string): string {
  return container.kind === 'formStep'
    ? `applicationForms[${container.formId}].steps[${container.stepId}].elements[${elementId}]`
    : `pages[${container.pageId}].elements[${elementId}]`;
}
