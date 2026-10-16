import type { ServiceGraph } from '../model/service-graph';
import { computeGraphDepths } from '../graph-depths';
import { computeFormStepDepths } from '../form-step-depths';
import { walkPages } from '../graph-walk';
import {
  FORM_STEP_LAYER_CAPACITY,
  PAGE_LAYER_CAPACITY,
  overflowingLayerIds,
  type LayerCapacity,
} from '../layer-capacity';
import type { InvariantViolation } from './index';

// Ёмкость уровней (ADR-15, [owner 2026-10-13], [owner 2026-10-16]): на
// уровне — не больше узлов, чем задано таблицей ёмкости (layer-capacity.ts).
// Сейчас это «один корень»: у карты — Главная или, без неё, единственный
// блок-корень (D8); у формы — один первый шаг. Пустой уровень допустим.

export const LAYER_CAPACITY_RULE = 'layer-capacity';

function capacityMessage(capacity: LayerCapacity, depth: number, what: string): string {
  return `На уровне ${depth} ${what}: не больше ${capacity[depth]}`;
}

export function checkLayerCapacity(graph: ServiceGraph): InvariantViolation[] {
  const violations: InvariantViolation[] = [];

  // Страницы: Главная всегда остаётся, дальше — по orderIndex.
  const pageDepths = computeGraphDepths(graph);
  const pages = [...walkPages(graph)].sort((left, right) => left.orderIndex - right.orderIndex);
  const pageIds = pages.map((page) => page.id as string);
  const homeId = graph.homePage?.id;
  const orderedPages = homeId ? [homeId, ...pageIds.filter((id) => id !== homeId)] : pageIds;
  for (const id of overflowingLayerIds(PAGE_LAYER_CAPACITY, orderedPages, pageDepths)) {
    violations.push({
      rule: LAYER_CAPACITY_RULE,
      path: `pages[${id}]`,
      message: capacityMessage(PAGE_LAYER_CAPACITY, pageDepths.get(id)!, 'навигации блоков'),
    });
  }

  // Шаги формы: старшинство — порядок шагов в форме (D7).
  for (const form of graph.applicationForms) {
    const stepDepths = computeFormStepDepths(form, graph.stepTransitions);
    const stepIds = form.steps.map((step) => step.id as string);
    for (const id of overflowingLayerIds(FORM_STEP_LAYER_CAPACITY, stepIds, stepDepths)) {
      violations.push({
        rule: LAYER_CAPACITY_RULE,
        path: `applicationForms[${form.id}].steps[${id}]`,
        message: capacityMessage(FORM_STEP_LAYER_CAPACITY, stepDepths.get(id)!, 'формы шагов'),
      });
    }
  }
  return violations;
}
