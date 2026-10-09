import type { ServiceGraph } from '@domain/model/service-graph';
import type { SubScenario } from '@domain/model/scenario';
import type { InvariantViolation } from './index';

// Инварианты #3–4 формы сценария (спека 5.3): поля infoBlock / link / children /
// applicationFormId допустимы только при соответствующем type сценария.

export const SCENARIO_TYPE_FIELDS_RULE = 'scenario-type-fields';

function checkScenario(scenario: SubScenario, path: string, violations: InvariantViolation[]): void {
  if (scenario.infoBlock !== undefined && scenario.type !== 'navigation') {
    violations.push({
      rule: SCENARIO_TYPE_FIELDS_RULE,
      path: `${path}.infoBlock`,
      message: `Поле infoBlock допустимо только для сценария типа navigation, текущий тип: ${scenario.type}`,
    });
  }
  if (scenario.link !== undefined && scenario.type !== 'link') {
    violations.push({
      rule: SCENARIO_TYPE_FIELDS_RULE,
      path: `${path}.link`,
      message: `Поле link допустимо только для сценария типа link, текущий тип: ${scenario.type}`,
    });
  }
  if (scenario.children !== undefined && scenario.type !== 'navigation') {
    violations.push({
      rule: SCENARIO_TYPE_FIELDS_RULE,
      path: `${path}.children`,
      message: `Поле children допустимо только для сценария типа navigation, текущий тип: ${scenario.type}`,
    });
  }
  if (scenario.applicationFormId !== undefined && scenario.type !== 'application') {
    violations.push({
      rule: SCENARIO_TYPE_FIELDS_RULE,
      path: `${path}.applicationFormId`,
      message: `Поле applicationFormId допустимо только для сценария типа application, текущий тип: ${scenario.type}`,
    });
  }

  // Вложенность не ограничена — проверяем рекурсивно.
  scenario.children?.forEach((child, index) => {
    checkScenario(child, `${path}.children[${index}]`, violations);
  });
}

export function checkScenarioTypeFields(graph: ServiceGraph): InvariantViolation[] {
  const violations: InvariantViolation[] = [];

  graph.subScenarios.forEach((scenario, index) => {
    checkScenario(scenario, `subScenarios[${index}]`, violations);
  });

  return violations;
}
