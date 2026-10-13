import type { ServiceGraph } from '@domain/model/service-graph';
import { RADIO_MAX_OPTIONS } from '@domain/model/form-components';
import type { InvariantViolation } from './index';
import { elementViolationPath, walkElementContainers } from '../element-containers';

// Инвариант #2 (конституция, раздел 4): Radio-группа (Select list с displayType=radio) —
// максимум 5 вариантов.

export const RADIO_MAX_OPTIONS_RULE = 'radio-max-five-options';

export function checkRadioMaxFiveOptions(graph: ServiceGraph): InvariantViolation[] {
  const violations: InvariantViolation[] = [];

  // Любой Select list карты — элементы равноправны в любом контейнере [owner 2026-10-13].
  for (const container of walkElementContainers(graph)) {
    for (const element of container.elements) {
      if (
        element.kind === 'selectList' &&
        element.displayType === 'radio' &&
        element.options.length > RADIO_MAX_OPTIONS
      ) {
        violations.push({
          rule: RADIO_MAX_OPTIONS_RULE,
          path: elementViolationPath(container, element.id),
          message: `Радио-группа содержит ${element.options.length} вариантов — допустимо не более ${RADIO_MAX_OPTIONS}`,
        });
      }
    }
  }
  return violations;
}
