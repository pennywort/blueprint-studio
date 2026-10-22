import { makeStyles } from '@blueprint-vendor/flamingo-core';
import type { EditorTheme } from '@presentation/theme/editor-theme';
import { CANVAS_LAYOUT } from '../canvas-layout';

// Общие стили узлов канваса (ревью A8, R4): карточка узла, рамки нарушения,
// цели связи и зоны приёма dnd, заголовок, кнопки и индикатор вставки —
// одни для ScenarioNode, FormNode и FormStepLayers.
export const useNodeStyles = makeStyles<EditorTheme>((theme) => ({
  card: {
    // Не обрезать target-handle узла на левой границе (N7/N11).
    overflow: 'visible',
    borderRadius: 16,
    backgroundColor: theme.palette.background.paper,
    padding: CANVAS_LAYOUT.nodePadding,
    display: 'flex',
    flexDirection: 'column',
    gap: CANVAS_LAYOUT.nodeContentGap,
    // Без тени elevation Card: рамка выделения/ошибки — единственная граница
    // блока (F7, [owner 2026-10-20]).
    boxShadow: 'none',
  },
  // Рамки состояний (выделение, ошибка, цели связи и dnd) — единая подсветка
  // highlight/ (R-PERF-6), не классы здесь.
  // Полоса-индикатор вставки внутри узла (N2, [owner 2026-10-15]): толщина
  // как у связи, на концах серые точки как handle — не выходит за границы
  // блока (в отличие от подсветки колонки на канвасе, LayerDropHighlight).
  // Горизонтальная — место в колонке, вертикальная — перенос в колонку.
  // Позицию (в потоке или абсолютно) задаёт место использования (DropBar).
  dropBar: {
    backgroundColor: theme.editor.canvas.edge,
    pointerEvents: 'none',
    zIndex: 1,
    '&::before, &::after': {
      content: '""',
      position: 'absolute',
      width: 12,
      height: 12,
      borderRadius: '50%',
      backgroundColor: theme.editor.canvas.handle,
      boxShadow: `0 1px 3px ${theme.editor.canvas.handleShadow}`,
    },
  },
  // Уровень заполнен — бросить нельзя (ёмкость уровня, [owner 2026-10-16]).
  dropBarBlocked: {
    backgroundColor: theme.palette.error.main,
    '&::before, &::after': { backgroundColor: theme.palette.error.main },
  },
  dropBarHorizontal: {
    height: 2,
    '&::before, &::after': { top: -5 },
    '&::before': { left: -6 },
    '&::after': { right: -6 },
  },
  dropBarVertical: {
    width: 2,
    '&::before, &::after': { left: -5 },
    '&::before': { top: -6 },
    '&::after': { bottom: -6 },
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing(1),
  },
  iconButton: {
    backgroundColor: theme.editor.canvas.controlsBackground,
    '&:hover': {
      backgroundColor: theme.editor.canvas.controlsHoverBackground,
    },
  },
}));
