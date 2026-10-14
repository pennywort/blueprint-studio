import type { ServiceGraph } from './model/service-graph';
import type { StepTransition } from './model/step-transition';
import { findElementInGraph } from './element-containers';

// Правила переходов между шагами формы [owner 2026-10-14] — единый источник
// для подсветки шагов-целей при протягивании связи (connection-rules),
// инварианта (invariants/step-transitions) и каскадов команд.

// Ключ источника перехода: элемент целиком или его вариант.
export const stepTransitionSourceKey = (
  transition: Pick<StepTransition, 'sourceElementId' | 'optionId'>,
): string => `${transition.sourceElementId}:${transition.optionId ?? ''}`;

/**
 * Шаги, в которые можно перейти из элемента (или его варианта): шаги той же
 * формы ПОЗЖЕ шага-источника — следующий или через несколько. Пусто, если
 * элемент не в шаге формы или варианта у него нет.
 */
export function stepTransitionTargets(
  graph: ServiceGraph,
  elementId: string,
  optionId?: string,
): Set<string> {
  const found = findElementInGraph(graph, elementId);
  if (!found || found.container.kind !== 'formStep') {
    return new Set();
  }
  if (optionId !== undefined) {
    const source = found.element;
    if (source.kind !== 'selectList' || !source.options.some((option) => option.value === optionId)) {
      return new Set();
    }
  }
  const { formId, stepId } = found.container;
  const steps = graph.applicationForms.find((form) => form.id === formId)?.steps ?? [];
  const sourceIndex = steps.findIndex((step) => step.id === stepId);
  return new Set(steps.slice(sourceIndex + 1).map((step) => step.id));
}

/** Почему переход недопустим; null — допустим. */
export function stepTransitionProblem(graph: ServiceGraph, transition: StepTransition): string | null {
  const found = findElementInGraph(graph, transition.sourceElementId);
  if (!found || found.container.kind !== 'formStep') {
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
      : 'Переход возможен только на один из следующих шагов той же формы';
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
