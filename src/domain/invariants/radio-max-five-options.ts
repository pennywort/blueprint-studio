import type { ServiceGraph } from '@domain/model/service-graph';
import type { InvariantViolation } from './index';
import { elementViolationPath, walkElementContainers } from '../element-containers';
import { elementVariants, kindRules } from '../element-kinds';
import type { EditorRules } from '../editor-rules';

// Инвариант #2 (конституция, раздел 4): радио-группа — максимум 5 вариантов.
// Предел — поле `variants.max` вида в реестре element-kinds (радио-группа
// фреймворка `radio-group`), а не ветвление по kind.

export const RADIO_MAX_OPTIONS_RULE = 'radio-max-five-options';

export function checkRadioMaxFiveOptions(graph: ServiceGraph, rules: EditorRules): InvariantViolation[] {
  const violations: InvariantViolation[] = [];

  // Элемент может лежать в любом блоке [owner 2026-10-13] — обход всех.
  for (const container of walkElementContainers(graph)) {
    for (const element of container.elements) {
      const max = kindRules(rules, element.kind).variants?.max;
      const count = elementVariants(rules, element).length;
      if (max !== undefined && count > max) {
        violations.push({
          rule: RADIO_MAX_OPTIONS_RULE,
          path: elementViolationPath(container, element.id),
          message: `Радио-группа содержит ${count} вариантов — допустимо не более ${max}`,
        });
      }
    }
  }

  return violations;
}
