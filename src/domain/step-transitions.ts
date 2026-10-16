import type { ServiceGraph } from './model/service-graph';
import type { StepTransition } from './model/step-transition';
import { findElementInGraph } from './element-containers';
import { supportsStepTransitions } from './container-capabilities';
import { computeFormStepDepths } from './form-step-depths';

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
  elementId: string,
  optionId?: string,
): Set<string> {
  // Переходы — только из блоков с этой возможностью (R-CFG-2: шаг формы).
  const found = findElementInGraph(graph, elementId);
  if (!found || !supportsStepTransitions(found.container)) {
    return new Set();
  }
  if (optionId !== undefined) {
    const source = found.element;
    if (source.kind !== 'selectList' || !source.options.some((option) => option.value === optionId)) {
      return new Set();
    }
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
export function stepTransitionProblem(graph: ServiceGraph, transition: StepTransition): string | null {
  const found = findElementInGraph(graph, transition.sourceElementId);
  if (!found || !supportsStepTransitions(found.container)) {
    return 'Переход между шагами начинается только от элемента шага формы';
  }
  if (
    !stepTransitionTargets(graph, transition.sourceElementId, transition.optionId).has(
      transition.targetStepId,
    )
  ) {
    return transition.optionId !== undefined &&
      stepTransitionTargets(graph, transition.sourceElementId).has(transition.targetStepId)
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
export function validStepTransitions(graph: ServiceGraph): StepTransition[] {
  return graph.stepTransitions.filter((transition) => stepTransitionProblem(graph, transition) === null);
}

/** Шаг-владелец элемента-источника перехода; null — источник не в шаге формы. */
export function stepTransitionSourceStepId(graph: ServiceGraph, transition: StepTransition): string | null {
  const found = findElementInGraph(graph, transition.sourceElementId);
  return found && supportsStepTransitions(found.container) ? found.container.stepId : null;
}
