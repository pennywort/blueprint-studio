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
    // Одна рамка: тот же outline, что у выделения, цветом ошибки (без второго
    // кольца тенью); выделение важнее — его селектор специфичнее (T-043).
    outline: `2px solid ${theme.palette.error.main}`,
    outlineOffset: 2,
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
  // Линия-индикатор места вставки карточки (N2).
  dropIndicator: {
    height: 2,
    borderRadius: 1,
    backgroundColor: theme.editor.canvas.edge,
    margin: '-1px 0',
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
  expandButton: {
    alignSelf: 'center',
    textTransform: 'none',
  },
}));
