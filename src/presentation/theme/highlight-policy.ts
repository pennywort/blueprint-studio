// Единая подсветка сущностей канваса (R-PERF-6, AGENTS.md §4a): виды
// подсветки, сущности и политика — данные. Политика лежит в теме
// (editor.highlight): приоритет и вид рамок меняются правкой значений,
// компоненты и ядро при этом не меняются.

/** Вид подсветки. Новый вид — запись здесь, в frames и priority темы. */
export const HIGHLIGHT_KINDS = ['connectHover', 'dropTarget', 'dropZone', 'selected', 'invalid'] as const;
export type HighlightKind = (typeof HIGHLIGHT_KINDS)[number];

/** Сущность с подсветкой: узел (страница, форма), шаг формы, карточка элемента. */
export const HIGHLIGHT_ENTITIES = ['node', 'step', 'card'] as const;
export type HighlightEntity = (typeof HIGHLIGHT_ENTITIES)[number];

/** Вид рамки; цвета — уже значения темы (в компонентах hex запрещён, D6). */
export type HighlightFrame = {
  color: string;
  style: 'solid' | 'dashed';
  /** Толщина: одна для всех сущностей или своя у сущности. */
  width: number | Readonly<Record<HighlightEntity, number>>;
  /** Заливка сущности под содержимым (необязательна). */
  fill?: string;
};

export type HighlightPolicy = {
  /** Порядок важности: первый активный вид побеждает, остальные не рисуются. */
  priority: readonly HighlightKind[];
  frames: Readonly<Record<HighlightKind, HighlightFrame>>;
  /**
   * Сдвиг рамки от края сущности, px: 0 — по внутреннему краю, −1 — поверх
   * собственной рамки 1px (карточка). Геометрия одна, различие — параметр.
   */
  inset: Readonly<Record<HighlightEntity, number>>;
};

/** Цвет рамки в определении темы — ссылка на токен палитры, не значение (D6). */
export type HighlightColorToken = 'edge' | 'edgeActive' | 'nodeHoverBorder' | 'nodeHoverBackground' | 'error';

/** Политика в определении темы: то же, что HighlightPolicy, но цвета — токены. */
export type HighlightPolicyDefinition = {
  priority: readonly HighlightKind[];
  frames: Readonly<
    Record<
      HighlightKind,
      Omit<HighlightFrame, 'color' | 'fill'> & { color: HighlightColorToken; fill?: HighlightColorToken }
    >
  >;
  inset: Readonly<Record<HighlightEntity, number>>;
};

/** Активные виды подсветки сущности — из стора и из локальных жестов (dnd). */
export type HighlightFlags = Partial<Record<HighlightKind, boolean>>;

// Итоговая подсветка — первый активный вид по приоритету политики; вид, не
// упомянутый в priority, отключён.
export function resolveHighlight(
  flags: HighlightFlags,
  priority: readonly HighlightKind[],
): HighlightKind | null {
  for (const kind of priority) {
    if (flags[kind]) {
      return kind;
    }
  }
  return null;
}

export function frameWidth(frame: HighlightFrame, entity: HighlightEntity): number {
  return typeof frame.width === 'number' ? frame.width : frame.width[entity];
}
