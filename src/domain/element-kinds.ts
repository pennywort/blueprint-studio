import type { CanvasElement, CanvasElementKind } from './model/canvas-element';
import { toOptionId, type OptionId } from './model/ids';
import type { EditorRules } from './editor-rules';

// Реестр видов элементов (R-CFG-1, F01/F02/F13, [owner 2026-10-16]): что умеет
// вид элемента — данные, а не ветвления `kind === 'select' / 'comment'`.
// Изменить возможность вида = поправить строку таблицы; новый вид — новая
// строка, проверки не меняются. Вид без строки — обычный элемент (ELEMENT):
// состав видов задаёт политика редактора (этап 3 docs/schemas/PLAN.md),
// здесь — только отличия поведения. Таблица ниже — умолчания; действующая
// приходит в EditorRules из настроек редактора (R-ADM).

/** Семейство вида: элемент или комментарий-элемент (вне связей и логики). */
export type ElementKindFamily = 'element' | 'comment';

/**
 * Варианты выбора элемента — источники правил «Сложной логики» (L5) и
 * переходов между шагами [owner 2026-10-14]: массив props[prop], у варианта
 * стабильный id (на него ссылаются правила) и подпись.
 */
export interface ElementVariantsRule {
  readonly prop: string;
  readonly idKey: string;
  readonly labelKey: string;
  /** Prop выбранного по умолчанию значения: id варианта или массив id. */
  readonly defaultProp?: string;
  /** Предел числа вариантов (инвариант #2: радио-группа — не более 5). */
  readonly max?: number;
}

export interface ElementKindRules {
  readonly family: ElementKindFamily;
  /** Источник и цель связей навигации и правил (F02). */
  readonly connectable: boolean;
  /** Может быть целью правила видимости в шаге формы (F02). */
  readonly logicTarget: boolean;
  /** Есть в меню добавления элементов (тулбар, «+» шага), если вид есть в политике. */
  readonly inAddMenu: boolean;
  /** Варианты — источники переходов между шагами и (с complexLogic) логики (F01, L5). */
  readonly variants?: ElementVariantsRule;
  /**
   * Виду доступен режим «Сложная логика» (L5, [owner 2026-10-27]). Источник —
   * только политика редактора (`complexLogic` элемента, editor-policy.json):
   * в правила подставляется withElementPolicy, администратор правил его не
   * задаёт. Флаг включения у конкретного элемента — hasComplexLogic в модели.
   */
  readonly complexLogic?: boolean;
}

/** Обычный элемент — вид без строки в таблице. */
export const DEFAULT_ELEMENT_KIND: ElementKindRules = {
  family: 'element',
  connectable: true,
  logicTarget: true,
  inAddMenu: true,
};

// Значения = сегодняшнее поведение. Источник логики — элементы выбора (L5);
// комментарий — вне связей, логики и меню (кнопка тулбара) [owner 2026-10-15].
// Ключи вариантов — поля элемента массива в схеме фреймворка (select.options,
// radio-group.items).
export const DEFAULT_ELEMENT_KIND_RULES: Readonly<Record<string, ElementKindRules>> = {
  comment: {
    family: 'comment',
    connectable: false,
    logicTarget: false,
    inAddMenu: false,
  },
  select: {
    ...DEFAULT_ELEMENT_KIND,
    variants: { prop: 'options', idKey: 'id', labelKey: 'label', defaultProp: 'value' },
  },
  'radio-group': {
    ...DEFAULT_ELEMENT_KIND,
    variants: { prop: 'items', idKey: 'value', labelKey: 'label', defaultProp: 'value', max: 5 },
  },
};

export function kindRules(rules: EditorRules, kind: CanvasElementKind): ElementKindRules {
  return rules.elementKinds[kind] ?? DEFAULT_ELEMENT_KIND;
}

/** Вид комментария-элемента (kind со строкой family: 'comment'). */
export const COMMENT_KIND = 'comment';

export function isCommentElement(rules: EditorRules, element: CanvasElement): boolean {
  return kindRules(rules, element.kind).family === 'comment';
}

/** У вида есть варианты выбора — источники переходов между шагами [owner 2026-10-14]. */
export function hasElementVariants(rules: EditorRules, element: CanvasElement): boolean {
  return kindRules(rules, element.kind).variants !== undefined;
}

/**
 * Элемент может включить «Сложную логику» (L5): у вида есть варианты и режим
 * разрешён политикой редактора (complexLogic, [owner 2026-10-27]).
 */
export function canBeLogicSource(rules: EditorRules, element: CanvasElement): boolean {
  const kind = kindRules(rules, element.kind);
  return kind.variants !== undefined && kind.complexLogic === true;
}

export type ElementVariant = { id: OptionId; label: string; isDefault: boolean };

/** Варианты элемента по таблице вида; у вида без вариантов — пусто. */
export function elementVariants(rules: EditorRules, element: CanvasElement): readonly ElementVariant[] {
  const rule = kindRules(rules, element.kind).variants;
  const items = rule ? element.props[rule.prop] : undefined;
  if (!rule || !Array.isArray(items)) {
    return [];
  }
  const selected = rule.defaultProp === undefined ? undefined : element.props[rule.defaultProp];
  const isDefault = (id: string) => (Array.isArray(selected) ? selected.includes(id) : selected === id);
  return items.flatMap((item: unknown) => {
    if (typeof item !== 'object' || item === null) {
      return [];
    }
    const record = item as Record<string, unknown>;
    const id = record[rule.idKey];
    const label = record[rule.labelKey];
    return typeof id === 'string' && id.length > 0
      ? [{ id: toOptionId(id), label: typeof label === 'string' ? label : '', isDefault: isDefault(id) }]
      : [];
  });
}

/** Подпись варианта по id; null — варианта нет. */
export function variantLabel(rules: EditorRules, element: CanvasElement, optionId: string): string | null {
  return elementVariants(rules, element).find((variant) => variant.id === optionId)?.label ?? null;
}
