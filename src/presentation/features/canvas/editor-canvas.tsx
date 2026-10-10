import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type IsValidConnection,
  type NodeChange,
  type OnNodeDrag,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useEditorTheme } from '@presentation/theme/editor-theme';
import { useReactFlowThemeStyles } from './react-flow-theme-styles';
import { EditorCanvasControls } from './editor-canvas-controls';
import { canvasNodeTypes } from './nodes/node-types';
import type { CanvasEdge, CanvasNode } from './graph-flow-adapter';

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

  // Свободного перетаскивания по канвасу нет (D7): колонка узла определяется
  // связями, drag — только вертикальный (переупорядочивание внутри слоя,
  // T-036), поэтому X всегда возвращается к позиции из раскладки.
  const lockedX = useCallback(
    (nodeId: string): number => propsNodes.find((node) => node.id === nodeId)?.position.x ?? 0,
    [propsNodes],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange<CanvasNode>[]) => {
      const allowed = changes
        // Удаление узлов — команда RemoveScenario/RemoveForm (T-034), через
        // клавиатуру не удаляем: remove-изменения не применяем.
        .filter((change) => change.type !== 'remove')
        .map((change) =>
          change.type === 'position' && change.position
            ? { ...change, position: { x: lockedX(change.id), y: change.position.y } }
            : change,
        );
      setNodes((current) => applyNodeChanges(allowed, current));
    },
    [lockedX],
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

  const handleNodeDragStop: OnNodeDrag<CanvasNode> = useCallback(
    (_event, draggedNode) => {
      // Порядок после drag определяется по Y среди узлов той же колонки
      // (глубина в data.depth — из адаптера), дальше — ReorderInLayer.
      const layerNodes = nodesRef.current.filter((node) => node.data.depth === draggedNode.data.depth);
      // Возврат к раскладке: если команда не выполнится (порядок не изменился),
      // узел не останется в брошенной позиции; если выполнится — сверху придут
      // пересчитанные узлы.
      setNodes(propsNodes);
      onReorderNode?.(draggedNode, layerNodes);
    },
    [onReorderNode, propsNodes],
  );

  // Цель связи — страница, но не Главная (домен: PageLinkTargetId), и не сам
  // узел-источник; источник — только карточка элемента (sourceHandle, D9).
  const isValidConnection: IsValidConnection<CanvasEdge> = useCallback(
    (connection) => {
      if (!connection.sourceHandle || connection.source === connection.target) {
        return false;
      }
      const target = propsNodes.find((node) => node.id === connection.target);
      return target !== undefined && target.type !== 'home';
    },
    [propsNodes],
  );

  return (
    <div className={styles.root} data-testid="editor-canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={canvasNodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={(connection) => onConnectLink?.(connection)}
        onReconnect={(oldEdge, connection) => onReconnectLink?.(oldEdge, connection)}
        onEdgesDelete={(deleted) => onDeleteLinks?.(deleted)}
        onNodeDragStop={handleNodeDragStop}
        isValidConnection={isValidConnection}
        deleteKeyCode={['Backspace', 'Delete']}
        colorMode="light"
        fitView
      >
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

export function EditorCanvas(props: EditorCanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
