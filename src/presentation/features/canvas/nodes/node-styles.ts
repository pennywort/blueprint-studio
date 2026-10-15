import { makeStyles } from '@blueprint-vendor/flamingo-core';
import type { EditorTheme } from '@presentation/theme/editor-theme';

// Общие стили узлов канваса (ревью A8, R4): карточка узла, рамки нарушения,
// цели связи и зоны приёма dnd, заголовок, кнопки и индикатор вставки —
// одни для ScenarioNode, FormNode и FormStepLayers.
export const useNodeStyles = makeStyles<EditorTheme>((theme) => ({
  card: {
    // Не обрезать target-handle узла на левой границе (N7/N11).
    overflow: 'visible',
    borderRadius: 16,
    backgroundColor: theme.palette.background.paper,
    padding: theme.spacing(2),
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1.5),
  },
  // Нарушение инвариантов узла или его элементов (T-043).
  invalid: {
    // Одна рамка: та же внутренняя (inset), что у выделения, цветом ошибки;
    // выделение важнее — его селектор специфичнее (T-043, [owner 2026-10-14]).
    boxShadow: `${theme.shadows[1]}, inset 0 0 0 2px ${theme.palette.error.main}`,
  },
  // Hover-подсветка целевого узла при перетаскивании связи (T-032, макет
  // «связь-…-переход-к-подсценарию»): серый фон + рамка, цвета из темы.
  dropTarget: {
    backgroundColor: theme.editor.canvas.nodeHoverBackground,
    outline: `2px solid ${theme.editor.canvas.nodeHoverBorder}`,
  },
  // Зона приёма dnd карточек (N2): drag карточки над узлом.
  dndActive: {
    outline: `2px dashed ${theme.editor.canvas.nodeHoverBorder}`,
    outlineOffset: 2,
  },
  // Полоса-индикатор вставки внутри узла (N2, [owner 2026-10-15]): толщина
  // как у связи, на концах серые точки как handle — не выходит за границы
  // блока (в отличие от подсветки колонки на канвасе, LayerDropHighlight).
  // Горизонтальная — место в колонке, вертикальная — перенос в колонку.
  dropIndicator: {
    position: 'relative',
    height: 2,
    margin: '-1px 0',
    backgroundColor: theme.editor.canvas.edge,
    pointerEvents: 'none',
    '&::before, &::after': {
      content: '""',
      position: 'absolute',
      top: -5,
      width: 12,
      height: 12,
      borderRadius: '50%',
      backgroundColor: theme.editor.canvas.handle,
      boxShadow: `0 1px 3px ${theme.editor.canvas.handleShadow}`,
    },
    '&::before': { left: -6 },
    '&::after': { right: -6 },
  },
  dropIndicatorVertical: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    width: 2,
    marginLeft: -1,
    backgroundColor: theme.editor.canvas.edge,
    pointerEvents: 'none',
    zIndex: 1,
    '&::before, &::after': {
      content: '""',
      position: 'absolute',
      left: -5,
      width: 12,
      height: 12,
      borderRadius: '50%',
      backgroundColor: theme.editor.canvas.handle,
      boxShadow: `0 1px 3px ${theme.editor.canvas.handleShadow}`,
    },
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
