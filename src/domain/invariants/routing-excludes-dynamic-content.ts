import type { ServiceGraph } from '@domain/model/service-graph';
import type { InvariantViolation } from './index';

// Инварианты #3–5 (конституция, раздел 4):
//  3. Маршрутизация и динамический контент взаимоисключающи;
//  4. Select list с маршрутизацией → динамический контент запрещён;
//  5. ConfigurationItemPicker с маршрутизацией → динамический контент запрещён.
// Правила 4 и 5 — выделенные случаи правила 3 для конкретных kind (БТ 8.8, 8.6).

export const ROUTING_EXCLUDES_DYNAMIC_CONTENT_RULE = 'routing-excludes-dynamic-content';
export const SELECT_LIST_ROUTING_RULE = 'select-list-routing-forbids-dynamic-content';
export const CI_PICKER_ROUTING_RULE = 'ci-picker-routing-forbids-dynamic-content';

function ruleForKind(kind: string): string {
  if (kind === 'selectList') return SELECT_LIST_ROUTING_RULE;
  if (kind === 'configurationItemPicker') return CI_PICKER_ROUTING_RULE;
  return ROUTING_EXCLUDES_DYNAMIC_CONTENT_RULE;
}

export function checkRoutingExcludesDynamicContent(graph: ServiceGraph): InvariantViolation[] {
  const violations: InvariantViolation[] = [];

  graph.applicationForms.forEach((form) => {
    form.steps.forEach((step) => {
      step.components.forEach((component) => {
        if (component.routing !== undefined && component.hasDynamicContent === true) {
          violations.push({
            rule: ruleForKind(component.kind),
            path: `applicationForms[${form.id}].steps[${step.id}].components[${component.id}]`,
            message: `Компонент "${component.kind}" завязан на маршрутизацию — динамический контент для него запрещён`,
          });
        }
      });
    });
  });

  return violations;
}
