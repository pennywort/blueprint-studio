import type {
  AttributeLock,
  AttributeOption,
  ElementCardChip,
} from '@application/ports/element-schema-provider';

// Форма политики редактора (editor-policy.json, этап 3 docs/schemas/PLAN.md):
// вынесена из assemble-element-schemas.ts (R-MOD, лимит строк). Только
// `import type` — файл читает и Node (`schemas:check`) без сборки.

/**
 * Вид поля ввода в панели — ключ `editor` политики. enum: выпадающий список,
 * переключатели, чипы, взаимоисключающие switch (switches); массив вариантов
 * (item): список (по умолчанию), загрузка файла (file), текст через
 * разделитель (text) [owner 2026-11-19].
 */
export type PolicyEditor = 'select' | 'radio' | 'chips' | 'switches' | 'file' | 'text';

export type PolicyAttribute = {
  key: string;
  label?: string;
  required?: boolean;
  placeholder?: string;
  helperText?: string;
  multiline?: boolean;
  section?: string;
  /** Поле ввода enum: выпадающий список (по умолчанию), переключатели или чипы. */
  editor?: PolicyEditor;
  /** Подмножество enum схемы с подписями; без него — весь enum. */
  options?: AttributeOption[];
  item?: { id: string; label: string }; // ключи id и подписи элемента массива (optionList)
  visibleWhen?: { key: string; equals: unknown };
  hidden?: boolean; // не в панели, настройка сохранена; не required [owner 2026-11-18]
  toggle?: boolean; // поле под переключателем, выключение снимает значение; не required [owner 2026-11-19]
  /** Вид ввода того же значения: ключ можно указать повторно с другим view [owner 2026-11-19]. */
  view?: string;
  /** bool: переключатель показывает отрицание значения («Единичный выбор» = !multiselect). */
  invert?: boolean;
  /** Значение зафиксировано, пока другой атрибут равен equals (поле недоступно). */
  lockedWhen?: AttributeLock[];
  /** Разделитель значений для editor: text. */
  delimiter?: string;
};

export type PolicyElement = {
  kind: string;
  label?: string;
  category: string;
  description?: string;
  // chips — чипы карточки по атрибутам [owner 2026-11-19].
  card?: { title?: string; subtitle?: string; badge?: string; icon?: string; chips?: ElementCardChip[] };
  /** Значения нового элемента: props схемы и надстройки ext (по ключу атрибута). */
  defaults?: Record<string, unknown>;
  attributes: PolicyAttribute[];
};

export type EditorPolicy = {
  /**
   * Атрибуты надстроек extensions.all у всех элементов политики — после своих
   * атрибутов элемента; элемент, указавший такой ключ сам, задаёт ему место.
   */
  common?: { attributes: PolicyAttribute[] };
  elements: PolicyElement[];
};
