import { makeStyles } from '@material-ui/core';
import type { EditorTheme } from '@presentation/theme/editor-theme';

// Общие классы набросков (element-sketches, [owner 2026-11-05]): один статичный
// лист makeStyles без props — стили не пересчитываются на рендер, карточек на
// стенде ~1100 (R-PERF-10).
export const useSketchStyles = makeStyles<EditorTheme>((theme) => ({
  // Иконка + тексты; лишнее обрезается — высота карточки фиксирована.
  row: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: theme.spacing(1.5),
    flexGrow: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  texts: {
    flexGrow: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(0.5),
  },
  title: {
    ...theme.typography.body2,
    overflowWrap: 'anywhere',
  },
  caption: {
    ...theme.typography.caption,
    color: theme.palette.text.secondary,
    overflowWrap: 'anywhere',
  },
  iconWrap: {
    width: 40,
    height: 40,
    flexShrink: 0,
    borderRadius: theme.editor.shape.icon,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.editor.canvas.controlsBackground,
    color: theme.palette.text.secondary,
  },
}));
