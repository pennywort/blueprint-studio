import { useCallback, useMemo, useRef, useState, type RefCallback } from 'react';
import { useHotkeyHandlers } from './hotkeys-provider';

// Стек всплывающих слоёв [owner 2026-10-30]: Esc — команда хоткеев
// layer.dismiss, закрывает верхний открытый слой (одно нажатие — один слой).
// Слой — любой компонент с open/onDismiss: окно, меню, поппер, панель,
// незавершённый жест канваса. Порядок — стек реестра хоткеев: открытый
// позже — выше; вид слоя задаёт приоритет (таблица ниже), а не ветвления.

// Жест (клик-связь) выше поверхностей: начат последним по смыслу, даже если
// панель открылась в том же рендере (эффекты детей идут раньше родителя).
export const DISMISS_LAYER_PRIORITY = {
  surface: 1,
  gesture: 2,
} as const;
export type DismissLayerKind = keyof typeof DISMISS_LAYER_PRIORITY;

// Пропсы модального слоя MUI v4 (Dialog, Menu, Popover): свой Esc у Modal
// выключен — иначе двойное закрытие и клавиша мимо keybindings; ref —
// корень портала, где фокус (FocusTrap), — область слоя для реестра.
export type DismissLayerProps = {
  ref: RefCallback<HTMLElement>;
  disableEscapeKeyDown: true;
};

export function useDismissLayer(
  open: boolean,
  onDismiss: () => void,
  kind: DismissLayerKind = 'surface',
): DismissLayerProps {
  const area = useRef<HTMLElement | null>(null);
  useHotkeyHandlers(
    { 'layer.dismiss': onDismiss },
    { enabled: open, area, priority: DISMISS_LAYER_PRIORITY[kind] },
  );
  const ref = useCallback((element: HTMLElement | null) => {
    area.current = element;
  }, []);
  return useMemo(() => ({ ref, disableEscapeKeyDown: true }), [ref]);
}

// Select MUI v4 открывает свой Menu — тот же слой: управляемое открытие +
// пропсы слоя в MenuProps. Раскладывается в <Select {...useSelectLayer()}>.
export function useSelectLayer() {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const MenuProps = useDismissLayer(open, close);
  return { open, onOpen: () => setOpen(true), onClose: close, MenuProps };
}
