import type { ServiceGraph } from './model/service-graph';
import type { SubScenario } from './model/scenario';
import { computeGraphDepths } from './graph-depths';

// Правила «с чем можно соединиться» (повторная приёмка Epic 002, [owner
// 2026-10-13]) — единый источник для подсветки допустимых целей во время
// протягивания связи и для проверки самой связи (isValidConnection канваса).
//
// — Навигация: источник — элемент страницы, цель — блок СЛЕДУЮЩИХ уровней
//   (глубина цели > глубины страницы-источника). Главная, своя страница и
//   уже связанная с этим элементом страница — не цели.
// — «Сложная логика»: источник — option Select'а с включённым режимом, цель —
//   другой элемент ТОГО ЖЕ шага формы (ADR-14). Повтор правила и цикл
//   видимости — не цели.

export type ConnectionSource =
  { kind: 'navigation'; elementId: string } | { kind: 'logic'; elementId: string; optionId: string };

export type ConnectableTargets = {
  /** Страницы-цели навигационной связи. */
  pages: ReadonlySet<string>;
  /** Элементы-цели правила «Сложной логики». */
  elements: ReadonlySet<string>;
};

const NONE: ConnectableTargets = { pages: new Set(), elements: new Set() };

function* walkScenarios(subScenarios: SubScenario[]): Generator<SubScenario> {
  for (const scenario of subScenarios) {
    yield scenario;
    if (scenario.children) {
      yield* walkScenarios(scenario.children);
    }
  }
}

// Страница — владелец элемента (элементы страниц и компоненты форм).
function findOwnerPageId(graph: ServiceGraph, elementId: string): string | null {
  const home = graph.homePage;
  if (home && [...home.listItems, ...home.widgetCards].some((item) => item.id === elementId)) {
    return home.id;
  }
  for (const scenario of walkScenarios(graph.subScenarios)) {
    if (scenario.listItems.some((item) => item.id === elementId)) {
      return scenario.id;
    }
  }
  for (const form of graph.applicationForms) {
    if (form.steps.some((step) => step.components.some((component) => component.id === elementId))) {
      return form.id;
    }
  }
  return null;
}

function navigationTargets(graph: ServiceGraph, elementId: string): ConnectableTargets {
  const sourcePageId = findOwnerPageId(graph, elementId);
  if (sourcePageId === null) {
    return NONE;
  }
  const depths = computeGraphDepths(graph);
  const sourceDepth = depths.get(sourcePageId) ?? 0;
  const linked = new Set(
    graph.links.filter((link) => link.sourceElementId === elementId).map((link) => link.targetId),
  );
  const pages = new Set<string>();
  const candidates = [...walkScenarios(graph.subScenarios), ...graph.applicationForms];
  for (const page of candidates) {
    if (page.id !== sourcePageId && !linked.has(page.id) && (depths.get(page.id) ?? 0) > sourceDepth) {
      pages.add(page.id);
    }
  }
  return { pages, elements: new Set() };
}

// Правило source → target замкнуло бы контур видимости: из цели по уже
// существующим правилам достижим источник (L-I6).
function wouldCreateCycle(graph: ServiceGraph, sourceId: string, targetId: string): boolean {
  const next = new Map<string, string[]>();
  for (const rule of graph.logicRules) {
    next.set(rule.sourceElementId, [...(next.get(rule.sourceElementId) ?? []), rule.targetElementId]);
  }
  const stack = [targetId];
  const seen = new Set<string>();
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === sourceId) {
      return true;
    }
    if (!seen.has(current)) {
      seen.add(current);
      stack.push(...(next.get(current) ?? []));
    }
  }
  return false;
}

function logicTargets(graph: ServiceGraph, elementId: string, optionId: string): ConnectableTargets {
  for (const form of graph.applicationForms) {
    for (const step of form.steps) {
      const source = step.components.find((component) => component.id === elementId);
      if (!source) {
        continue;
      }
      if (source.kind !== 'selectList' || !source.hasComplexLogic) {
        return NONE;
      }
      const elements = new Set<string>();
      for (const component of step.components) {
        const duplicate = graph.logicRules.some(
          (rule) =>
            rule.sourceElementId === elementId &&
            (rule.targetElementId as string) === component.id &&
            rule.condition.kind === 'optionSelected' &&
            rule.condition.optionId === optionId,
        );
        if (component.id !== elementId && !duplicate && !wouldCreateCycle(graph, elementId, component.id)) {
          elements.add(component.id);
        }
      }
      return { pages: new Set(), elements };
    }
  }
  return NONE;
}

export function connectableTargets(graph: ServiceGraph, source: ConnectionSource): ConnectableTargets {
  return source.kind === 'navigation'
    ? navigationTargets(graph, source.elementId)
    : logicTargets(graph, source.elementId, source.optionId);
}
