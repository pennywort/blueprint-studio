import type { ServiceGraph } from './model/service-graph';
import type { EditorRules } from './editor-rules';
import type { PageLink } from './model/page-link';
import type { LogicRule } from './model/logic-rule';
import type { StepTransition } from './model/step-transition';
import { validStepTransitions } from './step-transitions';

// Что уходит вместе с удалёнными сущностями (R-CMD-1, AGENTS.md §4c): одно правило
// каскада для всех команд удаления. Применяет его application/commands/cascade-remove.ts.

/** Что ушло из графа: элементы (источники связей, правил, переходов) и цели связей (страницы, формы). */
export type RemovedEntities = {
  readonly elementIds: ReadonlySet<string>;
  readonly targetIds?: ReadonlySet<string>;
};

/** id элементов контейнеров (страница, шаг) — для набора RemovedEntities. */
export function elementIdsOf(
  containers: ReadonlyArray<{ elements: ReadonlyArray<{ id: string }> }>,
): Set<string> {
  return new Set(containers.flatMap((container) => container.elements.map((element) => element.id)));
}

// Связи переживают удаление, если их источник-элемент (D9, ADR-17) и цель (D12) остались.
export function linksSurvivingRemoval(links: readonly PageLink[], removed: RemovedEntities): PageLink[] {
  return links.filter(
    (link) => !removed.elementIds.has(link.sourceElementId) && !removed.targetIds?.has(link.targetId),
  );
}

// Правила «Сложной логики» (T-037) уходят, если удалён источник или цель — на любом
// контейнере: матрица связей может включить логику и на страницах (connection-matrix).
export function logicRulesSurvivingRemoval(
  logicRules: readonly LogicRule[],
  removed: RemovedEntities,
): LogicRule[] {
  return logicRules.filter(
    (rule) => !removed.elementIds.has(rule.sourceElementId) && !removed.elementIds.has(rule.targetElementId),
  );
}

// Переходы между шагами, ставшие недопустимыми, уходят вместе с причиной [owner 2026-10-14].
// Вызывать на графе ПОСЛЕ изъятия сущностей.
export function stepTransitionsSurvivingRemoval(graph: ServiceGraph, rules: EditorRules): StepTransition[] {
  return validStepTransitions(graph, rules);
}
