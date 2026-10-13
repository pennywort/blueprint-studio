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
      // Handle — круглый и объёмный (N7): радиальный градиент + тень, без
      // белой обводки (N11). Центр на границе карточки — ребро начинается
      // точно от него.
      '& .react-flow__handle': {
        width: 10,
        height: 10,
        borderRadius: '50%',
        border: 'none',
        backgroundColor: canvas.handle,
        backgroundImage: `radial-gradient(circle at 35% 35%, ${canvas.handleHighlight}, ${canvas.handle} 65%)`,
        boxShadow: `0 1px 3px ${canvas.handleShadow}`,
      },
      // Принимающие handles (повторная приёмка): видимых target-коннекторов
      // нет вовсе — handle накрывает блок/элемент целиком и прозрачен. В покое
      // он не ловит мышь (содержимое кликабельно), рёбра крепятся к его
      // левому краю по центру. Пока тянется связь, допустимая цель принимает
      // drop/клик курсора в любом месте сущности; под курсором — рамка.
      '& .react-flow__handle.editor-target': {
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        minWidth: 0,
        minHeight: 0,
        transform: 'none',
        borderRadius: 'inherit',
        border: 'none',
        backgroundColor: 'transparent',
        backgroundImage: 'none',
        boxShadow: 'none',
        pointerEvents: 'none',
      },
      '& .react-flow__handle.editor-target.editor-target-available': {
        pointerEvents: 'all',
        // Над карточками элементов внутри блока.
        zIndex: 3,
      },
      '& .react-flow__handle.editor-target.editor-target-available:hover': {
        outline: `2px solid ${canvas.edgeActive}`,
        outlineOffset: 2,
      },
      // Идёт протягивание связи — курсор «прицел» на всём канвасе. !important:
      // курсоры react-flow (grab полотна, pointer узлов) той же специфичности
      // и иначе перебивают прицел, стоит курсору уйти с handle (5.1).
      '&.editor-connecting, &.editor-connecting *': {
        cursor: 'crosshair !important',
      },
      // Рёбра поверх узлов (F4) не перехватывают drop курсора на блок.
      '&.editor-connecting .react-flow__edge': {
        pointerEvents: 'none',
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
