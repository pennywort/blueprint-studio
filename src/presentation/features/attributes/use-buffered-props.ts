import { useCallback, useEffect, useRef, useState } from 'react';
import type { ElementPropsPatch } from '@application/commands/update-element-props';

/** Задержка фиксации ввода командой (ревью P5/A10, R2). */
export const ATTRIBUTE_COMMIT_DELAY_MS = 300;

type Pending<Id extends string> = { elementId: Id; patch: ElementPropsPatch };

// Локальный буфер полей панели атрибутов (ревью P5/A10, R2): ввод сначала
// попадает в черновик (поле обновляется сразу), команда UpdateElementProps
// уходит одна — через 300 мс без ввода, по blur или при смене выделения.
// Раньше каждое нажатие клавиши было командой: пересчёт графа и раскладки
// на символ и шаг undo на символ.
export function useBufferedProps<Id extends string>(
  elementId: Id,
  commit: (elementId: Id, patch: ElementPropsPatch) => void,
) {
  const [draft, setDraft] = useState<Pending<Id> | null>(null);
  const pendingRef = useRef<Pending<Id> | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commitRef = useRef(commit);
  useEffect(() => {
    commitRef.current = commit;
  }, [commit]);

  const flush = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (pending) {
      // Команда — тому элементу, в котором шёл ввод (выделение могло смениться).
      commitRef.current(pending.elementId, pending.patch);
    }
    setDraft(null);
  }, []);

  const change = useCallback(
    (patch: ElementPropsPatch) => {
      const previous = pendingRef.current;
      if (previous && previous.elementId !== elementId) {
        flush();
      }
      const merged = (
        pendingRef.current ? { ...pendingRef.current.patch, ...patch } : patch
      ) as ElementPropsPatch;
      pendingRef.current = { elementId, patch: merged };
      setDraft(pendingRef.current);
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(flush, ATTRIBUTE_COMMIT_DELAY_MS);
    },
    [elementId, flush],
  );

  // Смена выделенного элемента и закрытие панели фиксируют буфер.
  useEffect(() => () => flush(), [elementId, flush]);

  return {
    /** Неотправленные значения полей выделенного элемента (поверх графа). */
    draft: draft?.elementId === elementId ? draft.patch : null,
    change,
    flush,
  };
}
