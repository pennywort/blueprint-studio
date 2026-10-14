import { useCallback, useEffect, useState, type DragEvent } from 'react';
import {
  draggedElement,
  isDragLeavingZone,
  readElementDrag,
  type DropAnchorPosition,
  type ElementDragPayload,
} from '../element-dnd';
import { useNodeStyles } from './node-styles';

type ElementDropZoneOptions<T> = {
  /** Решение зоны по жесту; null — drag здесь не принимается. */
  locate: (event: DragEvent<HTMLElement>, dragged: ElementDragPayload) => T | null;
  onDrop: (dragged: ElementDragPayload, state: T) => void;
  /** Не пускать dragover/drop к внешней зоне (шаг формы внутри узла). */
  isolate?: boolean;
};

// Зона приёма карточек элементов (N2, ревью A8, R4): общая для узла страницы
// и колонок шага формы — подсветка во время drag, сброс по окончании жеста
// и drop с решением, посчитанным в момент отпускания.
export function useElementDropZone<T>({ locate, onDrop, isolate = false }: ElementDropZoneOptions<T>) {
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
      const dragged = draggedElement(event.dataTransfer);
      const next = dragged ? locate(event, dragged) : null;
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
    [isolate, locate],
  );

  const onDragLeave = useCallback((event: DragEvent<HTMLElement>) => {
    // Переход на дочерний элемент зоны — не уход из неё (подсветка не мигает).
    if (isDragLeavingZone(event.currentTarget, event.clientX, event.clientY)) {
      setState(null);
    }
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLElement>) => {
      const dragged = readElementDrag(event.dataTransfer);
      const decided = dragged ? locate(event, dragged) : null;
      setState(null);
      if (!dragged || decided === null) {
        return;
      }
      event.preventDefault();
      if (isolate) {
        event.stopPropagation();
      }
      onDrop(dragged, decided);
    },
    [isolate, locate, onDrop],
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
