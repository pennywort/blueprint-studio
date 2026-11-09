import type { ServiceGraph } from '@domain/model/service-graph';
import type { EditorRules } from '@domain/editor-rules';
import { computeGraphDepths } from '@domain/graph-depths';
import { computeAllFormStepDepths } from '@domain/form-step-depths';
import { computeFormElementDepths } from '@domain/step-element-depths';
import {
  linksSurvivingRemoval,
  logicRulesSurvivingRemoval,
  stepTransitionsSurvivingRemoval,
  type RemovedEntities,
} from '@domain/cascade-removal';
import { preserveFormElementDepths, preserveFormStepDepths, preservePageDepths } from './depth-preservation';

// Один каскад удаления (R-CMD-1) для RemoveElement / RemoveFormStep / RemoveForm /
// RemoveScenario / RemoveHomePage. Раньше цепочку повторяла каждая команда, и копии
// разошлись: удаление страницы не чистило logicRules её элементов, хотя матрица связей
// может включить логику на страницах — висящие правила ломали инвариант logic-rules.
// Что именно уходит — правило домена (domain/cascade-removal.ts, §4c); здесь — применение.

// Каскад по удалённым элементам и целям: связи, правила логики, переходы между шагами.
export function cascadeRemove(draft: ServiceGraph, removed: RemovedEntities, rules: EditorRules): void {
  draft.links = linksSurvivingRemoval(draft.links, removed);
  draft.logicRules = logicRulesSurvivingRemoval(draft.logicRules, removed);
  draft.stepTransitions = stepTransitionsSurvivingRemoval(draft, rules);
}

// Полное удаление: снимок уровней ДО мутации → detach (вынуть сущность из графа,
// вернуть, что ушло) → каскад → блоки, потерявшие связи/переходы/правила, остаются
// на прежних уровнях (ADR-15: страницы, шаги, элементы шагов).
export function removeWithCascade(
  draft: ServiceGraph,
  rules: EditorRules,
  detach: () => RemovedEntities,
): void {
  const pageDepthsBefore = computeGraphDepths(draft);
  const stepDepthsBefore = computeAllFormStepDepths(draft);
  const elementDepthsBefore = computeFormElementDepths(draft);

  cascadeRemove(draft, detach(), rules);

  preservePageDepths(draft, pageDepthsBefore);
  preserveFormStepDepths(draft, stepDepthsBefore);
  preserveFormElementDepths(draft, elementDepthsBefore);
}
