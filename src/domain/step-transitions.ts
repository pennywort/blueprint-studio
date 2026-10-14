import type { ServiceGraph } from './model/service-graph';
import type { StepTransition } from './model/step-transition';
import { findElementInGraph } from './element-containers';
import type { OrderAnchor } from './ordered-move';

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

/**
 * Куда встаёт шаг-цель нового перехода [owner 2026-10-14] — правило «ближайшего
 * уровня», как у связи на подсценарий (цель — на уровень «источник + 1»,
 * placeLinkTargetIntoNextLayer): переход через несколько шагов смысла не имеет,
 * цель встаёт сразу за шагом-источником. Шаги, уже ставшие целями переходов
 * из того же шага (ветвление по вариантам Select'а), — «колонка» источника:
 * новая цель встаёт в её конец (D7), а не вытесняет их. null — цель уже на месте
 * или переход не из шага той же формы.
 */
export function stepTransitionTargetAnchor(
  graph: ServiceGraph,
  transition: StepTransition,
): OrderAnchor | null {
  const found = findElementInGraph(graph, transition.sourceElementId);
  if (!found || found.container.kind !== 'formStep') {
    return null;
  }
  const { formId, stepId } = found.container;
  const form = graph.applicationForms.find((candidate) => candidate.id === formId);
  if (!form) {
    return null;
  }
  const steps = form.steps;
  const sourceIndex = steps.findIndex((step) => step.id === stepId);
  const targetIndex = steps.findIndex((step) => step.id === transition.targetStepId);
  if (sourceIndex < 0 || targetIndex <= sourceIndex) {
    return null; // назад переход недопустим — это решает инвариант, не раскладка
  }
  const sourceElementIds = new Set<string>(steps[sourceIndex]!.elements.map((element) => element.id));
  const siblingTargets = new Set<string>(
    graph.stepTransitions
      .filter((other) => sourceElementIds.has(other.sourceElementId))
      .map((other) => other.targetStepId),
  );
  let last = sourceIndex;
  while (
    last + 1 < steps.length &&
    steps[last + 1]!.id !== transition.targetStepId &&
    siblingTargets.has(steps[last + 1]!.id)
  ) {
    last += 1;
  }
  return targetIndex === last + 1 ? null : { id: steps[last]!.id, placement: 'after' };
}
