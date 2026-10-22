import type { ServiceGraph } from '../model/service-graph';
import { elementViolationPath, findElementInGraph } from '../element-containers';
import { stepTransitionProblem, stepTransitionSourceKey } from '../step-transitions';
import type { EditorRules } from '../editor-rules';
import type { InvariantViolation } from './index';

// Инвариант переходов между шагами формы [owner 2026-10-14]: переход — от
// элемента шага (или варианта Select'а) на шаг следующего уровня той же формы;
// у источника переход один (однозначность ветвления).
export const STEP_TRANSITION_RULE = 'step-transition-forward-same-form';
export const STEP_TRANSITION_UNIQUE_RULE = 'step-transition-single-per-source';

export function checkStepTransitions(graph: ServiceGraph, rules: EditorRules): InvariantViolation[] {
  const violations: InvariantViolation[] = [];
  const seen = new Set<string>();
  graph.stepTransitions.forEach((transition, index) => {
    const found = findElementInGraph(graph, transition.sourceElementId);
    const path = found
      ? elementViolationPath(found.container, transition.sourceElementId)
      : `stepTransitions[${index}]`;
    const problem = stepTransitionProblem(graph, rules, transition);
    if (problem !== null) {
      violations.push({ rule: STEP_TRANSITION_RULE, path, message: problem });
    }
    const key = stepTransitionSourceKey(transition);
    if (seen.has(key)) {
      violations.push({
        rule: STEP_TRANSITION_UNIQUE_RULE,
        path,
        message: 'У элемента (варианта) может быть только один переход на шаг',
      });
    }
    seen.add(key);
  });
  return violations;
}
