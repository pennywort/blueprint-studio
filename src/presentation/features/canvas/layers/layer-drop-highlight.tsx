import type { CSSProperties } from 'react';
import { useEditorTheme } from '@presentation/theme/editor-theme';

// Подсветка колонки-цели dnd (F6) — только для канваса страниц (экранные
// координаты с учётом pan/zoom). Внутри узлов (шаг формы, шаги формы) —
// полосы с точками (ColumnDropBar/DropIndicator): подсветка во всю колонку
// выходила за границу блока [owner 2026-10-15]. События мыши полоса
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
