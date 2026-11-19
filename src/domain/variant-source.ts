import type { CanvasElement } from './model/canvas-element';
import type { EditorRules } from './editor-rules';
import { elementVariants, kindRules } from './element-kinds';

// Источник вариантов элемента выбора (Selection list) [owner 2026-11-19]:
// вручную (кнопка «Значение» под элементом и список в панели), файлом CSV
// или текстом через разделитель. Способ — надстройка ext элемента; варианты
// всегда одни — массив вариантов вида (таблица variants element-kinds), файл
// и текст только заполняют его. Ключи — поля схемы проекта (extensions.byKind).

/** Ключ способа заполнения вариантов в ext. */
export const VARIANTS_SOURCE_KEY = 'optionsSource';

export const VARIANTS_SOURCE = { file: 'file', manual: 'manual', text: 'text' } as const;

/** Ключ типа группы вариантов в ext: select — Select фреймворка, прочие реализует разработчик. */
export const GROUP_TYPE_KEY = 'groupType';

export const GROUP_TYPE = { radio: 'radio', checkbox: 'checkbox', select: 'select', chips: 'chips' } as const;

/** Форма варианта в массиве: ключи id и подписи, обязательные поля нового варианта. */
export type VariantShape = {
  idKey: string;
  labelKey: string;
  template?: Readonly<Record<string, unknown>>;
};

type VariantItem = Record<string, unknown>;

/** Под элементом на канвасе есть кнопка «Значение»: способ — вручную, предел не достигнут. */
export function canAddVariantOnCanvas(rules: EditorRules, element: CanvasElement): boolean {
  const rule = kindRules(rules, element.kind).variants;
  if (!rule || element.ext?.[VARIANTS_SOURCE_KEY] !== VARIANTS_SOURCE.manual) {
    return false;
  }
  return rule.max === undefined || elementVariants(rules, element).length < rule.max;
}

/**
 * Новый массив вариантов с добавленным в конец вариантом; null — у вида нет
 * вариантов или предел достигнут. Возвращает prop массива — патч props.
 */
export function appendVariant(
  rules: EditorRules,
  element: CanvasElement,
  variant: { id: string; label: string },
): { prop: string; items: unknown[] } | null {
  const rule = kindRules(rules, element.kind).variants;
  if (!rule || (rule.max !== undefined && elementVariants(rules, element).length >= rule.max)) {
    return null;
  }
  return { prop: rule.prop, items: appendVariantItem(element.props[rule.prop], rule, variant) };
}

/**
 * Массив вариантов с новым вариантом в конце — одно ядро для кнопки на
 * канвасе (appendVariant) и списка вариантов в панели атрибутов.
 */
export function appendVariantItem(
  items: unknown,
  shape: VariantShape,
  variant: { id: string; label: string },
): unknown[] {
  return [
    ...(Array.isArray(items) ? items : []),
    { ...shape.template, [shape.idKey]: variant.id, [shape.labelKey]: variant.label },
  ];
}

// Подписи без пустых и повторов, порядок — первое появление.
const uniqueLabels = (labels: readonly string[]): string[] => [
  ...new Set(labels.map((label) => label.trim()).filter((label) => label.length > 0)),
];

/** Подписи вариантов из текста через разделитель («a; b; c»). */
export function splitVariantLabels(text: string, delimiter: string): string[] {
  return uniqueLabels(delimiter === '' ? [text] : text.split(delimiter));
}

// Первая ячейка строки CSV: в кавычках ("a; b" и "" внутри) или до ; , или Tab.
function firstCsvCell(line: string): string {
  if (!line.startsWith('"')) {
    return line.split(/[;,\t]/)[0] ?? '';
  }
  let cell = '';
  for (let index = 1; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (line[index + 1] !== '"') {
        return cell;
      }
      index += 1;
    }
    cell += char;
  }
  return cell;
}

/**
 * Подписи вариантов из CSV: первая ячейка каждой строки; строка-заголовок
 * шаблона (header) пропускается, BOM Excel снимается.
 */
export function csvVariantLabels(text: string, header: string): string[] {
  const BOM = 0xfeff;
  const cells = (text.charCodeAt(0) === BOM ? text.slice(1) : text)
    .split(/\r?\n/)
    .map(firstCsvCell)
    .map((cell) => cell.trim());
  return uniqueLabels(cells[0]?.toLowerCase() === header.toLowerCase() ? cells.slice(1) : cells);
}

/**
 * Варианты по новому списку подписей: вариант с той же подписью сохраняет id
 * (на него ссылаются правила «Сложной логики» и переходы); подпись без пары
 * берёт свободный вариант на той же позиции (правка текста — переименование,
 * а не новый вариант), остальные получают id от newId. Порядок — порядок подписей.
 */
export function replaceVariantLabels(
  items: readonly unknown[],
  labels: readonly string[],
  shape: VariantShape,
  newId: () => string,
): VariantItem[] {
  const pool = items.filter((item): item is VariantItem => typeof item === 'object' && item !== null);
  const used = new Set<VariantItem>();
  const exact = labels.map((label) => {
    const kept = pool.find((item) => !used.has(item) && item[shape.labelKey] === label);
    if (kept) {
      used.add(kept);
    }
    return kept;
  });
  return labels.map((label, index) => {
    const kept = exact[index];
    if (kept) {
      return kept;
    }
    const renamed = pool[index];
    if (renamed && !used.has(renamed)) {
      used.add(renamed);
      return { ...renamed, [shape.labelKey]: label };
    }
    return { ...shape.template, [shape.idKey]: newId(), [shape.labelKey]: label };
  });
}

/** Подписи вариантов массива (для показа в тексте через разделитель). */
export function variantItemLabels(items: unknown, labelKey: string): string[] {
  return (Array.isArray(items) ? items : []).flatMap((item: unknown) => {
    const label = typeof item === 'object' && item !== null ? (item as VariantItem)[labelKey] : undefined;
    return typeof label === 'string' ? [label] : [];
  });
}
