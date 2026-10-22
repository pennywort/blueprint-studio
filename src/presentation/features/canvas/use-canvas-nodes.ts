import { useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ServiceGraph } from '@domain/model/service-graph';
import type { ConnectableTargets } from '@domain/connection-rules';
import { collectViolations } from '@domain/invariants';
import { computeLayout, type MeasuredNodeSizes } from './canvas-layout';
import { graphToFlow, type CanvasNode, type FlowGraph } from './graph-flow-adapter';
import { mapViolationsToCanvas } from './violation-markers';
import { createCanvasInteractionStore } from './canvas-interaction';
import { useElementCatalog } from '@presentation/features/element-catalog/element-catalog';

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
  const [measuredSizes, reportSizes] = useMeasuredBatch<{ width: number; height: number }>(
    (left, right) => Math.abs(left.width - right.width) <= 1 && Math.abs(left.height - right.height) <= 1,
  );
  // Строки элементов узлов страниц (верх и высота без отступов) — якоря
  // выравнивания блоков-целей ([owner 2026-10-16]); копятся так же.
  const [measuredRows, reportElementRows] = useMeasuredBatch<{ top: number; height: number }>(
    (left, right) => Math.abs(left.top - right.top) <= 1 && Math.abs(left.height - right.height) <= 1,
  );
  // Высота узла в раскладке — без отступов строк, которые раскладка же и
  // дала: иначе отступы вошли бы в размер и раскладка «раскачивалась».
  const previousFlowRef = useRef<FlowGraph | undefined>(undefined);
  // Текст карточек и подписи видов — из описаний элементов (схема + политика).
  const catalog = useElementCatalog();
  const reportNodeSizes = useCallback(
    (sizes: MeasuredNodeSizes) => {
      const natural: Record<string, { width: number; height: number }> = {};
      // Индекс по id (R-PERF-3): пачка замеров на загрузке — все узлы, find в цикле давал O(N²).
      const byId = new Map(previousFlowRef.current?.nodes.map((node) => [node.id, node]));
      for (const [id, size] of Object.entries(sizes)) {
        const node = byId.get(id);
        const offsets = node?.data.elements.reduce((sum, element) => sum + (element.rowOffset ?? 0), 0) ?? 0;
        natural[id] = { width: size.width, height: size.height - offsets };
      }
      reportSizes(natural);
    },
    [reportSizes],
  );

  const layout = useMemo(
    () => computeLayout(graph, measuredSizes, measuredRows),
    [graph, measuredSizes, measuredRows],
  );
  // Структурное разделение (ревью P1, R2): прошлый результат передаётся в
  // адаптер — неизменённые узлы, data, карточки и рёбра сохраняют
  // идентичность, смена позиции не пересоздаёт data.
  const flow = useMemo(() => {
    const next = graphToFlow(graph, catalog, layout, previousFlowRef.current);
    previousFlowRef.current = next;
    return next;
  }, [graph, catalog, layout]);
  // Нарушения инвариантов после каждой команды (T-043): подсветка узлов и
  // карточек. Команды отклоняют невалидные изменения, поэтому в обычной
  // работе список пуст; подсветка нужна для графов извне (загрузка, T-053).
  // Отложенный граф (R-PERF-5): полная проверка идёт фоновым рендером после
  // кадра команды, а не в нём.
  const violationsGraph = useDeferredValue(graph);
  const violationMarkers = useMemo(
    () => mapViolationsToCanvas(violationsGraph, collectViolations(violationsGraph)),
    [violationsGraph],
  );

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

  return {
    nodes,
    edges: flow.edges,
    flowNodes: flow.nodes,
    reportNodeSizes,
    reportElementRows,
    interactionStore,
  };
}

// Замеры после рендера, накопленные за кадр (ревью P2, R2): react-flow и
// узлы присылают их пачками, а каждая пачка раньше давала полную раскладку
// (44 раскладки на загрузке стенда). Состояние меняется только при реальном
// изменении (same — допуск 1px), иначе пересчёт раскладки зациклился бы.
function useMeasuredBatch<T>(
  same: (left: T, right: T) => boolean,
): [Readonly<Record<string, T>>, (values: Readonly<Record<string, T>>) => void] {
  const [measured, setMeasured] = useState<Readonly<Record<string, T>>>({});
  const pendingRef = useRef<Record<string, T>>({});
  const frameRef = useRef<number | null>(null);
  const sameRef = useRef(same);
  const report = useCallback((values: Readonly<Record<string, T>>) => {
    Object.assign(pendingRef.current, values);
    if (frameRef.current !== null) {
      return;
    }
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      const pending = pendingRef.current;
      pendingRef.current = {};
      setMeasured((current) => {
        let changed = false;
        const next = { ...current };
        for (const [id, value] of Object.entries(pending)) {
          const previous = current[id];
          if (previous === undefined || !sameRef.current(previous, value)) {
            next[id] = value;
            changed = true;
          }
        }
        return changed ? next : current;
      });
    });
  }, []);
  useEffect(
    () => () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    },
    [],
  );
  return [measured, report];
}
