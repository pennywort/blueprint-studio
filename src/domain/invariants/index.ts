import type { ServiceGraph } from '@domain/model/service-graph';
import type { EditorRules } from '@domain/editor-rules';
import { ruleSeverity, type RuleSeverity } from '@domain/rule-policy';
import { checkElementCountLimits } from './element-count-limits';
import { checkRadioMaxFiveOptions } from './radio-max-five-options';
import { checkRoutingExcludesDynamicContent } from './routing-excludes-dynamic-content';
import { checkLogicRules } from './logic-rules';
import { checkLayerCapacity } from './layer-capacity';
import { checkStepTransitions } from './step-transitions';

// Единая точка проверки доменных инвариантов (конституция, раздел 4).
// Инварианты #6–8 вне этого оркестратора: #6 — workflow-FSM (эпик 004),
// #7 — UI-уровень (эпик 002), #8 — не реализуется.
// Правила — параметр (EditorRules из настроек редактора, R-ADM): граф
// проверяется теми значениями, что действуют сейчас.

export type InvariantViolation = {
  rule: string;
  path: string;
  message: string;
  /** Строгость правила (rule-policy, R-CFG-5); у проверок не задаётся — её ставит оркестратор. */
  severity?: RuleSeverity;
};

// Все включённые нарушения со строгостью — для подсветки на канвасе:
// и блокирующие, и предупреждения ([owner 2026-10-16]). Правила `off` не проверяются.
export function collectViolations(graph: ServiceGraph, rules: EditorRules): InvariantViolation[] {
  return [
    ...checkElementCountLimits(graph, rules),
    ...checkRadioMaxFiveOptions(graph, rules),
    ...checkRoutingExcludesDynamicContent(graph),
    ...checkLogicRules(graph, rules),
    ...checkLayerCapacity(graph, rules),
    ...checkStepTransitions(graph, rules),
  ]
    .map((violation) => ({ ...violation, severity: ruleSeverity(rules, violation.rule) }))
    .filter((violation) => violation.severity !== 'off');
}

// Нарушения, которые отклоняют команду (строгость `error`): команды бросают
// InvariantViolationError, если список не пуст. Предупреждения действие не блокируют.
export function validateGraph(graph: ServiceGraph, rules: EditorRules): InvariantViolation[] {
  return collectViolations(graph, rules).filter((violation) => violation.severity === 'error');
}
