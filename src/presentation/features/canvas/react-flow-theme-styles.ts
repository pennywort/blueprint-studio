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
      // Рёбра и линия соединения — поверх узлов (F4): иначе отрезок у
      // handle уходит под карточку узла.
      '& .react-flow__edges': {
        zIndex: 10,
      },
      '& .react-flow__connectionline': {
        zIndex: 10,
      },
      // Выделение узла (F7): чёрная рамка цвета стрелок — общее правило
      // выделения всех сущностей проекта.
      '& .react-flow__node.selected [data-testid^="canvas-node-"]': {
        outline: `2px solid ${canvas.edge}`,
        outlineOffset: 2,
      },
      // Рёбра «Сложной логики» рисуются в общем стиле навигации (решение
      // владельца по N1: отличие предложит дизайнер).
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
