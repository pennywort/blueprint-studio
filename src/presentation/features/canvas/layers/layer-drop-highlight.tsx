import type { CSSProperties } from 'react';
import { useEditorTheme } from '@presentation/theme/editor-theme';

// Подсветка колонки-цели dnd (F6) — общая для слоёв [owner 2026-10-13]:
// канвас страниц передаёт экранные координаты (с учётом pan/zoom), шаг
// формы — локальные координаты своего контейнера. События мыши полоса
// не перехватывает.
export function LayerDropHighlight({
  left,
  width,
  style,
}: {
  left: number;
  width: number;
  style?: CSSProperties;
}) {
  const theme = useEditorTheme();
  return (
    <div
      data-testid="drop-zone-highlight"
      style={{
        position: 'absolute',
        left,
        top: 0,
        bottom: 0,
        width,
        backgroundColor: theme.editor.canvas.nodeHoverBackground,
        borderLeft: `2px dashed ${theme.editor.canvas.nodeHoverBorder}`,
        borderRight: `2px dashed ${theme.editor.canvas.nodeHoverBorder}`,
        pointerEvents: 'none',
        zIndex: 1,
        ...style,
      }}
    />
  );
}
