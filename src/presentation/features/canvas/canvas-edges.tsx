import { memo } from 'react';
import {
  BaseEdge,
  getSmoothStepPath,
  type ConnectionLineComponentProps,
  type EdgeProps,
  type EdgeTypes,
  type Position,
} from '@xyflow/react';
import { CANVAS_LAYOUT } from './canvas-layout';

/** Радиус скругления изгибов рёбер и линии связи [owner 2026-10-15]. */
const EDGE_BORDER_RADIUS = 10;

type EdgeGeometry = {
  sourceX: number;
  sourceY: number;
  sourcePosition: Position;
  targetX: number;
  targetY: number;
  targetPosition: Position;
  /** X вертикального участка; по умолчанию — середина между концами. */
  centerX?: number;
};

// Единый путь рёбер и линии связи (ортогональный, со скруглёнными углами):
// рёбра, линия протягивания и клик-линия выглядят одинаково (повторная приёмка, 4).
export function editorEdgePath(geometry: EdgeGeometry): string {
  return getSmoothStepPath({ ...geometry, borderRadius: EDGE_BORDER_RADIUS })[0];
}

// Ребро редактора — для всех видов связей (навигация, правила, переходы).
// Переход между шагами [owner 2026-10-15]: вертикальный участок — посередине
// зазора перед шагом-целью, а не на границе шага-источника (середина между
// карточкой и шагом-целью приходилась ровно на границу шага).
export const EditorEdge = memo(function EditorEdge({
  id,
  data,
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  markerEnd,
  style,
  interactionWidth,
}: EdgeProps) {
  const intoStep = data?.kind === 'stepTransition' && targetX - sourceX > CANVAS_LAYOUT.formStepGap;
  const path = editorEdgePath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    centerX: intoStep ? targetX - CANVAS_LAYOUT.formStepGap / 2 : undefined,
  });
  return (
    <BaseEdge id={id} path={path} markerEnd={markerEnd} style={style} interactionWidth={interactionWidth} />
  );
});

/** Тип ребра редактора (graph-flow-adapter). */
export const EDITOR_EDGE_TYPE = 'editor';

export const canvasEdgeTypes: EdgeTypes = { [EDITOR_EDGE_TYPE]: EditorEdge };

// Линия протягивания связи — тот же путь, что у рёбер; класс — штатный
// react-flow (стиль .react-flow__connection-path).
export function EditorConnectionLine({
  fromX,
  fromY,
  fromPosition,
  toX,
  toY,
  toPosition,
}: ConnectionLineComponentProps) {
  return (
    <path
      className="react-flow__connection-path"
      fill="none"
      d={editorEdgePath({
        sourceX: fromX,
        sourceY: fromY,
        sourcePosition: fromPosition,
        targetX: toX,
        targetY: toY,
        targetPosition: toPosition,
      })}
    />
  );
}
