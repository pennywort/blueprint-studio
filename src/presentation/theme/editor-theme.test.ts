import { createEditorTheme, getEditorThemeDefinition } from './editor-theme';

describe('editor theme (T-010)', () => {
  it('собирает MUI-тему с палитрой из определения', () => {
    const definition = getEditorThemeDefinition('light');
    const theme = createEditorTheme('light');

    expect(theme.palette.primary.main).toBe(definition.primary);
    expect(theme.palette.primary.contrastText).toBe(definition.primaryContrastText);
    expect(theme.palette.secondary.main).toBe(definition.switchOn);
    expect(theme.palette.text.primary).toBe(definition.textPrimary);
    expect(theme.palette.text.secondary).toBe(definition.textSecondary);
    expect(theme.palette.background.default).toBe(definition.background);
    expect(theme.palette.background.paper).toBe(definition.surface);
    expect(theme.palette.divider).toBe(definition.divider);
  });

  it('несёт токены canvas/react-flow в поле editor.canvas', () => {
    const definition = getEditorThemeDefinition('light');
    const theme = createEditorTheme('light');

    expect(theme.editor.canvas).toEqual(definition.canvas);
    expect(theme.editor.chipAccent).toBe(definition.chipAccent);
  });

  it('по умолчанию использует светлую тему и создаёт независимый объект', () => {
    const first = createEditorTheme();
    const second = createEditorTheme('light');

    expect(first).not.toBe(second);
    expect(first.editor.canvas).toEqual(second.editor.canvas);
  });

  it('неизвестная тема — ошибка (новые темы добавляются в реестр, а не в компоненты)', () => {
    expect(() => createEditorTheme('unknown' as never)).toThrow('Неизвестная тема редактора');
  });
});
