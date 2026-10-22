import { makeStyles } from '@blueprint-vendor/flamingo-core';
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
      // Рамка выделения узла (F7, F5, S10) — единая подсветка highlight/
      // (R-PERF-6): без селектора по data-testid и :has().
      // Рёбра «Сложной логики» рисуются в общем стиле навигации (решение
      // владельца по N1: отличие предложит дизайнер).
      // Handle (N7/N11, замечание владельца 2026-10-13): плоский круг 12px
      // без градиента; прозрачный ::after расширяет зону захвата до 24px
      // (размер самого handle не меняется — ребро крепится к его краю).
      // Центр на границе карточки.
      '& .react-flow__handle': {
        width: 12,
        height: 12,
        borderRadius: '50%',
        border: 'none',
        backgroundColor: canvas.handle,
        boxShadow: `0 1px 3px ${canvas.handleShadow}`,
      },
      '& .react-flow__handle:not(.editor-target)::after': {
        content: '""',
        position: 'absolute',
        inset: -6,
        borderRadius: '50%',
      },
      // Принимающие handles (повторная приёмка): в покое не видны — handle накрывает блок/элемент целиком и прозрачен. В покое
      // он не ловит мышь (содержимое кликабельно), рёбра крепятся к его
      // левому краю по центру. Пока тянется связь, допустимая цель принимает
      // drop/клик курсора в любом месте сущности; под курсором — рамка.
      // Накрывает карточку вместе с рамкой 1px (−1px): точка входа рёбер и
      // полая окружность — ровно на линии рамки [owner 2026-10-13].
      '& .react-flow__handle.editor-target': {
        top: -1,
        left: -1,
        width: 'calc(100% + 2px)',
        height: 'calc(100% + 2px)',
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
      // Допустимая цель помечается полой окружностью на левом краю — точке
      // входа рёбер ([owner 2026-10-13]: только во время протягивания и
      // только у возможных целей); принимает связь при этом вся сущность.
      '& .react-flow__handle.editor-target.editor-target-available::after': {
        content: '""',
        position: 'absolute',
        left: 0,
        top: '50%',
        width: 14,
        height: 14,
        boxSizing: 'border-box',
        borderRadius: '50%',
        border: `2px solid ${canvas.edgeActive}`,
        backgroundColor: theme.palette.background.paper,
        transform: 'translate(-50%, -50%)',
      },
      // Рамка цели под курсором — единая подсветка highlight/ (вид
      // connectHover, R-PERF-6): у выделенной цели рамка выделения
      // заменяется рамкой цели по приоритету политики [owner 2026-10-15].
      // Исходящие handles сущности-цели (у блока — и его элементов) — в цвет
      // рамки цели, подсветка единообразна [owner 2026-10-13].
      '& [data-highlight="connectHover"] .react-flow__handle.source': {
        backgroundColor: canvas.edgeActive,
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
    },
  };
});
