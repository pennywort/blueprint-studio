import { useEffect, useRef } from 'react';
import { useUpdateNodeInternals } from '@xyflow/react';

// Пересчёт handles узла при смене его данных (ревью P4, R2): карточки и шаги
// могли сдвинуться при том же размере узла (ResizeObserver молчит). Вызов —
// из самого узла, после коммита его DOM: из канваса он опережал перерисовку
// узла, и рёбра оставались у старых позиций (обмен шагов туда-обратно,
// N2 [owner 2026-10-16]). Первый рендер меряет react-flow сам.
export function useHandlesSync(id: string, data: unknown): void {
  const updateNodeInternals = useUpdateNodeInternals();
  const previous = useRef(data);
  useEffect(() => {
    if (previous.current !== data) {
      previous.current = data;
      updateNodeInternals(id);
    }
  }, [data, id, updateNodeInternals]);
}
