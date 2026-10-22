import type { ServiceGraph } from '../model/service-graph';
import { elementViolationPath, walkElementContainers, type ElementContainer } from '../element-containers';
import type { ElementCountScope } from '../rule-policy';
import type { EditorRules } from '../editor-rules';
import type { InvariantViolation } from './index';

// Лимиты числа элементов вида в блоке (конституция §4 п. 1 — по умолчанию,
// R-CFG-5, [owner 2026-10-16]): одно правило вместо частного «одно вложение
// на форму». Сколько и где — EditorRules.elementCountLimits (R-ADM).
// Нарушение ставится на каждый лишний элемент (первые по порядку остаются),
// чтобы канвас подсветил именно его.

export const ELEMENT_COUNT_LIMIT_RULE = 'element-count-limit';

const SCOPE_NAMES: Record<ElementCountScope, string> = {
  home: 'На Главной',
  subScenario: 'В подсценарии',
  formStep: 'В шаге формы',
  form: 'В форме',
};

// Ключ блока данного вида, к которому относится контейнер; null — не тот вид.
function scopeKey(graph: ServiceGraph, container: ElementContainer, scope: ElementCountScope): string | null {
  if (container.kind === 'formStep') {
    if (scope === 'formStep') return container.stepId;
    if (scope === 'form') return container.formId;
    return null;
  }
  const isHome = container.pageId === graph.homePage?.id;
  if (scope === 'home') return isHome ? container.pageId : null;
  if (scope === 'subScenario') return isHome ? null : container.pageId;
  return null;
}

// Таблица «блок → вид → число» (EditorRules) → список лимитов для обхода.
function limitList(rules: EditorRules): { scope: ElementCountScope; kind: string; max: number }[] {
  return Object.entries(rules.elementCountLimits).flatMap(([scope, kinds]) =>
    Object.entries(kinds ?? {}).map(([kind, max]) => ({ scope: scope as ElementCountScope, kind, max })),
  );
}

export function checkElementCountLimits(graph: ServiceGraph, rules: EditorRules): InvariantViolation[] {
  const violations: InvariantViolation[] = [];
  for (const limit of limitList(rules)) {
    const counts = new Map<string, number>();
    for (const container of walkElementContainers(graph)) {
      const key = scopeKey(graph, container, limit.scope);
      if (key === null) {
        continue;
      }
      for (const element of container.elements) {
        if (element.kind !== limit.kind) {
          continue;
        }
        const count = (counts.get(key) ?? 0) + 1;
        counts.set(key, count);
        if (count > limit.max) {
          violations.push({
            rule: ELEMENT_COUNT_LIMIT_RULE,
            path: elementViolationPath(container, element.id),
            message: `${SCOPE_NAMES[limit.scope]} не больше ${limit.max} элемент(ов) вида ${limit.kind}`,
          });
        }
      }
    }
  }
  return violations;
}
