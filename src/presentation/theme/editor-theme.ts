import { createMuiTheme, useTheme, type Theme } from '@sber-friend/flamingo-core';

// Цветовые токены canvas/react-flow. Все значения — из макетов
// docs/design-mockups (сняты пипеткой); в компонентах литеральные hex
// запрещены (решение D6), цвета берутся только отсюда.
export interface EditorCanvasPalette {
  /** Фон канваса. */
  background: string;
  /** Точки фоновой сетки react-flow Background. */
  dots: string;
  /** Линия связи (edge) в обычном состоянии. */
  edge: string;
  /** Линия связи в выделенном/hover-состоянии. */
  edgeActive: string;
  /** Заливка точек подключения (handles). */
  handle: string;
  /** Обводка точек подключения. */
  handleBorder: string;
  /** Фон пилюль нижних контролов и левого тулбара. */
  controlsBackground: string;
  /** Фон hover/pressed у кнопок контролов. */
  controlsHoverBackground: string;
  /** Иконки и текст на контролах. */
  controlsForeground: string;
  /** Фон миникарты. */
  minimapBackground: string;
  /** Цвет узлов на миникарте. */
  minimapNode: string;
  /** Маска вьюпорта на миникарте (rgba с прозрачностью). */
  minimapMask: string;
  /** Рамка миникарты. */
  minimapBorder: string;
  /** Фон узла при hover-подсветке цели связи. */
  nodeHoverBackground: string;
  /** Рамка узла при hover-подсветке цели связи. */
  nodeHoverBorder: string;
  /** Рамка карточки элемента внутри узла. */
  elementBorder: string;
}

// Полная палитра темы редактора: canvas-токены + цвета, уходящие в palette
// MUI v4 (Flamingo — форк MUI v4, механика темы та же, D6).
export interface EditorThemeDefinition {
  /** Фон страницы/канваса. */
  background: string;
  /** Фон карточек, панелей, topbar. */
  surface: string;
  /** Основной текст. */
  textPrimary: string;
  /** Вторичный текст (подписи, placeholder). */
  textSecondary: string;
  /** Разделители и рамки полей ввода. */
  divider: string;
  /** Тёмная primary-кнопка («На согласование», «Выберите файл»). */
  primary: string;
  /** Текст на primary-кнопке. */
  primaryContrastText: string;
  /** Зелёный accent активного switch (с макетов панели атрибутов). */
  switchOn: string;
  /** Трек выключенного switch. */
  switchOffTrack: string;
  /** Синие чипы типов элементов («List item», «FAQ»). */
  chipAccent: string;
  /** Текст на чипе. */
  chipAccentContrastText: string;
  /** Фон нейтральной кнопки-пилюли («Предпросмотр» в TopBar). */
  secondaryButtonBackground: string;
  /** Фон hover нейтральной кнопки-пилюли. */
  secondaryButtonHoverBackground: string;
  canvas: EditorCanvasPalette;
}

// Реестр тем: вторая тема добавляется новой записью сюда и расширением
// EditorThemeName — компоненты при этом не меняются (D6).
export type EditorThemeName = 'light';

const lightTheme: EditorThemeDefinition = {
  background: '#f9f9fb',
  surface: '#ffffff',
  textPrimary: '#27292f',
  textSecondary: '#9498a7',
  divider: '#d7d9df',
  primary: '#33353d',
  primaryContrastText: '#ffffff',
  switchOn: '#489f99',
  switchOffTrack: '#cbced5',
  chipAccent: '#596ce0',
  chipAccentContrastText: '#ffffff',
  secondaryButtonBackground: '#e7e9ed',
  secondaryButtonHoverBackground: '#d0d3dc',
  canvas: {
    background: '#f9f9fb',
    dots: '#e7e9ed',
    edge: '#5d616f',
    edgeActive: '#596ce0',
    handle: '#5d616f',
    handleBorder: '#ffffff',
    controlsBackground: '#e7e9ed',
    controlsHoverBackground: '#d0d3dc',
    controlsForeground: '#27292f',
    minimapBackground: '#ffffff',
    minimapNode: '#d6d7db',
    minimapMask: 'rgba(39, 41, 47, 0.08)',
    minimapBorder: '#d7d9df',
    nodeHoverBackground: '#e8e9ee',
    nodeHoverBorder: '#d6d7db',
    elementBorder: '#d6d7db',
  },
};

const editorThemeDefinitions: Record<EditorThemeName, EditorThemeDefinition> = {
  light: lightTheme,
};

// Тема редактора = MUI v4 тема + наши токены в поле `editor`.
// Собственное поле (а не module augmentation) выбрано сознательно: временный
// шим Flamingo поверх @material-ui уйдёт, и augmentation целевых модулей
// MUI пришлось бы переписывать; поле `editor` переживёт замену кита.
export type EditorTheme = Theme & {
  editor: {
    chipAccent: string;
    chipAccentContrastText: string;
    switchOffTrack: string;
    secondaryButtonBackground: string;
    secondaryButtonHoverBackground: string;
    canvas: EditorCanvasPalette;
  };
};

export function getEditorThemeDefinition(name: EditorThemeName = 'light'): EditorThemeDefinition {
  return editorThemeDefinitions[name];
}

export function createEditorTheme(name: EditorThemeName = 'light'): EditorTheme {
  const definition = editorThemeDefinitions[name];
  if (!definition) {
    throw new Error(`Неизвестная тема редактора: ${name}`);
  }

  const muiTheme = createMuiTheme({
    palette: {
      primary: {
        main: definition.primary,
        contrastText: definition.primaryContrastText,
      },
      // В MUI v4 Switch по умолчанию color="secondary": зелёный accent
      // активного switch с макетов ложится в secondary.main.
      secondary: {
        main: definition.switchOn,
      },
      text: {
        primary: definition.textPrimary,
        secondary: definition.textSecondary,
      },
      background: {
        default: definition.background,
        paper: definition.surface,
      },
      divider: definition.divider,
    },
    overrides: {
      // Switch с макетов: включён — зелёный трек + белый ползунок,
      // выключен — серый трек + белый ползунок.
      MuiSwitch: {
        track: {
          backgroundColor: definition.switchOffTrack,
          opacity: 1,
        },
        switchBase: {
          '&$checked': {
            color: definition.surface,
          },
          '&$checked + $track': {
            backgroundColor: definition.switchOn,
            opacity: 1,
          },
        },
      },
      MuiChip: {
        colorSecondary: {
          backgroundColor: definition.chipAccent,
          color: definition.chipAccentContrastText,
        },
      },
    },
  });

  return Object.assign(muiTheme, {
    editor: {
      chipAccent: definition.chipAccent,
      chipAccentContrastText: definition.chipAccentContrastText,
      switchOffTrack: definition.switchOffTrack,
      secondaryButtonBackground: definition.secondaryButtonBackground,
      secondaryButtonHoverBackground: definition.secondaryButtonHoverBackground,
      canvas: { ...definition.canvas },
    },
  });
}

// Хук доступа к теме редактора с готовой типизацией поля `editor`.
export function useEditorTheme(): EditorTheme {
  return useTheme<EditorTheme>();
}
