import { useCallback, useEffect, useState, type CSSProperties, type DragEvent } from 'react';
import {
  draggedElement,
  isDragLeavingZone,
  readElementDrag,
  type DropAnchorPosition,
  type ElementDragPayload,
} from '../element-dnd';
import type { LayerColumn } from '../layers/layer-columns';
import { useNodeStyles } from './node-styles';

type DropZoneOptions<P, T> = {
  /** Перетаскиваемое во время dragover; null — drag не этой зоны. */
  dragged: (dataTransfer: DataTransfer) => P | null;
  /** Payload на drop (из данных события). */
  read: (dataTransfer: DataTransfer) => P | null;
  /** Решение зоны по жесту; null — drag здесь не принимается. */
  locate: (event: DragEvent<HTMLElement>, dragged: P) => T | null;
  onDrop: (dragged: P, state: T) => void;
  /** Не пускать dragover/drop к внешней зоне (шаг формы внутри узла). */
  isolate?: boolean;
};

type ElementDropZoneOptions<T> = Omit<DropZoneOptions<ElementDragPayload, T>, 'dragged' | 'read'>;

// Зона приёма карточек элементов (N2, ревью A8, R4): узел страницы и
// колонки шага формы.
export function useElementDropZone<T>(options: ElementDropZoneOptions<T>) {
  return useDropZone({ ...options, dragged: draggedElement, read: readElementDrag });
}

// Зона приёма нативного dnd (ревью A8, R4): подсветка во время drag, сброс
// по окончании жеста и drop с решением, посчитанным в момент отпускания.
// Общая для карточек элементов и шагов формы (dnd шагов, [owner 2026-10-14]).
export function useDropZone<P, T>({ dragged, read, locate, onDrop, isolate = false }: DropZoneOptions<P, T>) {
  const [state, setState] = useState<T | null>(null);

  // Жест закончился вне зоны или отменён (Esc) — dragleave мог не дойти:
  // состояние сбрасывается по окончании любого drag.
  const active = state !== null;
  useEffect(() => {
    if (!active) {
      return;
    }
    const reset = () => setState(null);
    window.addEventListener('dragend', reset);
    window.addEventListener('drop', reset);
    return () => {
      window.removeEventListener('dragend', reset);
      window.removeEventListener('drop', reset);
    };
  }, [active]);

  const onDragOver = useCallback(
    (event: DragEvent<HTMLElement>) => {
      const current = dragged(event.dataTransfer);
      const next = current ? locate(event, current) : null;
      if (next === null) {
        setState(null);
        return; // не preventDefault — курсор «нельзя», drop не случится
      }
      event.preventDefault();
      if (isolate) {
        event.stopPropagation();
      }
      event.dataTransfer.dropEffect = 'move';
      setState(next);
    },
    [dragged, isolate, locate],
  );

  const onDragLeave = useCallback((event: DragEvent<HTMLElement>) => {
    // Переход на дочерний элемент зоны — не уход из неё (подсветка не мигает).
    if (isDragLeavingZone(event.currentTarget, event.clientX, event.clientY)) {
      setState(null);
    }
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLElement>) => {
      const payload = read(event.dataTransfer);
      const decided = payload ? locate(event, payload) : null;
      setState(null);
      if (!payload || decided === null) {
        return;
      }
      event.preventDefault();
      if (isolate) {
        event.stopPropagation();
      }
      onDrop(payload, decided);
    },
    [isolate, locate, onDrop, read],
  );

  return { state, handlers: { onDragOver, onDragLeave, onDrop: handleDrop } };
}

/** Полоса короче карточки/колонки на столько с каждого конца — точки не у краёв карточек. */
export const DROP_BAR_INSET = 16;

// Полоса-индикатор вставки (N2, [owner 2026-10-15]) — единая для узлов:
// карточки в шаге, шаги в форме. style — положение в месте использования.
export function DropBar({
  orientation,
  style,
  testId = 'drop-indicator',
}: {
  orientation: 'horizontal' | 'vertical';
  style: CSSProperties;
  testId?: string;
}) {
  const classes = useNodeStyles();
  const modifier = orientation === 'horizontal' ? classes.dropBarHorizontal : classes.dropBarVertical;
  return <div className={`${classes.dropBar} ${modifier}`} style={style} data-testid={testId} />;
}

// Полоса у карточки-якоря (N2): в потоке колонки, посередине зазора.
// Абсолютная — посередине зазора gap до соседней карточки, раскладка не
// меняется; обёртка карточки — position: relative.
export function DropIndicator({
  anchor,
  elementId,
  placement,
  gap,
  width,
}: {
  anchor: DropAnchorPosition | null | undefined;
  elementId: string;
  placement: DropAnchorPosition['placement'];
  gap: number;
  /** Ширина карточки, если обёртка шире её (дерево Select'а в шаге формы). */
  width?: number;
}) {
  return anchor?.elementId === elementId && anchor.placement === placement ? (
    <DropBar
      orientation="horizontal"
      style={{
        position: 'absolute',
        left: DROP_BAR_INSET,
        ...(width === undefined ? { right: DROP_BAR_INSET } : { width: width - 2 * DROP_BAR_INSET }),
        [placement === 'before' ? 'top' : 'bottom']: -gap / 2 - 1,
      }}
    />
  ) : null;
}

/**
 * X вертикальной полосы переноса в колонку (N2, [owner 2026-10-15]) —
 * середина промежутка слева от колонки, полоса не касается ни карточек, ни
 * края контейнера: у первой колонки — поле контейнера (edge), у остальных —
 * зазор колонок (gap), но не дальше правого края поля (right).
 */
export function columnBarX(
  column: LayerColumn,
  space: { gap: number; edge: number; right?: number },
): number {
  if (column.depth === 0) {
    return column.x - space.edge / 2;
  }
  const previousEnd = column.x - space.gap;
  return previousEnd + Math.min(space.gap, (space.right ?? Infinity) - previousEnd) / 2;
}

// Вертикальная полоса переноса в колонку (N2, [owner 2026-10-15]): x —
// локальная координата слоя (columnBarX), по высоте зоны (отступ — под точки на концах).
export function ColumnDropBar({ x }: { x: number }) {
  return (
    <DropBar
      orientation="vertical"
      style={{ position: 'absolute', top: DROP_BAR_INSET, bottom: DROP_BAR_INSET, left: x - 1 }}
      testId="drop-zone-bar"
    />
  );
}
