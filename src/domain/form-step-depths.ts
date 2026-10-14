import type { ServiceGraph } from './model/service-graph';
import type { ApplicationForm } from './model/scenario';
import type { StepTransition } from './model/step-transition';
import { computeLayerDepths, type LayerEdge } from './layer-depths';

// Уровни (колонки) шагов формы заявки [owner 2026-10-14]: форма — такой же
// слоёный граф, как канвас страниц (computeGraphDepths): рёбра — переходы
// «шаг-владелец элемента → шаг-цель», шаг без входящих переходов — корень
// (уровень 0), явный layerDepth (перенос dnd, добавление шага, ADR-15) —
// фиксированный уровень. Несколько шагов одного уровня — ветвление (шаги
// «2» для разных вариантов Select'а шага «1») — стоят друг под другом,
// порядок внутри уровня — порядок массива шагов (как orderIndex у страниц).
// Обход — общее ядро computeLayerDepths.

export function computeFormStepDepths(
  form: Pick<ApplicationForm, 'steps'>,
  transitions: readonly StepTransition[],
): Map<string, number> {
  const ids = form.steps.map((step) => step.id as string);
  const elementStep = new Map<string, string>();
  for (const step of form.steps) {
    for (const element of step.elements) {
      elementStep.set(element.id, step.id);
    }
  }
  const edges: LayerEdge[] = [];
  for (const transition of transitions) {
    const from = elementStep.get(transition.sourceElementId);
    if (from) {
      edges.push({ from, to: transition.targetStepId });
    }
  }
  const explicitDepths = new Map<string, number>();
  for (const step of form.steps) {
    if (step.layerDepth !== undefined) {
      explicitDepths.set(step.id, step.layerDepth);
    }
  }
  return computeLayerDepths(ids, edges, explicitDepths);
}

// Уровни шагов всех форм: id шага уникален в графе, карты сливаются в одну
// (нужна командам — ADR-15 для шагов, правила переходов).
export function computeAllFormStepDepths(graph: ServiceGraph): Map<string, number> {
  const depths = new Map<string, number>();
  for (const form of graph.applicationForms) {
    for (const [id, depth] of computeFormStepDepths(form, graph.stepTransitions)) {
      depths.set(id, depth);
    }
  }
  return depths;
}

/** Уровень для нового шага формы — следующий за самым глубоким (как у страниц). */
export function nextFormStepLayerDepth(
  form: Pick<ApplicationForm, 'steps'>,
  transitions: readonly StepTransition[],
): number {
  const depths = [...computeFormStepDepths(form, transitions).values()];
  return depths.length === 0 ? 0 : Math.max(...depths) + 1;
}
