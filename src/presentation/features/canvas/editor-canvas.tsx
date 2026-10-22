import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
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
  Position,
  ViewportPortal,
  useReactFlow,
  useStoreApi,
  useViewport,
  type Connection,
  type EdgeChange,
  type IsValidConnection,
  type OnConnectStart,
  type XYPosition,
  type NodeChange,
  type OnNodeDrag,
} from '@xyflow/react';
// Только структурные стили react-flow (R-PERF-9): тема по умолчанию из
// style.css почти целиком перебивалась своей (react-flow-theme-styles).
import '@xyflow/react/dist/base.css';
import { useEditorTheme } from '@presentation/theme/editor-theme';
import { EDITOR_CONFIG } from '@presentation/app/editor-config';
import { useHotkeyHandlers } from '@presentation/features/hotkeys/hotkeys-provider';
import { useReactFlowThemeStyles } from './react-flow-theme-styles';
import {
  buildLayerColumns,
  nearestLayerColumn,
  resolveLayerDrop,
  type LayerColumn,
  type LayerDropDecision,
} from './layers/layer-columns';
import { PAGE_LAYER_POLICY } from './layers/layer-policy';
import { LayerDropHighlight } from './layers/layer-drop-highlight';
import { isActionTarget } from './canvas-events';
import { EditorCanvasControls } from './editor-canvas-controls';
import { canvasNodeTypes } from './nodes/node-types';
import { EditorConnectionLine, canvasEdgeTypes, editorEdgePath } from './canvas-edges';
import { EDGE_ARROW_MARKER_ID, type CanvasEdge, type CanvasNode } from './graph-flow-adapter';
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
  // Инструмент «Рука» (editor-config canvas.panTool): выделение заблокировано,
  // drag по канвасу (и по блокам) только двигает полотно.
  const [panMode, setPanMode] = useState(false);
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
  // либо отброшены). Синхронизация в рендере, а не в эффекте (R-PERF-4):
  // эффект давал второй рендер react-flow на каждую команду и кадр со
  // старыми узлами между ними.
  const [syncedNodes, setSyncedNodes] = useState(propsNodes);
  if (syncedNodes !== propsNodes) {
    setSyncedNodes(propsNodes);
    setNodes(withMeasured(propsNodes));
  }
  const [syncedEdges, setSyncedEdges] = useState(propsEdges);
  if (syncedEdges !== propsEdges) {
    setSyncedEdges(propsEdges);
    setEdges(propsEdges);
  }
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

  // Handles узла с новыми данными пересчитывает сам узел (useHandlesSync).

  // Центрирование на найденном узле (T-050). Задержка — react-flow мог ещё
  // не перемерить узел после смены выделения.
  const { fitView, screenToFlowPosition, deleteElements, getNodes, getEdges } = useReactFlow<
    CanvasNode,
    CanvasEdge
  >();
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
  // Колонки строятся один раз на старте drag (R-PERF-2): раскладка во время
  // drag не меняется, а пересборка по всем узлам на каждый кадр стоила O(N).
  const columnsRef = useRef<LayerColumn[]>([]);
  const handleNodeDragStart: OnNodeDrag<CanvasNode> = useCallback(() => {
    const measuredWidth = new Map(nodesRef.current.map((node) => [node.id, node.measured?.width]));
    columnsRef.current = buildLayerColumns(
      propsNodes.map((node) => ({
        depth: node.data.depth,
        x: node.position.x,
        width: measuredWidth.get(node.id) ?? PAGE_LAYER_POLICY.columnWidth,
      })),
      PAGE_LAYER_POLICY,
    );
  }, [propsNodes]);

  // Подсветка целевой колонки во время drag (F6) и запомненное решение —
  // в drop решение принимается по последнему кандидату.
  const [dropZone, setDropZone] = useState<{ x: number; width: number; blocked: boolean } | null>(null);
  const decisionRef = useRef<LayerDropDecision | null>(null);
  const nodeDepths = useMemo(
    () => new Map(propsNodes.map((node) => [node.id, node.data.depth])),
    [propsNodes],
  );

  const handleNodeDrag: OnNodeDrag<CanvasNode> = useCallback(
    (_event, draggedNode) => {
      const width = draggedNode.measured?.width ?? PAGE_LAYER_POLICY.columnWidth;
      const candidate = nearestLayerColumn(columnsRef.current, draggedNode.position.x + width / 2);
      const decision = resolveLayerDrop(
        PAGE_LAYER_POLICY,
        { id: draggedNode.id, kind: draggedNode.type ?? '', depth: draggedNode.data.depth },
        candidate,
        nodeDepths,
      );
      decisionRef.current = decision;
      // Своя колонка не подсвечивается — переноса нет, будет reorder по Y;
      // заполненная — подсвечивается запретом сразу, до броска ([owner 2026-10-16]).
      const next =
        decision.kind !== 'reorder' && candidate
          ? { x: candidate.x, width: candidate.width, blocked: decision.kind === 'blocked' }
          : null;
      // Новое состояние — только при смене колонки или решения (R-PERF-2): иначе
      // канвас перерисовывался на каждый кадр drag.
      setDropZone((current) =>
        current === next ||
        (current &&
          next &&
          current.x === next.x &&
          current.width === next.width &&
          current.blocked === next.blocked)
          ? current
          : next,
      );
    },
    [nodeDepths],
  );

  const handleNodeDragStop: OnNodeDrag<CanvasNode> = useCallback(
    (_event, draggedNode) => {
      setDropZone(null);
      columnsRef.current = [];
      const decision = decisionRef.current;
      decisionRef.current = null;
      // Возврат к раскладке: результат drag'а фиксирует команда, пересчитанные
      // узлы придут сверху; отклонённый drag не оставляет узел в брошенной позиции.
      setNodes(withMeasured(propsNodes));
      if (decision?.kind === 'blocked') {
        return;
      }
      if (decision?.kind === 'moveToLayer') {
        onMoveNodeToDepth?.(draggedNode.id, decision.depth);
        return;
      }
      // Порядок после drag определяется по Y среди узлов той же колонки
      // (глубина в data.depth — из адаптера), дальше — ReorderInLayer.
      const layerNodes = nodesRef.current.filter((node) => node.data.depth === draggedNode.data.depth);
      onReorderNode?.(draggedNode, layerNodes);
    },
    [onMoveNodeToDepth, onReorderNode, propsNodes, withMeasured],
  );

  // Единое удаление проекта (F5) — команда edit.delete системы хоткеев
  // [owner 2026-10-15]. Сначала выделенный элемент или шаг внутри узла; иначе
  // выделенные узлы и связи react-flow — через deleteElements: он зовёт те же
  // onNodesDelete/onEdgesDelete, что и штатная клавиша react-flow (она
  // отключена, deleteKeyCode={null}: клавиши читает только система хоткеев).
  const deleteSelection = useCallback((): boolean => {
    if (onDeleteSelectedElement?.()) {
      return true;
    }
    const selectedNodes = getNodes().filter((node) => node.selected);
    const selectedEdges = getEdges().filter((edge) => edge.selected);
    if (selectedNodes.length === 0 && selectedEdges.length === 0) {
      return false;
    }
    void deleteElements({ nodes: selectedNodes, edges: selectedEdges });
    return true;
  }, [deleteElements, getEdges, getNodes, onDeleteSelectedElement]);

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
  // Начало клик-связи — состояние (рисует линию), признак активности — ref:
  // обработчики не зависят от него и стабильны (R-PERF-1). Конец линии за
  // курсором ведёт сама ClickConnectionLine — канвас на движение мыши не
  // перерисовывается и не отдаёт react-flow новые пропсы каждый кадр.
  const store = useStoreApi();
  const [clickFrom, setClickFrom] = useState<XYPosition | null>(null);
  const clickActiveRef = useRef(false);
  const cancelClickConnection = useCallback(() => {
    if (clickActiveRef.current) {
      // Публичного API отмены клик-связи нет: cancelConnection режим не
      // сбрасывает (ревью A9, R4) — решение владельца оставить запись в стор;
      // реестр подмен, п.7 (проверять при обновлении react-flow).
      store.setState({ connectionClickStartHandle: null });
      clickActiveRef.current = false;
      setClickFrom(null);
      onConnectionEnd?.();
    }
  }, [store, onConnectionEnd]);

  // Вход в «Руку» обрывает начатую клик-связь: её цели станут недоступны мыши.
  const togglePanMode = useCallback(() => {
    cancelClickConnection();
    setPanMode((enabled) => !enabled);
  }, [cancelClickConnection]);

  // Клавиатурные команды канваса — только обработчики, комбинации задаёт
  // система хоткеев. Escape без клик-связи не обрабатывается (false).
  useHotkeyHandlers({
    'edit.delete': deleteSelection,
    'canvas.cancelConnection': () => {
      if (!clickActiveRef.current) {
        return false;
      }
      cancelClickConnection();
      return true;
    },
    'canvas.togglePanMode': () => {
      if (!EDITOR_CONFIG.canvas.panTool) {
        return false;
      }
      togglePanMode();
      return true;
    },
  });
  const handleClickConnectStart: OnConnectStart = useCallback(
    (event, params) => {
      onConnectionStart?.(params.handleId);
      const handle =
        event.target instanceof Element
          ? event.target.closest('.react-flow__handle')?.getBoundingClientRect()
          : null;
      if (handle) {
        // Линия выходит из правого края source-handle — как рёбра (Position.Right).
        clickActiveRef.current = true;
        setClickFrom(screenToFlowPosition({ x: handle.right, y: handle.top + handle.height / 2 }));
      }
    },
    [onConnectionStart, screenToFlowPosition],
  );
  // В клик-режиме нажатие мимо handle (принимающие handles допустимых целей
  // накрывают блок/элемент целиком) отменяет связь и больше ничего не делает:
  // ни выделения, ни pan полотна.
  const handlePointerDownCapture = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (
        clickActiveRef.current &&
        !(event.target instanceof Element && event.target.closest('.react-flow__handle'))
      ) {
        event.stopPropagation();
        cancelClickConnection();
      }
    },
    [cancelClickConnection],
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
      // Карточка элемента и вариант Select'а выделяют элемент сами — узел и
      // шаг не перевыделяем [owner 2026-10-16].
      if (!target || isActionTarget(target) || target.closest('[data-element-card], [data-option-card]')) {
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

  // Цель связи под курсором (R-PERF-6): один делегированный обработчик на
  // канвас для обоих режимов (drag и клик) пишет ключ сущности в стор —
  // подсветку рисует сама сущность (useEntityHighlight), без :hover в CSS и
  // без подписки каждого узла на стор react-flow.
  const highlightStore = interactionStore ?? STANDALONE_STORE;
  const handlePointerOver = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!connecting) {
        return;
      }
      const target =
        event.target instanceof Element ? event.target.closest('.editor-target-available') : null;
      highlightStore.setState({ connectHover: target?.getAttribute('data-highlight-key') ?? null });
    },
    [connecting, highlightStore],
  );
  // Курсор ушёл с канваса — цели под ним нет.
  const handlePointerLeave = useCallback(
    () => highlightStore.setState({ connectHover: null }),
    [highlightStore],
  );
  useEffect(() => {
    if (!connecting) {
      highlightStore.setState({ connectHover: null });
    }
  }, [connecting, highlightStore]);

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
    clickActiveRef.current = false;
    setClickFrom(null);
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
    // В режиме «Рука» узлы прозрачны для мыши: клик по блоку попадает в
    // полотно и не должен снимать выделение.
    if (panMode || pointerDownOnNodeRef.current) {
      return; // click «унаследован» от нажатия на узле — не клик по полотну
    }
    cancelClickConnection();
    onClearSelection?.();
  }, [panMode, cancelClickConnection, onClearSelection]);

  const rootClassName = [styles.root, connecting && 'editor-connecting', panMode && 'editor-pan-mode']
    .filter(Boolean)
    .join(' ');
  return (
    <div
      className={rootClassName}
      data-testid="editor-canvas"
      onPointerDownCapture={handlePointerDownCapture}
      onPointerDown={handlePointerDown}
      onPointerOver={handlePointerOver}
      onPointerLeave={handlePointerLeave}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={canvasNodeTypes}
        edgeTypes={canvasEdgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onConnectStart={handleConnectStart}
        onConnectEnd={handleConnectEnd}
        onClickConnectStart={handleClickConnectStart}
        onClickConnectEnd={handleClickConnectEnd}
        // Линия протягивания — того же вида, что рёбра между блоками
        // (общий путь canvas-edges, стиль .react-flow__connection-path), повторная приёмка, 4.
        connectionLineComponent={EditorConnectionLine}
        onReconnect={handleReconnect}
        onEdgesDelete={handleEdgesDelete}
        onNodesDelete={handleNodesDelete}
        onNodeDragStart={handleNodeDragStart}
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
        // Режим «Рука»: ни выделения (в т.ч. рамкой Shift+drag), ни drag и
        // связей — мышь только двигает полотно (стили editor-pan-mode).
        elementsSelectable={!panMode}
        nodesDraggable={!panMode}
        nodesConnectable={!panMode}
        selectionKeyCode={panMode ? null : 'Shift'}
        // Удаление — команда edit.delete системы хоткеев (deleteSelection выше).
        deleteKeyCode={null}
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
        {clickFrom ? <ClickConnectionLine from={clickFrom} /> : null}
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
          panMode={panMode}
          onTogglePanMode={EDITOR_CONFIG.canvas.panTool ? togglePanMode : undefined}
        />
      </ReactFlow>
    </div>
  );
}

// Линия связи в клик-режиме: тот же путь и тот же класс, что у линии
// протягивания (EditorConnectionLine), — визуально режимы не отличаются.
// ViewportPortal — слой полотна: координаты flow, pan/zoom применяются сами.
// Конец линии за курсором — своё состояние (R-PERF-1): на движение мыши
// перерисовывается только линия.
function ClickConnectionLine({ from }: { from: XYPosition }) {
  const { screenToFlowPosition } = useReactFlow();
  const [to, setTo] = useState(from);
  useEffect(() => {
    const follow = (event: PointerEvent) =>
      setTo(screenToFlowPosition({ x: event.clientX, y: event.clientY }));
    window.addEventListener('pointermove', follow);
    return () => window.removeEventListener('pointermove', follow);
  }, [screenToFlowPosition]);
  const path = editorEdgePath({
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
function DropZoneHighlight({ zone }: { zone: { x: number; width: number; blocked: boolean } }) {
  const { x: viewportX, zoom } = useViewport();
  return (
    <LayerDropHighlight left={zone.x * zoom + viewportX} width={zone.width * zoom} blocked={zone.blocked} />
  );
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
  reportElementRows: () => undefined,
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
