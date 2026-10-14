import { useCallback, useEffect, useState, type DragEvent } from 'react';
import {
  draggedElement,
  isDragLeavingZone,
  readElementDrag,
  type DropAnchorPosition,
  type ElementDragPayload,
} from '../element-dnd';
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

// Линия-индикатор вставки у карточки-якоря (N2).
export function DropIndicator({
  anchor,
  elementId,
  placement,
}: {
  anchor: DropAnchorPosition | null | undefined;
  elementId: string;
  placement: DropAnchorPosition['placement'];
}) {
  const classes = useNodeStyles();
  return anchor?.elementId === elementId && anchor.placement === placement ? (
    <div className={classes.dropIndicator} data-testid="drop-indicator" />
  ) : null;
}
