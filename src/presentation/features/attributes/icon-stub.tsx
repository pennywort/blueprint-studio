import { makeStyles } from '@blueprint-vendor/flamingo-core';
import type { EditorTheme } from '@presentation/theme/editor-theme';

// TEMPORARY: заглушка иконки фреймворка [owner 2026-10-20] — набора иконок
// целевой ДС в редакторе нет, поэтому вместо глифа — монограмма имени
// (alert_triangle → AT), *_filled — залитая плашка. Удалить, когда появятся
// настоящие иконки (docs/temporary-registry.md, п. 8).

const useStyles = makeStyles<EditorTheme>((theme) => ({
  stub: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
    borderRadius: 6,
    border: `1.5px solid ${theme.palette.text.secondary}`,
    color: theme.palette.text.secondary,
    fontSize: 9,
    fontWeight: 700,
    lineHeight: 1,
    letterSpacing: 0.2,
  },
  filled: {
    backgroundColor: theme.palette.text.secondary,
    color: theme.palette.background.paper,
  },
}));

function monogram(name: string): string {
  const words = name
    .replace(/_filled$/, '')
    .split(/[_-]+/)
    .filter(Boolean);
  const letters =
    words.length > 1
      ? words
          .slice(0, 2)
          .map((word) => word[0])
          .join('')
      : (words[0] ?? '?').slice(0, 2);
  return letters.toUpperCase();
}

export function IconStub({ name }: { name: string }) {
  const classes = useStyles();
  const filled = name.endsWith('_filled');
  return (
    <span className={`${classes.stub} ${filled ? classes.filled : ''}`} aria-hidden>
      {monogram(name)}
    </span>
  );
}
