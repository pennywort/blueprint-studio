import type { ServiceGraph } from '@domain/model/service-graph';
import type { InvariantViolation } from './index';
import { elementViolationPath, walkElementContainers } from '../element-containers';

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

  // Любой элемент карты с маршрутизацией — в любом контейнере [owner 2026-10-13].
  for (const container of walkElementContainers(graph)) {
    for (const element of container.elements) {
      if ('routing' in element && element.routing !== undefined && element.hasDynamicContent === true) {
        violations.push({
          rule: ruleForKind(element.kind),
          path: elementViolationPath(container, element.id),
          message: `Компонент "${element.kind}" завязан на маршрутизацию — динамический контент для него запрещён`,
        });
      }
    }
  }
  return violations;
}
