import type { ServiceGraph } from './model/service-graph';
import type { FormStep } from './model/scenario';
import type { LogicRule } from './model/logic-rule';
import { computeLayerDepths, type LayerEdge } from './layer-depths';

// Уровни (колонки) элементов внутри шага формы [owner 2026-10-13]: шаг —
// такой же слоёный граф, как канвас страниц, но рёбра — правила «Сложной
// логики» (L-I5/ADR-14: источник и цель — в одном шаге). Источник левее,
// цель — на колонку правее; элемент без входящих правил — корень (колонка 0),
// если пользователь не перенёс его в другую колонку (layerDepth компонента).
// Обход — общее ядро computeLayerDepths, что и у страниц.

export function computeStepElementDepths(
  step: FormStep,
  logicRules: readonly LogicRule[],
): Map<string, number> {
  const ids = step.elements.map((component) => component.id as string);
  const edges: LayerEdge[] = logicRules.map((rule) => ({
    from: rule.sourceElementId,
    to: rule.targetElementId,
  }));
  const explicitDepths = new Map<string, number>();
  for (const component of step.elements) {
    if (component.layerDepth !== undefined) {
      explicitDepths.set(component.id, component.layerDepth);
    }
  }
  return computeLayerDepths(ids, edges, explicitDepths);
}

// Уровни элементов всех шагов всех форм: id элемента уникален в графе,
// поэтому карты шагов сливаются в одну (нужна командам — ADR-15 для элементов).
export function computeFormElementDepths(graph: ServiceGraph): Map<string, number> {
  const depths = new Map<string, number>();
  for (const form of graph.applicationForms) {
    for (const step of form.steps) {
      for (const [id, depth] of computeStepElementDepths(step, graph.logicRules)) {
        depths.set(id, depth);
      }
    }
  }
  return depths;
}
