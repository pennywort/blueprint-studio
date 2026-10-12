import { makeStyles } from '@sber-friend/flamingo-core';
import type { EditorTheme } from '@presentation/theme/editor-theme';

// Стили внутренних частей react-flow, оформленные токенами темы (D6).
// Селекторы scoped под классом-обёрткой: глобальные CSS-правила запрещены
// конституцией (раздел 7 — гигиена встраиваемости).
export const useReactFlowThemeStyles = makeStyles<EditorTheme>((theme) => {
  const canvas = theme.editor.canvas;

  return {
    root: {
      width: '100%',
      height: '100%',
      backgroundColor: canvas.background,

      '& .react-flow__background': {
        backgroundColor: canvas.background,
      },
      '& .react-flow__edge-path': {
        stroke: canvas.edge,
        strokeWidth: 2,
      },
      '& .react-flow__edge.selected .react-flow__edge-path, & .react-flow__edge:hover .react-flow__edge-path':
        {
          stroke: canvas.edgeActive,
        },
      '& .react-flow__connection-path': {
        stroke: canvas.edge,
        strokeWidth: 2,
      },
      // Рёбра «Сложной логики» (T-037, §6 дизайн-дока): пунктир, чтобы
      // визуально не путать правила видимости с навигационными связями.
      '& .react-flow__edge.editor-logic-edge .react-flow__edge-path': {
        strokeDasharray: '6 4',
      },
      '& .react-flow__handle': {
        width: 8,
        height: 8,
        backgroundColor: canvas.handle,
        border: `2px solid ${canvas.handleBorder}`,
      },
      '& .react-flow__minimap': {
        backgroundColor: canvas.minimapBackground,
        border: `1px solid ${canvas.minimapBorder}`,
        borderRadius: 12,
        overflow: 'hidden',
      },
      // Attribution скрывать нельзя (лицензия @xyflow/react) — только
      // приводим к токенам темы.
      '& .react-flow__attribution': {
        backgroundColor: canvas.controlsBackground,
        color: canvas.controlsForeground,
      },
      '& .react-flow__attribution a': {
        color: canvas.controlsForeground,
      },
      // Hover-подсветка целевого узла связи (макет «связь-…-переход-к-подсценарию»,
      // D9): серый фон + рамка. Класс вешается на узел в T-032.
      '& .react-flow__node.editor-drop-target .react-flow__node-default, & .react-flow__node.editor-drop-target':
        {
          backgroundColor: canvas.nodeHoverBackground,
          borderColor: canvas.nodeHoverBorder,
        },
    },
  };
});
