import type { ServiceGraph } from '@domain/model/service-graph';
import { checkSingleAttachmentPerForm } from './single-attachment-per-form';
import { checkRadioMaxFiveOptions } from './radio-max-five-options';
import { checkScenarioTypeFields } from './scenario-type-fields';
import { checkRoutingExcludesDynamicContent } from './routing-excludes-dynamic-content';
import { checkLogicRules } from './logic-rules';
import { checkLayerCapacity } from './layer-capacity';
import { checkStepTransitions } from './step-transitions';

// Единая точка проверки доменных инвариантов (конституция, раздел 4).
// Инварианты #6–8 вне этого оркестратора: #6 — workflow-FSM (эпик 004),
// #7 — UI-уровень (эпик 002), #8 — не реализуется.

export type InvariantViolation = {
  rule: string;
  path: string;
  message: string;
};

export function validateGraph(graph: ServiceGraph): InvariantViolation[] {
  return [
    ...checkSingleAttachmentPerForm(graph),
    ...checkRadioMaxFiveOptions(graph),
    ...checkScenarioTypeFields(graph),
    ...checkRoutingExcludesDynamicContent(graph),
    ...checkLogicRules(graph),
    ...checkLayerCapacity(graph),
    ...checkStepTransitions(graph),
  ];
}
