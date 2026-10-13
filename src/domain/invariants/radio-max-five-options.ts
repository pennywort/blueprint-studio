import type { ServiceGraph } from '@domain/model/service-graph';
import { RADIO_MAX_OPTIONS } from '@domain/model/form-components';
import type { InvariantViolation } from './index';
import { elementViolationPath, walkElementContainers } from '../element-containers';

// Инвариант #2 (конституция, раздел 4): Radio-группа (Select list с displayType=radio) —
// максимум 5 вариантов.

export const RADIO_MAX_OPTIONS_RULE = 'radio-max-five-options';

export function checkRadioMaxFiveOptions(graph: ServiceGraph): InvariantViolation[] {
  const violations: InvariantViolation[] = [];

  // Элемент может лежать в любом блоке [owner 2026-10-13] — обход всех.
  for (const container of walkElementContainers(graph)) {
    for (const component of container.elements) {
      if (
        component.kind === 'selectList' &&
        component.displayType === 'radio' &&
        component.options.length > RADIO_MAX_OPTIONS
      ) {
        violations.push({
          rule: RADIO_MAX_OPTIONS_RULE,
          path: elementViolationPath(container, component.id),
          message: `Радио-группа содержит ${component.options.length} вариантов — допустимо не более ${RADIO_MAX_OPTIONS}`,
        });
      }
    }
  }

  return violations;
}
