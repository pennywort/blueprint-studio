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

// Выделенные правила по виду элемента (kind — имя во фреймворке/схемах проекта).
const RULE_BY_KIND: Readonly<Record<string, string>> = {
  select: SELECT_LIST_ROUTING_RULE,
  'radio-group': SELECT_LIST_ROUTING_RULE,
  'ac-configuration-item': CI_PICKER_ROUTING_RULE,
};

function ruleForKind(kind: string): string {
  return RULE_BY_KIND[kind] ?? ROUTING_EXCLUDES_DYNAMIC_CONTENT_RULE;
}

export function checkRoutingExcludesDynamicContent(graph: ServiceGraph): InvariantViolation[] {
  const violations: InvariantViolation[] = [];

  // Элемент может лежать в любом блоке [owner 2026-10-13] — обход всех;
  // маршрутизация есть только у компонентов форм.
  for (const container of walkElementContainers(graph)) {
    for (const component of container.elements) {
      if ('routing' in component && component.routing !== undefined && component.hasDynamicContent === true) {
        violations.push({
          rule: ruleForKind(component.kind),
          path: elementViolationPath(container, component.id),
          message: `Компонент "${component.kind}" завязан на маршрутизацию — динамический контент для него запрещён`,
        });
      }
    }
  }

  return violations;
}
