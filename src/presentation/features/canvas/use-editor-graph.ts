import { useCallback, useMemo, useRef, useState } from 'react';
import type { Connection } from '@xyflow/react';
import type { ServiceGraph } from '@domain/model/service-graph';
import {
  toElementId,
  toPageLinkId,
  type ElementId,
  type PageEntityId,
  type PageLinkId,
} from '@domain/model/ids';
import { PageLinkTargetIdSchema, type PageLinkTargetId } from '@domain/model/page-link';
import type { Command } from '@application/commands/command';
import { ConnectElements } from '@application/commands/connect-elements';
import { ReconnectElements } from '@application/commands/reconnect-elements';
import { DisconnectElements } from '@application/commands/disconnect-elements';
import { ReorderInLayer } from '@application/commands/reorder-in-layer';
import { walkPages } from '@application/commands/graph-lookup';
import { useContainer } from '@presentation/app/App';
import { useEditorNotifications } from '@presentation/features/notifications/editor-notifications';
import { computeLayout } from './canvas-layout';
import {
  flowConnectionToLink,
  flowNodesToLayerOrder,
  graphToFlow,
  type CanvasEdge,
  type CanvasNode,
} from './graph-flow-adapter';
import { createSampleGraph } from './sample-graph';

// TEMPORARY (до effector — запланирован, но не установлен): ServiceGraph живёт
// в React state страницы редактора. Мутации — ТОЛЬКО через
// commandBus.execute/undo/redo (конституция, железное правило 1); после каждой
// команды узлы/рёбра пересчитываются: computeLayout(graph) → positions →
// graphToFlow(graph, positions). Начальное значение — демо-граф (sample).
// При появлении effector хук заменяется подпиской на стор, публичная
// сигнатура сохраняется.
export function useEditorGraph() {
  const container = useContainer();
  const notifications = useEditorNotifications();
  const commandBus = container.cradle.commandBus;

  const [graph, setGraph] = useState<ServiceGraph>(() => createSampleGraph());
  // Актуальный граф в ref: колбэки react-flow не должны зависеть от замыканий
  // на устаревший state, а мутации идут только через CommandBus.
  const graphRef = useRef(graph);

  const positions = useMemo(() => computeLayout(graph), [graph]);
  const flow = useMemo(() => graphToFlow(graph, positions), [graph, positions]);

  const runCommand = useCallback(
    (command: Command) => {
      try {
        const next = commandBus.execute(graphRef.current, command);
        graphRef.current = next;
        setGraph(next);
      } catch (error) {
        // Отказы команд (несуществующая цель и т.п.) — единый Snackbar
        // страницы (T-023), своих снекбаров у канваса нет.
        notifications.showCommandFailure(error instanceof Error ? error.message : String(error));
      }
    },
    [commandBus, notifications],
  );

  // Создание связи drag'ом (T-032): Connection → поля связи (адаптер),
  // id — от IIdGenerator; слои доводит сама команда (D7, T-036).
  const connect = useCallback(
    (connection: Connection) => {
      const link = flowConnectionToLink(connection);
      if (!link) {
        return; // связь не от элемента (нет sourceHandle) — игнорируем
      }
      runCommand(
        new ConnectElements({
          id: toPageLinkId(container.cradle.idGenerator.next()),
          sourceElementId: link.sourceElementId,
          targetId: link.targetId,
        }),
      );
    },
    [container, runCommand],
  );

  // Переназначение существующей связи на другой источник/цель (T-032, D7/D13):
  // меняются только переданные концы, id связи стабилен.
  const reconnect = useCallback(
    (oldEdge: CanvasEdge, connection: Connection) => {
      const patch: { sourceElementId?: ElementId; targetId?: PageLinkTargetId } = {};
      if (connection.sourceHandle && connection.sourceHandle !== oldEdge.sourceHandle) {
        patch.sourceElementId = toElementId(connection.sourceHandle);
      }
      if (connection.target && connection.target !== oldEdge.target) {
        patch.targetId = PageLinkTargetIdSchema.parse(connection.target);
      }
      if (patch.sourceElementId === undefined && patch.targetId === undefined) {
        return; // концы не изменились — команда не нужна
      }
      runCommand(new ReconnectElements(toPageLinkId(oldEdge.id), patch));
    },
    [runCommand],
  );

  // Удаление связей (выделенное ребро + Delete/Backspace) — по команде на ребро.
  const disconnect = useCallback(
    (edges: CanvasEdge[]) => {
      for (const edge of edges) {
        runCommand(new DisconnectElements(toPageLinkId(edge.id as PageLinkId)));
      }
    },
    [runCommand],
  );

  // Переупорядочивание внутри слоя (T-036, D13): вертикальный drag узла,
  // порядок после drag — по Y через flowNodesToLayerOrder адаптера. Команда
  // ReorderInLayer вынимает страницу из общей последовательности orderIndex
  // и вставляет на целевую позицию — здесь вычисляем эту позицию так, чтобы
  // перетаскиваемый узел встал на своё место внутри колонки, а относительный
  // порядок остальных страниц не изменился.
  const reorderInLayer = useCallback(
    (draggedNode: CanvasNode, layerNodes: CanvasNode[]) => {
      const desiredLayerOrder = flowNodesToLayerOrder(layerNodes);
      const toSlot = desiredLayerOrder.indexOf(draggedNode.id as PageEntityId);
      if (toSlot < 0) {
        return;
      }

      const pages = [...walkPages(graphRef.current)].sort(
        (left, right) => left.orderIndex - right.orderIndex,
      );
      const layerIds = new Set(desiredLayerOrder as string[]);
      const currentLayerOrder = pages.filter((page) => layerIds.has(page.id)).map((page) => page.id);
      const fromSlot = currentLayerOrder.indexOf(draggedNode.id as PageEntityId);
      if (fromSlot < 0 || fromSlot === toSlot) {
        return; // порядок не изменился — команда не нужна
      }

      // Позиция в общей последовательности без перетаскиваемой страницы:
      // вставка перед страницей, занимающей целевой слот, либо в конец слоя.
      const globalIds = pages.map((page) => page.id as string).filter((id) => id !== draggedNode.id);
      const othersInLayer = currentLayerOrder.filter((id) => id !== draggedNode.id);
      const anchor =
        toSlot >= othersInLayer.length ? othersInLayer[othersInLayer.length - 1] : othersInLayer[toSlot];
      if (anchor === undefined) {
        return; // в колонке один узел
      }
      const anchorIndex = globalIds.indexOf(anchor);
      const targetOrderIndex = toSlot >= othersInLayer.length ? anchorIndex + 1 : anchorIndex;

      runCommand(new ReorderInLayer(draggedNode.id as PageEntityId, targetOrderIndex));
    },
    [runCommand],
  );

  const undo = useCallback(() => {
    const previous = commandBus.undo(graphRef.current);
    if (previous) {
      graphRef.current = previous;
      setGraph(previous);
    }
  }, [commandBus]);

  const redo = useCallback(() => {
    const next = commandBus.redo(graphRef.current);
    if (next) {
      graphRef.current = next;
      setGraph(next);
    }
  }, [commandBus]);

  return {
    nodes: flow.nodes,
    edges: flow.edges,
    hasNodes: flow.nodes.length > 0,
    connect,
    reconnect,
    disconnect,
    reorderInLayer,
    undo,
    redo,
    canUndo: commandBus.canUndo(),
    canRedo: commandBus.canRedo(),
  };
}
