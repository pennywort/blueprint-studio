import type { CSSProperties } from 'react';
import { useEditorTheme } from '@presentation/theme/editor-theme';

// Подсветка колонки-цели dnd (F6) — только для канваса страниц (экранные
// координаты с учётом pan/zoom). Внутри узлов (шаг формы, шаги формы) —
// полосы с точками (ColumnDropBar/DropIndicator): подсветка во всю колонку
// выходила за границу блока [owner 2026-10-15]. blocked — уровень заполнен,
// бросить нельзя (ёмкость уровня, [owner 2026-10-16]). События мыши полоса
// не перехватывает.
export function LayerDropHighlight({
  left,
  width,
  blocked = false,
  style,
}: {
  left: number;
  width: number;
  blocked?: boolean;
  style?: CSSProperties;
}) {
  const theme = useEditorTheme();
  const border = `2px dashed ${blocked ? theme.palette.error.main : theme.editor.canvas.nodeHoverBorder}`;
  return (
    <div
      data-testid="drop-zone-highlight"
      data-drop-blocked={blocked || undefined}
      style={{
        position: 'absolute',
        left,
        top: 0,
        bottom: 0,
        width,
        backgroundColor: blocked
          ? theme.editor.canvas.dropBlockedBackground
          : theme.editor.canvas.nodeHoverBackground,
        borderLeft: border,
        borderRight: border,
        pointerEvents: 'none',
        zIndex: 1,
        ...style,
      }}
    />
  );
}
