import type { ServiceGraph } from './model/service-graph';
import type { StepTransition } from './model/step-transition';
import { findElementInGraph } from './element-containers';
import { canConnect, connectionSourceRole, supportsStepTransitions } from './connection-matrix';
import { computeFormStepDepths } from './form-step-depths';
import { variantLabel } from './element-kinds';
import type { EditorRules } from './editor-rules';

// Правила переходов между шагами формы [owner 2026-10-14] — единый источник
// для подсветки шагов-целей при протягивании связи (connection-rules),
// инварианта (invariants/step-transitions) и каскадов команд.

// Ключ источника перехода: элемент целиком или его вариант.
export const stepTransitionSourceKey = (
  transition: Pick<StepTransition, 'sourceElementId' | 'optionId'>,
): string => `${transition.sourceElementId}:${transition.optionId ?? ''}`;

/**
 * Шаги, в которые можно перейти из элемента (или его варианта): шаги той же
 * формы СЛЕДУЮЩИХ уровней (form-step-depths) — как цель навигационной связи
 * страницы [owner 2026-10-14]. Пусто, если элемент не в шаге формы или
 * варианта у него нет.
 */
export function stepTransitionTargets(
  graph: ServiceGraph,
  rules: EditorRules,
  elementId: string,
  optionId?: string,
): Set<string> {
  // Переходы — только из блоков с этой возможностью (матрица связей, R-CFG-2).
  const found = findElementInGraph(graph, elementId);
  if (!found || !supportsStepTransitions(rules, found.container)) {
    return new Set();
  }
  const source = found.element;
  if (optionId !== undefined) {
    if (variantLabel(rules, source, optionId) === null) {
      return new Set();
    }
  }
  // Может ли источник этой роли вести на шаг — матрица связей (connection-matrix):
  // вариант с «Сложной логикой» — только внутри шага [owner 2026-10-16].
  if (!canConnect(rules, connectionSourceRole(rules, source, optionId), 'step', found.container.kind)) {
    return new Set();
  }
  const { formId, stepId } = found.container;
  const form = graph.applicationForms.find((candidate) => candidate.id === formId);
  if (!form) {
    return new Set();
  }
  const depths = computeFormStepDepths(form, graph.stepTransitions);
  const sourceDepth = depths.get(stepId) ?? 0;
  return new Set(
    form.steps.filter((step) => (depths.get(step.id) ?? 0) > sourceDepth).map((step) => step.id),
  );
}

/** Почему переход недопустим; null — допустим. */
export function stepTransitionProblem(
  graph: ServiceGraph,
  rules: EditorRules,
  transition: StepTransition,
): string | null {
  const found = findElementInGraph(graph, transition.sourceElementId);
  if (!found || !supportsStepTransitions(rules, found.container)) {
    return 'Переход между шагами начинается только от элемента шага формы';
  }
  const role = connectionSourceRole(rules, found.element, transition.optionId);
  if (!canConnect(rules, role, 'step', found.container.kind)) {
    return 'Вариант со «Сложной логикой» связывается только с элементами своего шага';
  }
  if (
    !stepTransitionTargets(graph, rules, transition.sourceElementId, transition.optionId).has(
      transition.targetStepId,
    )
  ) {
    return transition.optionId !== undefined &&
      stepTransitionTargets(graph, rules, transition.sourceElementId).has(transition.targetStepId)
      ? 'Вариант перехода не найден в списке выбора'
      : 'Переход возможен только на шаг следующего уровня той же формы';
  }
  return null;
}

/**
 * Каскад команд: переходы, ставшие недопустимыми после мутации (удалён
 * элемент/шаг/вариант, элемент перенесён), уходят вместе с причиной — как
 * правила логики при удалении варианта (§6 дизайн-дока сложной логики).
 */
export function validStepTransitions(graph: ServiceGraph, rules: EditorRules): StepTransition[] {
  return graph.stepTransitions.filter(
    (transition) => stepTransitionProblem(graph, rules, transition) === null,
  );
}

/** Шаг-владелец элемента-источника перехода; null — источник не в шаге формы. */
export function stepTransitionSourceStepId(
  graph: ServiceGraph,
  rules: EditorRules,
  transition: StepTransition,
): string | null {
  const found = findElementInGraph(graph, transition.sourceElementId);
  return found && supportsStepTransitions(rules, found.container) ? found.container.stepId : null;
}
