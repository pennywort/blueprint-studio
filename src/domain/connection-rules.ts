import type { ServiceGraph } from './model/service-graph';
import { computeGraphDepths } from './graph-depths';
import { findElementInGraph, findOwnerPageId } from './element-containers';
import { walkSubScenarios } from './graph-walk';
import { stepTransitionTargets } from './step-transitions';
import { canBeLogicSource, kindRules } from './element-kinds';

// Правила «с чем можно соединиться» (повторная приёмка Epic 002, [owner
// 2026-10-13]) — единый источник для подсветки допустимых целей во время
// протягивания связи и для проверки самой связи (isValidConnection канваса).
//
// — Навигация: источник — элемент страницы, цель — блок СЛЕДУЮЩИХ уровней
//   (глубина цели > глубины страницы-источника). Главная, своя страница и
//   уже связанная с этим элементом страница — не цели.
// — «Сложная логика»: источник — option Select'а с включённым режимом, цель —
//   другой элемент ТОГО ЖЕ шага формы (ADR-14). Повтор правила, цикл
//   видимости и элемент, у которого уже есть правило (L-I7), — не цели.
// — Переход между шагами [owner 2026-10-14]: источник — элемент шага формы
//   или вариант его Select'а, цель — шаг следующих уровней той же формы
//   (step-transitions, уровни — form-step-depths). Вариант — источник перехода и без «Сложной логики».

export type ConnectionSource =
  { kind: 'navigation'; elementId: string } | { kind: 'logic'; elementId: string; optionId: string };

export type ConnectableTargets = {
  /** Страницы-цели навигационной связи. */
  pages: ReadonlySet<string>;
  /** Элементы-цели правила «Сложной логики». */
  elements: ReadonlySet<string>;
  /** Шаги-цели перехода между шагами формы. */
  steps: ReadonlySet<string>;
};

const NONE: ConnectableTargets = { pages: new Set(), elements: new Set(), steps: new Set() };

function navigationTargets(graph: ServiceGraph, elementId: string): ConnectableTargets {
  const sourcePageId = findOwnerPageId(graph, elementId);
  if (sourcePageId === null) {
    return NONE;
  }
  const steps = stepTransitionTargets(graph, elementId);
  const depths = computeGraphDepths(graph);
  const sourceDepth = depths.get(sourcePageId) ?? 0;
  const linked = new Set(
    graph.links.filter((link) => link.sourceElementId === elementId).map((link) => link.targetId),
  );
  const pages = new Set<string>();
  const candidates = [...walkSubScenarios(graph.subScenarios), ...graph.applicationForms];
  for (const page of candidates) {
    if (page.id !== sourcePageId && !linked.has(page.id) && (depths.get(page.id) ?? 0) > sourceDepth) {
      pages.add(page.id);
    }
  }
  return { pages, elements: new Set(), steps };
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
  // Логика — только внутри шага формы (L-I5/ADR-14): Select на странице
  // источником правила не бывает; цель — любой элемент шага [owner 2026-10-13].
  const found = findElementInGraph(graph, elementId);
  if (!found || found.container.kind !== 'formStep') {
    return NONE;
  }
  const steps = stepTransitionTargets(graph, elementId, optionId);
  const source = found.element;
  if (!canBeLogicSource(source) || !source.hasComplexLogic) {
    return { pages: new Set(), elements: new Set(), steps };
  }
  // У цели — не больше одного правила видимости (L-I7, временно [owner
  // 2026-10-13]): элемент, уже зависящий от варианта, — не цель.
  const ruleTargets = new Set<string>(graph.logicRules.map((rule) => rule.targetElementId));
  const elements = new Set<string>();
  for (const element of found.container.elements) {
    if (ruleTargets.has(element.id) || !kindRules(element.kind).logicTarget) {
      continue;
    }
    const duplicate = graph.logicRules.some(
      (rule) =>
        rule.sourceElementId === elementId &&
        (rule.targetElementId as string) === element.id &&
        rule.condition.kind === 'optionSelected' &&
        rule.condition.optionId === optionId,
    );
    if (element.id !== elementId && !duplicate && !wouldCreateCycle(graph, elementId, element.id)) {
      elements.add(element.id);
    }
  }
  return { pages: new Set(), elements, steps };
}

export function connectableTargets(graph: ServiceGraph, source: ConnectionSource): ConnectableTargets {
  // Комментарий-элемент не источник и не цель связей [owner 2026-10-15].
  const element = findElementInGraph(graph, source.elementId)?.element;
  if (element && !kindRules(element.kind).connectable) {
    return NONE;
  }
  return source.kind === 'navigation'
    ? navigationTargets(graph, source.elementId)
    : logicTargets(graph, source.elementId, source.optionId);
}
