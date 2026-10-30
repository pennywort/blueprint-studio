import { createMuiTheme, useTheme, type Theme } from '@material-ui/core';
import type { HighlightColorToken, HighlightPolicy, HighlightPolicyDefinition } from './highlight-policy';

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
  /** Блик точки подключения (верх-лево радиального градиента, «объём», N7). */
  handleHighlight: string;
  /** Тень точки подключения (rgba с прозрачностью, N7). */
  handleShadow: string;
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
  /** Заливка рамки группового выделения (Shift+drag), рамка — edgeActive (R-PERF-9). */
  selectionBackground: string;
  /** Фон колонки, куда бросить нельзя (уровень заполнен); линии — palette.error.main. */
  dropBlockedBackground: string;
  /** Рамка карточки элемента внутри узла. */
  elementBorder: string;
  /** Фон комментария (элемент-комментарий и комментарий-часть элемента). */
  commentBackground: string;
  /** Рамка комментария. */
  commentBorder: string;
  /** Фон бейджа адресата комментария («Разработчику»). */
  commentBadgeBackground: string;
  /** Текст бейджа адресата. */
  commentBadgeForeground: string;
}

// Полная палитра темы редактора: canvas-токены + цвета, уходящие в palette
// MUI v4 (UI-кит — @material-ui напрямую [owner 2026-10-22]).
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
  /** Подсветка сущностей канваса: приоритет и вид рамок (R-PERF-6). */
  highlight: HighlightPolicyDefinition;
  /** Радиусы скругления, px (R-PERF-8): при переходе на токены ДС — правка здесь. */
  shape: EditorShape;
  /** Толщины рамок, px [owner 2026-10-30]. */
  stroke: EditorStroke;
  /** Внутренние отступы карточек, px [owner 2026-10-30]. */
  inset: EditorInset;
}

/** Радиусы скругления редактора по роли элемента. */
export interface EditorShape {
  /** Блок канваса: главная, сценарий, форма заявки [owner 2026-10-30]. */
  block: number;
  /** Шаг внутри формы (и заглушки шага) [owner 2026-10-30]. */
  step: number;
  /** Атрибутное окно (панель атрибутов) [owner 2026-10-30]. */
  panel: number;
  /** Карточка: вариант, уведомление, миникарта. */
  card: number;
  /** Карточка элемента и комментария на канвасе [owner 2026-10-22]. */
  element: number;
  /** Пилюля: панели, тулбар, кнопки-пилюли. */
  pill: number;
  /** Ярлык (chip). */
  chip: number;
  /** Плашка иконки в карточке. */
  icon: number;
  /** Мелкая плашка (заглушка иконки). */
  small: number;
}

/** Толщины рамок по роли. */
export interface EditorStroke {
  /** Собственная рамка: карточка элемента, атрибутное окно. */
  outline: number;
  /** Рамка выделенной сущности (подсветка selected). */
  selected: number;
}

/** Отступы содержимого карточки от её внешнего края (с рамкой). */
export interface EditorInset {
  /** Бейдж типа элемента — от левого и нижнего краёв карточки. */
  badge: number;
}

// Одно значение — один источник [owner 2026-10-30]: толщины читают и
// компоненты (stroke), и политика подсветки (frames.selected, inset карточки).
const STROKE: EditorStroke = { outline: 1, selected: 2 };

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
    handleHighlight: '#9a9eac',
    handleShadow: 'rgba(39, 41, 47, 0.35)',
    controlsBackground: '#e7e9ed',
    controlsHoverBackground: '#d0d3dc',
    controlsForeground: '#27292f',
    minimapBackground: '#ffffff',
    minimapNode: '#d6d7db',
    minimapMask: 'rgba(39, 41, 47, 0.08)',
    minimapBorder: '#d7d9df',
    nodeHoverBackground: '#e8e9ee',
    nodeHoverBorder: '#d6d7db',
    selectionBackground: 'rgba(89, 108, 224, 0.08)',
    dropBlockedBackground: 'rgba(244, 67, 54, 0.08)',
    elementBorder: '#d6d7db',
    commentBackground: '#ebf5fc',
    commentBorder: '#d9eaf7',
    commentBadgeBackground: '#5d616f',
    commentBadgeForeground: '#ffffff',
  },
  highlight: {
    // Первый активный вид побеждает [owner 2026-10-22]: смена порядка —
    // перестановка здесь; вид, убранный из списка, не рисуется.
    priority: ['connectHover', 'dropTarget', 'dropZone', 'selected', 'invalid'],
    frames: {
      // Цель связи под курсором (ADR-14, [owner 2026-10-15]).
      connectHover: { color: 'edgeActive', style: 'solid', width: 2 },
      // Цель dnd / обмена шагов (T-032, [owner 2026-10-14]).
      dropTarget: { color: 'nodeHoverBorder', style: 'solid', width: 2, fill: 'nodeHoverBackground' },
      // Зона приёма карточек во время dnd (N2).
      dropZone: { color: 'nodeHoverBorder', style: 'dashed', width: 2 },
      // Выделение (F7, S10): узел и шаг — 2px, карточка — 2px поверх своей рамки 1px.
      selected: { color: 'edge', style: 'solid', width: STROKE.selected },
      // Нарушение инварианта (T-043): узел 2px, карточка — цвет своей рамки 1px.
      invalid: {
        color: 'error',
        style: 'solid',
        width: { node: STROKE.selected, step: STROKE.selected, card: STROKE.outline },
      },
    },
    // Карточка с рамкой 1px (variant outlined): подсветка ложится поверх неё.
    inset: { node: 0, step: 0, card: -STROKE.outline },
  },
  // Значения из макетов docs/design-mockups [owner 2026-10-30].
  shape: { block: 24, step: 16, panel: 24, card: 12, element: 24, pill: 24, chip: 16, icon: 8, small: 6 },
  stroke: STROKE,
  inset: { badge: 16 },
};

const editorThemeDefinitions: Record<EditorThemeName, EditorThemeDefinition> = {
  light: lightTheme,
};

// Тема редактора = MUI v4 тема + наши токены в поле `editor`.
// Собственное поле (а не module augmentation) выбрано сознательно: при замене
// UI-кита augmentation модулей MUI пришлось бы переписывать; поле `editor`
// переживёт замену кита.
export type EditorTheme = Theme & {
  editor: {
    chipAccent: string;
    chipAccentContrastText: string;
    switchOffTrack: string;
    secondaryButtonBackground: string;
    secondaryButtonHoverBackground: string;
    canvas: EditorCanvasPalette;
    highlight: HighlightPolicy;
    shape: EditorShape;
    stroke: EditorStroke;
    inset: EditorInset;
  };
};

// Токены цвета подсветки → значения темы (цвет ошибки — из palette MUI).
function resolveHighlightPolicy(definition: EditorThemeDefinition, errorColor: string): HighlightPolicy {
  const { canvas, highlight } = definition;
  const colors: Record<HighlightColorToken, string> = {
    edge: canvas.edge,
    edgeActive: canvas.edgeActive,
    nodeHoverBorder: canvas.nodeHoverBorder,
    nodeHoverBackground: canvas.nodeHoverBackground,
    error: errorColor,
  };
  const frames = Object.fromEntries(
    Object.entries(highlight.frames).map(([kind, frame]) => [
      kind,
      { ...frame, color: colors[frame.color], fill: frame.fill ? colors[frame.fill] : undefined },
    ]),
  ) as unknown as HighlightPolicy['frames'];
  return { priority: highlight.priority, frames, inset: highlight.inset };
}

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
      highlight: resolveHighlightPolicy(definition, muiTheme.palette.error.main),
      shape: { ...definition.shape },
      stroke: { ...definition.stroke },
      inset: { ...definition.inset },
    },
  });
}

// Хук доступа к теме редактора с готовой типизацией поля `editor`.
export function useEditorTheme(): EditorTheme {
  return useTheme<EditorTheme>();
}
