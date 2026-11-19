import { Typography, makeStyles } from '@material-ui/core';
import { darken, lighten } from '@material-ui/core/styles';
import { editorIcons } from '@presentation/icons/editor-icons';
import type { EditorTheme } from '@presentation/theme/editor-theme';

// Предупреждение над зафиксированным полем (notice правила lockedWhen политики,
// [owner 2026-11-19]). TEMPORARY: вид Alert severity="warning" из
// @material-ui/lab (пакет не установлен, AGENTS.md §3) — собран из core, цвета —
// из palette.warning темы; с установкой lab заменить на Alert.
const useStyles = makeStyles<EditorTheme>((theme) => ({
  root: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: theme.spacing(1.5),
    padding: theme.spacing(1, 2),
    borderRadius: theme.shape.borderRadius,
    backgroundColor: lighten(theme.palette.warning.main, 0.9),
    color: darken(theme.palette.warning.main, 0.6),
  },
  icon: {
    color: theme.palette.warning.main,
    flexShrink: 0,
  },
}));

export function LockNotice({ text }: { text: string }) {
  const classes = useStyles();
  return (
    <div className={classes.root} role="alert" data-testid="lock-notice">
      <editorIcons.info className={classes.icon} fontSize="small" />
      <Typography variant="body2">{text}</Typography>
    </div>
  );
}
