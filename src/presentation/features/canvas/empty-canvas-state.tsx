import { Box, Typography, makeStyles } from '@blueprint-vendor/flamingo-core';
import type { EditorTheme } from '@presentation/theme/editor-theme';
import illustration from '@presentation/assets/empty-canvas-illustration.png';

export type EmptyCanvasStateProps = {
  /**
   * Есть ли в графе хотя бы один узел. Хранилище ServiceGraph появится в
   * presentation в T-030/T-035 — тогда проп заменится подпиской на граф;
   * сейчас узлов нет всегда, и заглушка видна поверх пустого канваса.
   */
  hasNodes: boolean;
};

const useStyles = makeStyles<EditorTheme>(() => ({
  root: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    // Заглушка не перехватывает события: pan/zoom канваса и клики по
    // контролам под ней работают сквозь неё.
    pointerEvents: 'none',
  },
  content: {
    display: 'flex',
    alignItems: 'center',
    gap: 48,
  },
  illustration: {
    width: 360,
    height: 'auto',
  },
}));

// Пустое состояние канваса (T-024, макет «меню-добавления-и-заглушка-пустого-
// проекта»): иллюстрация-пазлы (вырезана из макета, самописных SVG нет),
// заголовок и подсказка. Слово «стикер» из текста макета не используется —
// сущности «стикер» нет (Q-6 закрыт владельцем). Скрывается, когда в графе
// появляется первый узел.
export function EmptyCanvasState({ hasNodes }: EmptyCanvasStateProps) {
  const classes = useStyles();

  if (hasNodes) {
    return null;
  }

  return (
    <Box className={classes.root} data-testid="empty-canvas-state">
      <Box className={classes.content}>
        <img className={classes.illustration} src={illustration} alt="" />
        <Box>
          <Typography variant="h6">Здесь пока пусто</Typography>
          <Typography variant="body2" color="textSecondary">
            Добавьте первую колонку, чтобы начать проектировать сервис
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
