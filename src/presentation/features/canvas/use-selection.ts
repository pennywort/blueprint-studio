import { useCallback, useMemo, useState } from 'react';
import type { ServiceGraph } from '@domain/model/service-graph';
import type { CanvasElement } from '@domain/model/canvas-element';
import type { LogicRuleId } from '@domain/model/ids';
import { findElementLocation, findFormElement } from '@application/commands/graph-lookup';

// Данные инспектора для выделенного элемента: сам компонент формы + его
// правила видимости, где он — цель (T-067).
export type SelectedElementInfo = {
  component: CanvasElement;
  /** Элемент лежит в шаге формы — только там возможна «Сложная логика» (L-I5). */
  inFormStep: boolean;
  incomingRules: { ruleId: LogicRuleId; sourceLabel: string; optionLabel: string | null }[];
};

// Выделение на канвасе (ревью A3, R3): узел, шаг формы и элемент.
// Выделение узла и элемента взаимоисключающи — последний клик побеждает
// (единое правило проекта: выделение + Delete, F5/ADR-12).
export function useSelection(graph: ServiceGraph) {
  // Выделенный узел (клик): цель меню добавления элементов тулбара (T-034).
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  // Выделенный элемент внутри узла: Delete/Backspace удаляет именно его.
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  // Выделенный шаг формы (S10): меню элементов тулбара добавляет в него.
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);

  // Выделение узлов — только явным нажатием на узел (канвас); собственное
  // выделение react-flow игнорируется — иначе выделение «качалось» между
  // узлом и элементом до Maximum update depth (N6, повторная приёмка).
  const selectNode = useCallback((nodeId: string | null, stepId: string | null = null) => {
    setSelectedNodeId(nodeId);
    setSelectedStepId(nodeId !== null ? stepId : null);
    if (nodeId !== null) {
      setSelectedElementId(null);
    }
  }, []);
  const selectElement = useCallback((elementId: string | null) => {
    setSelectedElementId(elementId);
    if (elementId !== null) {
      setSelectedNodeId(null);
    }
  }, []);
  // Клик по пустому полю: снимает выделение со всего (выделение держится
  // на сущности, пока не выбрана другая).
  const clearSelection = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedElementId(null);
  }, []);
  // Удалённый узел больше не выделен.
  const forgetNode = useCallback((nodeId: string) => {
    setSelectedNodeId((current) => (current === nodeId ? null : current));
  }, []);

  // Выделенный элемент + его правила видимости (цель) — данные панели
  // атрибутов (T-041/T-067). Любой вид элемента (ADR-17).
  const selectedElement = useMemo<SelectedElementInfo | null>(() => {
    if (!selectedElementId) {
      return null;
    }
    const location = findElementLocation(graph, selectedElementId);
    const component = location?.list[location.index];
    if (!location || !component) {
      return null;
    }
    const incomingRules = graph.logicRules
      .filter((rule) => rule.targetElementId === selectedElementId)
      .map((rule) => {
        const source = findFormElement(graph, rule.sourceElementId)?.element;
        const sourceLabel = source && 'label' in source ? source.label : (source?.kind ?? 'Элемент');
        let optionLabel: string | null = null;
        if (rule.condition.kind === 'optionSelected' && source?.kind === 'selectList') {
          optionLabel =
            source.options.find((option) => option.value === rule.condition.optionId)?.label ?? null;
        }
        return { ruleId: rule.id, sourceLabel, optionLabel };
      });
    return {
      component,
      inFormStep: location.container.kind === 'formStep',
      incomingRules,
    };
  }, [graph, selectedElementId]);

  return {
    selectedNodeId,
    selectedElementId,
    selectedStepId,
    selectedElement,
    selectNode,
    selectElement,
    clearSelection,
    forgetNode,
  };
}
