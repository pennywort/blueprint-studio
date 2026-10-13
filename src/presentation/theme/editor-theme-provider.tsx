import { useMemo, type ReactNode } from 'react';
import { ThemeProvider } from '@blueprint-vendor/flamingo-core';
import { createEditorTheme, type EditorThemeName } from './editor-theme';

// Провайдер темы редактора (D6): единственное место, где тема собирается.
// Переключателя тем нет, но смена темы = другое значение пропа name,
// компоненты не трогаем.
export function EditorThemeProvider({
  name = 'light',
  children,
}: {
  name?: EditorThemeName;
  children: ReactNode;
}) {
  const theme = useMemo(() => createEditorTheme(name), [name]);
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
