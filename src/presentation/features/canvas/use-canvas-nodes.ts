import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ServiceGraph } from '@domain/model/service-graph';
import type { ConnectableTargets } from '@domain/connection-rules';
import { validateGraph } from '@domain/invariants';
import { computeLayout, type MeasuredNodeSizes } from './canvas-layout';
import { graphToFlow, type CanvasNode, type FlowGraph } from './graph-flow-adapter';
import { mapViolationsToCanvas } from './violation-markers';
import { createCanvasInteractionStore } from './canvas-interaction';

// Узлы и рёбра канваса (ревью A3, R3): раскладка по измеренным размерам,
// graphToFlow со структурным разделением, выделение узла и синхронизация
// стора взаимодействия (выделение, цель связи, нарушения, reveal поиска).
export function useCanvasNodes(
  graph: ServiceGraph,
  interaction: {
    selectedNodeId: string | null;
    selectedElementId: string | null;
    selectedStepId: string | null;
    connectionTargets: ConnectableTargets | null;
  },
) {
  const { selectedNodeId, selectedElementId, selectedStepId, connectionTargets } = interaction;
  // Фактические размеры узлов от react-flow (N12): стек колонки строится по
  // ним, чтобы зазор между узлами был ровно rowGap. Обновляется только при
  // реальном изменении (> 1px) — иначе пересчёт раскладки зациклился бы.
  // Измерения копятся за кадр и применяются одним проходом раскладки
  // (ревью P2, R2): react-flow присылает размеры пачками, и каждая пачка
  // раньше давала полную раскладку (44 раскладки на загрузке стенда).
  const [measuredSizes, setMeasuredSizes] = useState<MeasuredNodeSizes>({});
  const pendingSizesRef = useRef<Record<string, { width: number; height: number }>>({});
  const sizesFrameRef = useRef<number | null>(null);
  const reportNodeSizes = useCallback((sizes: MeasuredNodeSizes) => {
    Object.assign(pendingSizesRef.current, sizes);
    if (sizesFrameRef.current !== null) {
      return;
    }
    sizesFrameRef.current = requestAnimationFrame(() => {
      sizesFrameRef.current = null;
      const pending = pendingSizesRef.current;
      pendingSizesRef.current = {};
      setMeasuredSizes((current) => {
        let changed = false;
        const next = { ...current };
        for (const [id, size] of Object.entries(pending)) {
          const previous = current[id];
          if (
            !previous ||
            Math.abs(previous.width - size.width) > 1 ||
            Math.abs(previous.height - size.height) > 1
          ) {
            next[id] = size;
            changed = true;
          }
        }
        return changed ? next : current;
      });
    });
  }, []);
  useEffect(
    () => () => {
      if (sizesFrameRef.current !== null) {
        cancelAnimationFrame(sizesFrameRef.current);
      }
    },
    [],
  );

  const positions = useMemo(() => computeLayout(graph, measuredSizes), [graph, measuredSizes]);
  // Структурное разделение (ревью P1, R2): прошлый результат передаётся в
  // адаптер — неизменённые узлы, data, карточки и рёбра сохраняют
  // идентичность, смена позиции не пересоздаёт data.
  const previousFlowRef = useRef<FlowGraph | undefined>(undefined);
  const flow = useMemo(() => {
    const next = graphToFlow(graph, positions, previousFlowRef.current);
    previousFlowRef.current = next;
    return next;
  }, [graph, positions]);
  // Нарушения инвариантов после каждой команды (T-043): подсветка узлов и
  // карточек. Команды отклоняют невалидные изменения, поэтому в обычной
  // работе список пуст; подсветка нужна для графов извне (загрузка, T-053).
  const violationMarkers = useMemo(() => mapViolationsToCanvas(graph, validateGraph(graph)), [graph]);

  // Состояние взаимодействия — во внешний стор канваса, не в data узлов
  // (ревью A4/P3, R2): узлы и карточки подписаны селектором и перерисовываются
  // только при смене своего значения. Синхронизация до отрисовки кадра.
  const [interactionStore] = useState(createCanvasInteractionStore);
  useLayoutEffect(() => {
    interactionStore.setState({
      selectedNodeId,
      selectedElementId,
      selectedStepId,
      connectionTargets,
      violations: violationMarkers,
    });
  }, [
    interactionStore,
    selectedNodeId,
    selectedElementId,
    selectedStepId,
    connectionTargets,
    violationMarkers,
  ]);

  // Выделение узла управляется отсюда (N6; взаимоисключение с элементом,
  // F5): новый объект — только у выделенного узла, data общая.
  const nodes = useMemo<CanvasNode[]>(() => {
    const selectedId = selectedElementId === null ? selectedNodeId : null;
    if (selectedId === null) {
      return flow.nodes;
    }
    return flow.nodes.map((node) => (node.id === selectedId ? { ...node, selected: true } : node));
  }, [flow.nodes, selectedNodeId, selectedElementId]);

  return { nodes, edges: flow.edges, flowNodes: flow.nodes, reportNodeSizes, interactionStore };
}
