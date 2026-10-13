import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import {
  Background,
  BackgroundVariant,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
  useViewport,
  type Connection,
  type EdgeChange,
  type IsValidConnection,
  type NodeChange,
  type OnNodeDrag,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useEditorTheme } from '@presentation/theme/editor-theme';
import { useReactFlowThemeStyles } from './react-flow-theme-styles';
import { CANVAS_LAYOUT } from './canvas-layout';
import { isActionTarget } from './canvas-events';
import { EditorCanvasControls } from './editor-canvas-controls';
import { canvasNodeTypes } from './nodes/node-types';
import {
  LOGIC_SOURCE_HANDLE_PREFIX,
  parseLogicSourceHandle,
  parseLogicTargetHandle,
  type CanvasEdge,
  type CanvasNode,
} from './graph-flow-adapter';

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
  onSelectedNodeChange?: (nodeId: string | null) => void;
  /** Клик по пустому полю канваса — снять выделение со всех сущностей. */
  onClearSelection?: () => void;
  /** Центрирование вьюпорта на узле — результат поиска (T-050). */
  focus?: { nodeId: string; nonce: number } | null;
  /** Фактические размеры узлов после рендера — стек колонки по ним (N12). */
  onNodesMeasured?: (sizes: Record<string, { width: number; height: number }>) => void;
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
}: EditorCanvasProps) {
  const theme = useEditorTheme();
  const styles = useReactFlowThemeStyles();
  // По макетам миникарта выключена по умолчанию, включается кнопкой панели.
  const [miniMapVisible, setMiniMapVisible] = useState(false);
  const canvas = theme.editor.canvas;

  const [nodes, setNodes] = useState<CanvasNode[]>(propsNodes);
  const [edges, setEdges] = useState<CanvasEdge[]>(propsEdges);
  // Граф — источник правды: любой пересчёт из команды заменяет локальное
  // состояние целиком (позиции drag'а при этом либо зафиксированы командой,
  // либо отброшены).
  useEffect(() => setNodes(propsNodes), [propsNodes]);
  useEffect(() => setEdges(propsEdges), [propsEdges]);
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  // Центрирование на найденном узле (T-050). Задержка — узел мог только что
  // развернуться (reveal) и ещё не перемериться react-flow.
  const { fitView } = useReactFlow();
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
      // хуком (selected в пропсах, onNodeClick), иначе локальное состояние
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

  // Колонки уровней из текущей раскладки: X — минимальная координата колонки,
  // ширина — по самому широкому узлу. Справа от последней всегда есть пустой
  // слот «следующий уровень» — на пустой уровень узел переносится первым (F6).
  const findColumnCandidate = useCallback(
    (x: number): { depth: number; x: number; width: number } | null => {
      const byDepth = new Map<number, { x: number; width: number }>();
      // Ширина — фактическая (measured из локального состояния): у формы она
      // больше nodeWidth, и по оценке центр её колонки «уезжал» — узел,
      // брошенный на место, уходил на следующий уровень и терял связи.
      const measuredWidth = new Map(nodesRef.current.map((node) => [node.id, node.measured?.width]));
      for (const node of propsNodes) {
        const width = measuredWidth.get(node.id) ?? CANVAS_LAYOUT.nodeWidth;
        const column = byDepth.get(node.data.depth);
        if (column) {
          column.x = Math.min(column.x, node.position.x);
          column.width = Math.max(column.width, width);
        } else {
          byDepth.set(node.data.depth, { x: node.position.x, width });
        }
      }
      const columns = [...byDepth.entries()]
        .sort(([left], [right]) => left - right)
        .map(([depth, column]) => ({ depth, ...column }));
      const last = columns[columns.length - 1];
      if (last) {
        columns.push({
          depth: last.depth + 1,
          x: last.x + last.width + CANVAS_LAYOUT.columnGap,
          width: CANVAS_LAYOUT.nodeWidth,
        });
      }
      let best: (typeof columns)[number] | null = null;
      for (const column of columns) {
        const center = column.x + column.width / 2;
        if (best === null || Math.abs(x - center) < Math.abs(x - (best.x + best.width / 2))) {
          best = column;
        }
      }
      return best;
    },
    [propsNodes],
  );

  // Подсветка целевой колонки во время drag (F6) и запомненная глубина
  // кандидата — в drop решение принимается по последнему кандидату.
  const [dropZone, setDropZone] = useState<{ x: number; width: number } | null>(null);
  const candidateDepthRef = useRef<number | null>(null);

  const handleNodeDrag: OnNodeDrag<CanvasNode> = useCallback(
    (_event, draggedNode) => {
      const width = draggedNode.measured?.width ?? CANVAS_LAYOUT.nodeWidth;
      const candidate = findColumnCandidate(draggedNode.position.x + width / 2);
      candidateDepthRef.current = candidate?.depth ?? null;
      // Своя колонка не подсвечивается — переноса нет, будет reorder по Y.
      setDropZone(
        candidate && candidate.depth !== draggedNode.data.depth
          ? { x: candidate.x, width: candidate.width }
          : null,
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
      setNodes(propsNodes);
      if (candidateDepth !== null && candidateDepth !== draggedNode.data.depth) {
        onMoveNodeToDepth?.(draggedNode.id, candidateDepth);
        return;
      }
      // Порядок после drag определяется по Y среди узлов той же колонки
      // (глубина в data.depth — из адаптера), дальше — ReorderInLayer.
      const layerNodes = nodesRef.current.filter((node) => node.data.depth === draggedNode.data.depth);
      onReorderNode?.(draggedNode, layerNodes);
    },
    [onMoveNodeToDepth, onReorderNode, propsNodes],
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

  // Два вида соединений (T-032/T-037):
  // — навигация: источник — карточка элемента (sourceHandle, D9), цель —
  //   страница, но не Главная (домен: PageLinkTargetId), и не сам узел;
  // — «Сложная логика»: источник — option-handle Select'а, цель — target-handle
  //   карточки другого элемента ТОЙ ЖЕ формы (L-I5; оба конца в одном узле —
  //   штатное ребро react-flow внутри FormNode, решение владельца по Q-9).
  const isValidConnection: IsValidConnection<CanvasEdge> = useCallback(
    (connection) => {
      const sourceHandle = connection.sourceHandle ?? '';
      if (sourceHandle.startsWith(LOGIC_SOURCE_HANDLE_PREFIX)) {
        const source = parseLogicSourceHandle(sourceHandle);
        const targetElementId = connection.targetHandle
          ? parseLogicTargetHandle(connection.targetHandle)
          : null;
        if (!source || targetElementId === null) {
          return false;
        }
        return connection.source === connection.target && targetElementId !== source.elementId;
      }
      // Навигационное ребро не должно попадать в logic-target handle элемента.
      if (connection.targetHandle && parseLogicTargetHandle(connection.targetHandle) !== null) {
        return false;
      }
      if (!connection.sourceHandle || connection.source === connection.target) {
        return false;
      }
      const target = propsNodes.find((node) => node.id === connection.target);
      return target !== undefined && target.type !== 'home';
    },
    [propsNodes],
  );

  return (
    <div className={styles.root} data-testid="editor-canvas" onKeyDownCapture={handleKeyDownCapture}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={canvasNodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={(connection) => onConnectLink?.(connection)}
        onReconnect={(oldEdge, connection) => onReconnectLink?.(oldEdge, connection)}
        onEdgesDelete={(deleted) => onDeleteLinks?.(deleted)}
        onNodesDelete={(deleted) => onDeleteNodes?.(deleted)}
        onNodeDrag={handleNodeDrag}
        onNodeDragStop={handleNodeDragStop}
        onNodeClick={(event, node) => {
          // Кнопки узла (раскрытие, «+», корзина) и коннекторы — действия,
          // а не выбор узла: выделение и будущая панель свойств узла не
          // должны открываться от них (баг 2 приёмки).
          if (!isActionTarget(event.target)) {
            onSelectedNodeChange?.(node.id);
          }
        }}
        // Клик по связи выделяет только её (выделение рёбер — у react-flow).
        onEdgeClick={() => onClearSelection?.()}
        onPaneClick={() => onClearSelection?.()}
        isValidConnection={isValidConnection}
        // Рёбра всегда над блоками, в том числе выделенными (N8): react-flow
        // по умолчанию поднимает выделенный узел на z-index 1000 — выше слоя
        // рёбер. Узлы на канвасе не перекрываются, подъём не нужен.
        elevateNodesOnSelect={false}
        deleteKeyCode={['Backspace', 'Delete']}
        colorMode="light"
        fitView
      >
        {dropZone ? <DropZoneHighlight zone={dropZone} /> : null}
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

// Полоса-подсветка целевой колонки dnd (F6): во время перетаскивания узла
// подсвечивает уровень, куда узел упадёт. Координаты flow переводятся в
// экранные через useViewport (pan/zoom); события мыши полоса не перехватывает.
function DropZoneHighlight({ zone }: { zone: { x: number; width: number } }) {
  const theme = useEditorTheme();
  const { x: viewportX, zoom } = useViewport();
  return (
    <div
      data-testid="drop-zone-highlight"
      style={{
        position: 'absolute',
        left: zone.x * zoom + viewportX,
        top: 0,
        bottom: 0,
        width: zone.width * zoom,
        backgroundColor: theme.editor.canvas.nodeHoverBackground,
        borderLeft: `2px dashed ${theme.editor.canvas.nodeHoverBorder}`,
        borderRight: `2px dashed ${theme.editor.canvas.nodeHoverBorder}`,
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  );
}

export function EditorCanvas(props: EditorCanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
