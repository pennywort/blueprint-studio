import type { AttributeOption } from '@application/ports/element-schema-provider';

// Форма политики редактора (editor-policy.json, этап 3 docs/schemas/PLAN.md):
// вынесена из assemble-element-schemas.ts (R-MOD, лимит строк). Только
// `import type` — файл читает и Node (`schemas:check`) без сборки.

/** Вид поля ввода enum в панели — ключ `editor` политики. */
export type PolicyEditor = 'select' | 'radio' | 'chips';

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
};

export type PolicyElement = {
  kind: string;
  label?: string;
  category: string;
  description?: string;
  card?: { title?: string; subtitle?: string; badge?: string; icon?: string };
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
