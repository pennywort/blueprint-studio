import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  Background,
  BackgroundVariant,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  applyEdgeChanges,
  applyNodeChanges,
  ConnectionLineType,
  Position,
  ViewportPortal,
  getSmoothStepPath,
  useReactFlow,
  useStoreApi,
  useUpdateNodeInternals,
  useViewport,
  type Connection,
  type EdgeChange,
  type IsValidConnection,
  type OnConnectStart,
  type XYPosition,
  type NodeChange,
  type OnNodeDrag,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useEditorTheme } from '@presentation/theme/editor-theme';
import { useReactFlowThemeStyles } from './react-flow-theme-styles';
import {
  buildLayerColumns,
  nearestLayerColumn,
  resolveLayerDrop,
  type LayerColumn,
} from './layers/layer-columns';
import { PAGE_LAYER_POLICY, canMoveToLayer } from './layers/layer-policy';
import { LayerDropHighlight } from './layers/layer-drop-highlight';
import { isActionTarget } from './canvas-events';
import { EditorCanvasControls } from './editor-canvas-controls';
import { canvasNodeTypes } from './nodes/node-types';
import {
  EDGE_ARROW_MARKER_ID,
  type CanvasEdge,
  type CanvasNode,
  type CanvasNodeData,
} from './graph-flow-adapter';
import {
  CanvasInteractionProvider,
  createCanvasInteractionStore,
  type CanvasActions,
  type CanvasInteractionStore,
} from './canvas-interaction';

/**
 * Маркер-стрелка рёбер (дизайн): «галочка» из двух отрезков с круглыми
 * концами. context-stroke — цвет берётся у ребра (в т.ч. hover/selected),
 * литеральных цветов нет.
 */
function EdgeArrowMarkerDefs() {
  return (
    <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
      <defs>
        <marker
          id={EDGE_ARROW_MARKER_ID}
          viewBox="0 0 12 12"
          refX={10}
          refY={6}
          markerWidth={12}
          markerHeight={12}
          markerUnits="userSpaceOnUse"
          orient="auto"
        >
          <path
            d="M5 1 L10 6 L5 11"
            fill="none"
            stroke="context-stroke"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </marker>
      </defs>
    </svg>
  );
}

export type EditorCanvasProps = {
  /** Узлы и рёбра — из graphToFlow (T-030/T-031); канвас управляемый. */
  nodes?: CanvasNode[];
  edges?: CanvasEdge[];
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  /** Создание связи drag'ом из source-handle элемента (T-032). */
  onConnectLink?: (connection: Connection) => void;
  /** Переназначение существующей связи на другой источник/цель (T-032, D7). */
  onReconnectLink?: (oldEdge: CanvasEdge, connection: Connection) => void;
  /** Удаление выделенных связей (Delete/Backspace) (T-032). */
  onDeleteLinks?: (edges: CanvasEdge[]) => void;
  /** Вертикальный drag узла → переупорядочивание внутри слоя (T-036). */
  onReorderNode?: (draggedNode: CanvasNode, layerNodes: CanvasNode[]) => void;
  /** Узел брошен в другую колонку → перенос на другой уровень навигации (F6). */
  onMoveNodeToDepth?: (nodeId: string, depth: number) => void;
  /** Удаление выделенных узлов (Delete/Backspace) — каскад команд (F5, T-034). */
  onDeleteNodes?: (nodes: CanvasNode[]) => void;
  /**
   * Delete/Backspace с выделенным элементом внутри узла: удалить элемент.
   * Возвращает true, если нажатие обработано, — канвас гасит событие, чтобы
   * react-flow не удалил ещё и узел (единое удаление проекта, F5).
   */
  onDeleteSelectedElement?: () => boolean;
  /** Выделение узла на канвасе (клик) — цель меню добавления элементов (T-034). */
  /** stepId — шаг формы под нажатием (S10): цель меню элементов тулбара. */
  onSelectedNodeChange?: (nodeId: string | null, stepId?: string | null) => void;
  /** Клик по пустому полю канваса — снять выделение со всех сущностей. */
  onClearSelection?: () => void;
  /** Центрирование вьюпорта на узле — результат поиска (T-050). */
  focus?: { nodeId: string; nonce: number } | null;
  /** Протягивание связи началось (drag или клик по source-handle) — id handle-источника. */
  onConnectionStart?: (handleId: string | null | undefined) => void;
  /** Протягивание связи закончилось или отменено. */
  onConnectionEnd?: () => void;
  /** Допустима ли связь — доменное правило connectableTargets (через хук). */
  isConnectionAllowed?: (connection: Connection | CanvasEdge) => boolean;
  /** Идёт протягивание связи — курсор «прицел» на всём канвасе. */
  connecting?: boolean;
  /** Фактические размеры узлов после рендера — стек колонки по ним (N12). */
  onNodesMeasured?: (sizes: Record<string, { width: number; height: number }>) => void;
  /** Выделение, цель связи, нарушения — стор взаимодействия (ревью A4, R2). */
  interactionStore?: CanvasInteractionStore;
  /** Действия узлов и карточек (ревью A4, R2). */
  canvasActions?: CanvasActions;
};

// Стабильные пустые значения по умолчанию: литерал в дефолте параметра
// создавал бы новый массив на каждый рендер и зацикливал синхронизацию
// локального состояния с пропсами.
const EMPTY_NODES: CanvasNode[] = [];
const EMPTY_EDGES: CanvasEdge[] = [];

// Холст редактора поверх @xyflow/react (ADR-03). Управляемый режим: узлы и
// рёбра приходят сверху (graphToFlow + computeLayout), взаимодействия
// превращаются в команды через пропсы; локальный state нужен только для
// промежуточных состояний drag/выделения, до пересчёта из графа.
function CanvasInner({
  nodes: propsNodes = EMPTY_NODES,
  edges: propsEdges = EMPTY_EDGES,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onConnectLink,
  onReconnectLink,
  onDeleteLinks,
  onReorderNode,
  onMoveNodeToDepth,
  onDeleteNodes,
  onDeleteSelectedElement,
  onSelectedNodeChange,
  onClearSelection,
  onNodesMeasured,
  focus,
  onConnectionStart,
  onConnectionEnd,
  isConnectionAllowed,
  connecting,
  interactionStore,
}: EditorCanvasProps) {
  const theme = useEditorTheme();
  const styles = useReactFlowThemeStyles();
  // По макетам миникарта выключена по умолчанию, включается кнопкой панели.
  const [miniMapVisible, setMiniMapVisible] = useState(false);
  const canvas = theme.editor.canvas;

  // Измеренные react-flow размеры узлов (ревью P2/P4, R2): узел из
  // пересчёта приходит без measured, и react-flow перемерял бы ВСЕ узлы
  // (сброс handleBounds) — новые объекты узлов получают прошлый measured.
  // Кэш по объекту узла: неизменённый узел остаётся тем же объектом.
  const measuredRef = useRef(new Map<string, { width: number; height: number }>());
  const mergedRef = useRef(new WeakMap<CanvasNode, CanvasNode>());
  const withMeasured = useCallback((incoming: CanvasNode[]): CanvasNode[] => {
    return incoming.map((node) => {
      const measured = measuredRef.current.get(node.id);
      if (!measured || node.measured) {
        return node;
      }
      const cached = mergedRef.current.get(node);
      if (cached && cached.measured === measured) {
        return cached;
      }
      const merged = { ...node, measured };
      mergedRef.current.set(node, merged);
      return merged;
    });
  }, []);

  const [nodes, setNodes] = useState<CanvasNode[]>(propsNodes);
  const [edges, setEdges] = useState<CanvasEdge[]>(propsEdges);
  // Граф — источник правды: любой пересчёт из команды заменяет локальное
  // состояние целиком (позиции drag'а при этом либо зафиксированы командой,
  // либо отброшены).
  useEffect(() => setNodes(withMeasured(propsNodes)), [propsNodes, withMeasured]);
  useEffect(() => setEdges(propsEdges), [propsEdges]);
  // Выделение взаимоисключающее (F5): выбран узел или элемент — выделение
  // рёбер (оно у react-flow) снимается. До R2 его сбрасывал пересчёт рёбер
  // при каждом выделении; после структурного разделения рёбра те же
  // объекты, и связь оставалась выделенной вместе с блоком. Подписка на
  // стор без перерисовки канваса (ревью P3, R2).
  useEffect(() => {
    const store = interactionStore ?? STANDALONE_STORE;
    let { selectedNodeId, selectedElementId } = store.getState();
    return store.subscribe(() => {
      const state = store.getState();
      const changed =
        state.selectedNodeId !== selectedNodeId || state.selectedElementId !== selectedElementId;
      selectedNodeId = state.selectedNodeId;
      selectedElementId = state.selectedElementId;
      if (changed && (selectedNodeId !== null || selectedElementId !== null)) {
        setEdges((current) =>
          current.some((edge) => edge.selected)
            ? current.map((edge) => (edge.selected ? { ...edge, selected: false } : edge))
            : current,
        );
      }
    });
  }, [interactionStore]);
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  // Handles пересчитываются только у узлов с новыми данными (ревью P4, R2):
  // их карточки могли сдвинуться при том же размере узла; остальные узлы
  // сохраняют measured и handleBounds.
  const updateNodeInternals = useUpdateNodeInternals();
  const nodeDataRef = useRef(new Map<string, CanvasNodeData>());
  useEffect(() => {
    const changed: string[] = [];
    const next = new Map<string, CanvasNodeData>();
    for (const node of propsNodes) {
      const previous = nodeDataRef.current.get(node.id);
      if (previous !== undefined && previous !== node.data) {
        changed.push(node.id);
      }
      next.set(node.id, node.data);
    }
    nodeDataRef.current = next;
    if (changed.length > 0) {
      updateNodeInternals(changed);
    }
  }, [propsNodes, updateNodeInternals]);

  // Центрирование на найденном узле (T-050). Задержка — react-flow мог ещё
  // не перемерить узел после смены выделения.
  const { fitView, screenToFlowPosition } = useReactFlow();
  useEffect(() => {
    if (!focus) {
      return;
    }
    const timer = setTimeout(() => {
      void fitView({ nodes: [{ id: focus.nodeId }], duration: 400, maxZoom: 1, padding: 0.2 });
    }, 80);
    return () => clearTimeout(timer);
  }, [focus, fitView]);

  // Свободного размещения нет: колонка узла — уровень навигации (F2/F6),
  // но во время drag узел свободно следует за курсором. В drop решаем по
  // ближайшей колонке: та же колонка — переупорядочивание по Y (T-036),
  // другая — перенос на другой уровень (SetPageLayerDepth). Несостоявшийся
  // drag откатывается возвратом к propsNodes — узел не остаётся в брошенной
  // позиции.
  const onNodesChange = useCallback(
    (changes: NodeChange<CanvasNode>[]) => {
      // Удаление узлов — команды RemoveScenario/RemoveForm (T-034), remove-
      // изменения здесь не применяем: удаление идёт через onNodesDelete.
      // select-изменения тоже не применяем: выделение узла управляется
      // хуком (selected в пропсах, нажатие мыши), иначе локальное состояние
      // расходится с пропсами и выделение «качается» (N6).
      setNodes((current) =>
        applyNodeChanges(
          changes.filter((change) => change.type !== 'remove' && change.type !== 'select'),
          current,
        ),
      );
      const sizes: Record<string, { width: number; height: number }> = {};
      for (const change of changes) {
        if (change.type === 'dimensions' && change.dimensions) {
          sizes[change.id] = change.dimensions;
          measuredRef.current.set(change.id, change.dimensions);
        }
      }
      if (Object.keys(sizes).length > 0) {
        onNodesMeasured?.(sizes);
      }
    },
    [onNodesMeasured],
  );

  const onEdgesChange = useCallback((changes: EdgeChange<CanvasEdge>[]) => {
    // Удаление связей идёт через onEdgesDelete → DisconnectElements.
    setEdges((current) =>
      applyEdgeChanges(
        changes.filter((change) => change.type !== 'remove'),
        current,
      ),
    );
  }, []);

  // Колонки уровней из текущей раскладки — общее ядро слоёв (layers/):
  // полосы узлов → колонки + пустой слот «следующий уровень» (F6).
  // Ширина — фактическая (measured из локального состояния): у формы она
  // больше nodeWidth, и по оценке центр её колонки «уезжал» — узел,
  // брошенный на место, уходил на следующий уровень и терял связи.
  const findColumnCandidate = useCallback(
    (x: number): LayerColumn | null => {
      const measuredWidth = new Map(nodesRef.current.map((node) => [node.id, node.measured?.width]));
      const columns = buildLayerColumns(
        propsNodes.map((node) => ({
          depth: node.data.depth,
          x: node.position.x,
          width: measuredWidth.get(node.id) ?? PAGE_LAYER_POLICY.columnWidth,
        })),
        PAGE_LAYER_POLICY,
      );
      return nearestLayerColumn(columns, x);
    },
    [propsNodes],
  );

  // Подсветка целевой колонки во время drag (F6) и запомненная глубина
  // кандидата — в drop решение принимается по последнему кандидату.
  const [dropZone, setDropZone] = useState<{ x: number; width: number } | null>(null);
  const candidateDepthRef = useRef<number | null>(null);

  const handleNodeDrag: OnNodeDrag<CanvasNode> = useCallback(
    (_event, draggedNode) => {
      const width = draggedNode.measured?.width ?? PAGE_LAYER_POLICY.columnWidth;
      const candidate = findColumnCandidate(draggedNode.position.x + width / 2);
      const decision = resolveLayerDrop(
        draggedNode.data.depth,
        candidate,
        canMoveToLayer(PAGE_LAYER_POLICY, draggedNode.type ?? ''),
      );
      candidateDepthRef.current = decision.kind === 'moveToLayer' ? decision.depth : null;
      // Своя колонка не подсвечивается — переноса нет, будет reorder по Y.
      setDropZone(
        decision.kind === 'moveToLayer' && candidate ? { x: candidate.x, width: candidate.width } : null,
      );
    },
    [findColumnCandidate],
  );

  const handleNodeDragStop: OnNodeDrag<CanvasNode> = useCallback(
    (_event, draggedNode) => {
      setDropZone(null);
      const candidateDepth = candidateDepthRef.current;
      candidateDepthRef.current = null;
      // Возврат к раскладке: результат drag'а фиксирует команда, пересчитанные
      // узлы придут сверху; отклонённый drag не оставляет узел в брошенной позиции.
      setNodes(withMeasured(propsNodes));
      if (candidateDepth !== null) {
        onMoveNodeToDepth?.(draggedNode.id, candidateDepth);
        return;
      }
      // Порядок после drag определяется по Y среди узлов той же колонки
      // (глубина в data.depth — из адаптера), дальше — ReorderInLayer.
      const layerNodes = nodesRef.current.filter((node) => node.data.depth === draggedNode.data.depth);
      onReorderNode?.(draggedNode, layerNodes);
    },
    [onMoveNodeToDepth, onReorderNode, propsNodes, withMeasured],
  );

  // Единое удаление проекта (F5): выделение + Delete/Backspace. Сначала шанс
  // выделенному элементу внутри узла; если его нет — событие доходит до
  // react-flow, который удаляет выделенные узлы (onNodesDelete) и связи
  // (onEdgesDelete). Capture-фаза + stopPropagation: иначе react-flow удалил
  // бы ещё и узел, в котором лежал элемент.
  const handleKeyDownCapture = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.key !== 'Delete' && event.key !== 'Backspace') {
        return;
      }
      if (onDeleteSelectedElement?.()) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    [onDeleteSelectedElement],
  );

  // Допустимость связи — доменное правило connectableTargets через хук
  // (isConnectionAllowed): один источник правды с подсветкой целей.
  const isValidConnection: IsValidConnection<CanvasEdge> = useCallback(
    (connection) => isConnectionAllowed?.(connection) ?? false,
    [isConnectionAllowed],
  );

  // Связь «кликом» (connectOnClick react-flow: клик по source-handle, затем
  // клик по блоку/элементу-цели): react-flow в этом режиме линию не рисует —
  // рисуем сами (ClickConnectionLine) в координатах полотна, чтобы линия не
  // зависела от позиционирования обёртки и pan/zoom (повторная приёмка, 5.1).
  const store = useStoreApi();
  const [clickLine, setClickLine] = useState<{ from: XYPosition; to: XYPosition } | null>(null);
  const cancelClickConnection = useCallback(() => {
    if (clickLine) {
      // Публичного API отмены клик-связи нет: cancelConnection режим не
      // сбрасывает (ревью A9, R4) — решение владельца оставить запись в стор;
      // реестр подмен, п.7 (проверять при обновлении react-flow).
      store.setState({ connectionClickStartHandle: null });
      setClickLine(null);
      onConnectionEnd?.();
    }
  }, [clickLine, store, onConnectionEnd]);
  const handleClickConnectStart: OnConnectStart = useCallback(
    (event, params) => {
      onConnectionStart?.(params.handleId);
      const handle =
        event.target instanceof Element
          ? event.target.closest('.react-flow__handle')?.getBoundingClientRect()
          : null;
      if (handle) {
        // Линия выходит из правого края source-handle — как рёбра (Position.Right).
        const from = screenToFlowPosition({ x: handle.right, y: handle.top + handle.height / 2 });
        setClickLine({ from, to: from });
      }
    },
    [onConnectionStart, screenToFlowPosition],
  );
  // В клик-режиме нажатие мимо handle (принимающие handles допустимых целей
  // накрывают блок/элемент целиком) отменяет связь и больше ничего не делает:
  // ни выделения, ни pan полотна.
  const handlePointerDownCapture = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (clickLine && !(event.target instanceof Element && event.target.closest('.react-flow__handle'))) {
        event.stopPropagation();
        cancelClickConnection();
      }
    },
    [clickLine, cancelClickConnection],
  );

  // Выделение — по нажатию мыши, а не по click (повторная приёмка: «лаг» и
  // пропуски): click react-flow гасится при малейшем сдвиге мыши (порог
  // drag), а нажатие срабатывает сразу. Карточка элемента выделяет себя
  // сама; кнопки и коннекторы выделение не меняют (баг 2).
  // Нажатие началось на узле: механизм drag react-flow отдаёт pointerup и
  // click полотну (pane), и onPaneClick снимал только что сделанное
  // выделение — «пропуски» при перекликивании (повторная приёмка).
  const pointerDownOnNodeRef = useRef(false);
  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const target = event.target instanceof Element ? event.target : null;
      pointerDownOnNodeRef.current = target?.closest('.react-flow__node') != null;
      if (!target || isActionTarget(target) || target.closest('[data-element-card]')) {
        return;
      }
      const nodeId = target.closest('.react-flow__node')?.getAttribute('data-id');
      if (nodeId) {
        // Нажатие внутри шага формы выделяет и шаг (S10).
        onSelectedNodeChange?.(
          nodeId,
          target.closest('[data-form-step-id]')?.getAttribute('data-form-step-id'),
        );
      }
    },
    [onSelectedNodeChange],
  );

  // Обработчики react-flow стабильны (ревью P3, R2): новая функция в пропсе
  // ReactFlow обновляет его стор, и все подписчики (тысячи handles стенда)
  // перепроверяют селекторы.
  const handleConnect = useCallback((connection: Connection) => onConnectLink?.(connection), [onConnectLink]);
  const handleConnectStart: OnConnectStart = useCallback(
    (_event, params) => onConnectionStart?.(params.handleId),
    [onConnectionStart],
  );
  const handleConnectEnd = useCallback(() => onConnectionEnd?.(), [onConnectionEnd]);
  const handleClickConnectEnd = useCallback(() => {
    setClickLine(null);
    onConnectionEnd?.();
  }, [onConnectionEnd]);
  const handleReconnect = useCallback(
    (oldEdge: CanvasEdge, connection: Connection) => onReconnectLink?.(oldEdge, connection),
    [onReconnectLink],
  );
  const handleEdgesDelete = useCallback((deleted: CanvasEdge[]) => onDeleteLinks?.(deleted), [onDeleteLinks]);
  const handleNodesDelete = useCallback((deleted: CanvasNode[]) => onDeleteNodes?.(deleted), [onDeleteNodes]);
  const handleEdgeClick = useCallback(() => onClearSelection?.(), [onClearSelection]);
  const handlePaneClick = useCallback(() => {
    if (pointerDownOnNodeRef.current) {
      return; // click «унаследован» от нажатия на узле — не клик по полотну
    }
    cancelClickConnection();
    onClearSelection?.();
  }, [cancelClickConnection, onClearSelection]);

  return (
    <div
      className={connecting ? `${styles.root} editor-connecting` : styles.root}
      data-testid="editor-canvas"
      onKeyDownCapture={(event) => {
        if (event.key === 'Escape') {
          cancelClickConnection();
        }
        handleKeyDownCapture(event);
      }}
      onPointerDownCapture={handlePointerDownCapture}
      onPointerDown={handlePointerDown}
      onPointerMove={(event) => {
        if (clickLine) {
          setClickLine({
            from: clickLine.from,
            to: screenToFlowPosition({ x: event.clientX, y: event.clientY }),
          });
        }
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={canvasNodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onConnectStart={handleConnectStart}
        onConnectEnd={handleConnectEnd}
        onClickConnectStart={handleClickConnectStart}
        onClickConnectEnd={handleClickConnectEnd}
        // Линия протягивания — того же вида, что рёбра между блоками
        // (smoothstep, стиль .react-flow__connection-path), повторная приёмка, 4.
        connectionLineType={ConnectionLineType.SmoothStep}
        onReconnect={handleReconnect}
        onEdgesDelete={handleEdgesDelete}
        onNodesDelete={handleNodesDelete}
        onNodeDrag={handleNodeDrag}
        onNodeDragStop={handleNodeDragStop}
        // Клик по связи выделяет только её (выделение рёбер — у react-flow).
        onEdgeClick={handleEdgeClick}
        onPaneClick={handlePaneClick}
        isValidConnection={isValidConnection}
        // Рёбра всегда над блоками, в том числе выделенными (N8): react-flow
        // по умолчанию поднимает выделенный узел на z-index 1000 — выше слоя
        // рёбер. Узлы на канвасе не перекрываются, подъём не нужен.
        elevateNodesOnSelect={false}
        deleteKeyCode={['Backspace', 'Delete']}
        // Штатный порог drag react-flow: микросдвиг мыши при клике по блоку
        // не начинает перетаскивание (повторная приёмка, 1).
        nodeDragThreshold={5}
        // Мин. зум 10% вместо дефолтных 50% react-flow (замечание владельца 2026-10-13).
        minZoom={0.1}
        colorMode="light"
        fitView
      >
        <EdgeArrowMarkerDefs />
        {dropZone ? <DropZoneHighlight zone={dropZone} /> : null}
        {clickLine ? <ClickConnectionLine from={clickLine.from} to={clickLine.to} /> : null}
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.5}
          color={canvas.dots}
          bgColor={canvas.background}
        />
        {miniMapVisible ? (
          <MiniMap
            pannable
            zoomable
            bgColor={canvas.minimapBackground}
            nodeColor={canvas.minimapNode}
            maskColor={canvas.minimapMask}
          />
        ) : null}
        <EditorCanvasControls
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={onUndo}
          onRedo={onRedo}
          miniMapVisible={miniMapVisible}
          onToggleMiniMap={() => setMiniMapVisible((visible) => !visible)}
        />
      </ReactFlow>
    </div>
  );
}

// Линия связи в клик-режиме: тот же путь smoothstep и тот же класс, что у
// штатной линии протягивания react-flow, — визуально режимы не отличаются.
// ViewportPortal — слой полотна: координаты flow, pan/zoom применяются сами.
function ClickConnectionLine({ from, to }: { from: XYPosition; to: XYPosition }) {
  const [path] = getSmoothStepPath({
    sourceX: from.x,
    sourceY: from.y,
    sourcePosition: Position.Right,
    targetX: to.x,
    targetY: to.y,
    targetPosition: Position.Left,
  });
  return (
    <ViewportPortal>
      <svg
        className="react-flow__connectionline"
        style={{ position: 'absolute', overflow: 'visible', width: 1, height: 1, pointerEvents: 'none' }}
      >
        <path className="react-flow__connection-path" d={path} fill="none" />
      </svg>
    </ViewportPortal>
  );
}

// Полоса-подсветка целевой колонки dnd (F6): координаты flow переводятся
// в экранные через useViewport (pan/zoom); сама полоса — общая для слоёв.
function DropZoneHighlight({ zone }: { zone: { x: number; width: number } }) {
  const { x: viewportX, zoom } = useViewport();
  return <LayerDropHighlight left={zone.x * zoom + viewportX} width={zone.width * zoom} />;
}

// Без внешнего стора (изолированный рендер канваса) — свой пустой.
const STANDALONE_STORE = createCanvasInteractionStore();
const NO_ACTIONS: CanvasActions = {
  selectElement: () => undefined,
  toggleComplexLogic: () => undefined,
  removeNode: () => undefined,
  addElementToStep: () => undefined,
  removeStep: () => undefined,
  addFormStep: () => undefined,
  moveStep: () => undefined,
  swapSteps: () => undefined,
  moveElement: () => undefined,
  elementKindOptions: [],
};

// memo: выделение элемента меняет состояние страницы, но не пропсы
// канваса — канвас и react-flow не перерисовываются (ревью P3, R2).
export const EditorCanvas = memo(function EditorCanvas(props: EditorCanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInteractionProvider
        store={props.interactionStore ?? STANDALONE_STORE}
        actions={props.canvasActions ?? NO_ACTIONS}
      >
        <CanvasInner {...props} />
      </CanvasInteractionProvider>
    </ReactFlowProvider>
  );
});
