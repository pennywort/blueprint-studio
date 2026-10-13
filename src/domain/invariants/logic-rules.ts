import type { ServiceGraph } from '../model/service-graph';
import type { SelectList } from '../model/form-components';
import type { MapElement } from '../model/element';
import type { InvariantViolation } from './index';

// Инварианты «Сложной логики» (T-037/T-063, дизайн-док §5): защита данных —
// UI делает эти состояния недостижимыми (каскадные удаления), но инварианты
// проверяют граф независимо. Чистая функция (graph) => violations, как
// остальные правила validateGraph.

const RULE_ID = 'complex-logic';

// Компонент формы с контекстом: форма-владелец нужна правилу «внутри одной
// формы» (L-I5), option'ы — правилу «существующее значение списка» (L-I2).
type ComponentContext = {
  formId: string;
  stepId: string;
  component: MapElement;
};

function collectComponents(graph: ServiceGraph): Map<string, ComponentContext> {
  const components = new Map<string, ComponentContext>();
  for (const form of graph.applicationForms) {
    for (const step of form.steps) {
      for (const component of step.elements) {
        components.set(component.id, { formId: form.id, stepId: step.id, component });
      }
    }
  }
  return components;
}

export function checkLogicRules(graph: ServiceGraph): InvariantViolation[] {
  const violations: InvariantViolation[] = [];
  const components = collectComponents(graph);
  const seen = new Set<string>();
  // Цели, у которых уже есть правило (L-I7).
  const ruleTargets = new Set<string>();

  // Рёбра зависимости видимости (источник → цель) — для проверки циклов (L-I6).
  const visibilityEdges = new Map<string, string[]>();

  graph.logicRules.forEach((rule, index) => {
    const path = `logicRules[${index}]`;
    const source = components.get(rule.sourceElementId);
    const target = components.get(rule.targetElementId);

    // L-I3: источник и цель существуют; цель ≠ источник.
    if (!source || !target) {
      violations.push({ rule: RULE_ID, path, message: 'Правило ссылается на удалённый элемент' });
      return;
    }
    if (rule.targetElementId === rule.sourceElementId) {
      violations.push({ rule: RULE_ID, path, message: 'Правило ссылается на сам элемент-источник' });
    }

    // L-I1: источник — Select с включённой «Сложной логикой».
    if (source.component.kind !== 'selectList' || !source.component.hasComplexLogic) {
      violations.push({
        rule: RULE_ID,
        path,
        message: 'Правило ссылается на элемент без включённой сложной логики',
      });
    }

    // L-I2: condition.optionId существует среди option'ов источника.
    if (rule.condition.kind === 'optionSelected' && source.component.kind === 'selectList') {
      const optionExists = (source.component as SelectList).options.some(
        (option) => option.value === rule.condition.optionId,
      );
      if (!optionExists) {
        violations.push({ rule: RULE_ID, path, message: 'Правило ссылается на удалённое значение списка' });
      }
    }

    // L-I4: пара (источник, условие, цель) уникальна.
    const key = `${rule.sourceElementId}${rule.condition.kind}${rule.condition.kind === 'optionSelected' ? rule.condition.optionId : ''}${rule.targetElementId}`;
    if (seen.has(key)) {
      violations.push({ rule: RULE_ID, path, message: 'Дубликат правила видимости' });
    }
    seen.add(key);

    // L-I5: источник и цель — в пределах одного шага формы (ADR-14,
    // [owner 2026-10-13]; ранее — одной формы).
    if (source.formId !== target.formId || source.stepId !== target.stepId) {
      violations.push({
        rule: RULE_ID,
        path,
        message: 'Сложная логика возможна только внутри одного шага формы',
      });
    }

    // L-I7 (временно, [owner 2026-10-13]): у цели — не больше одного правила
    // видимости. Раскладка шага — дерево «цель напротив варианта-источника»;
    // несколько источников у цели отключены до уточнения с заказчиком.
    if (ruleTargets.has(rule.targetElementId)) {
      violations.push({
        rule: RULE_ID,
        path,
        message: 'У элемента может быть только одно правило видимости',
      });
    }
    ruleTargets.add(rule.targetElementId);

    const targets = visibilityEdges.get(rule.sourceElementId) ?? [];
    targets.push(rule.targetElementId);
    visibilityEdges.set(rule.sourceElementId, targets);
  });

  // L-I6: нет циклов видимости (цепочки «A показывает B, B показывает C»
  // легальны, запрещены только замкнутые контуры) — DFS с фиксацией контура.
  const reported = new Set<string>();
  const visit = (elementId: string, trail: Set<string>): void => {
    if (trail.has(elementId)) {
      if (!reported.has(elementId)) {
        reported.add(elementId);
        violations.push({
          rule: RULE_ID,
          path: 'logicRules',
          message: 'Циклическая зависимость видимости элементов',
        });
      }
      return;
    }
    const next = new Set(trail);
    next.add(elementId);
    for (const targetId of visibilityEdges.get(elementId) ?? []) {
      visit(targetId, next);
    }
  };
  for (const sourceId of visibilityEdges.keys()) {
    visit(sourceId, new Set());
  }

  return violations;
}
