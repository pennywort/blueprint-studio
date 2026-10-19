/**
 * ФОРМАТ СХЕМЫ ЭЛЕМЕНТА — единственный источник правды о том, что лежит в *.schema.json.
 *
 * Правила:
 * - выход генератора собирается только из этих типов → формат проверяет компилятор;
 * - порядок ключей задают KEY_ORDER-таблицы ниже (canonicalize), а не порядок кода;
 * - ломающее изменение формата = FORMAT_VERSION + 1 и строка в CHANGELOG ниже.
 *
 * CHANGELOG
 * 1 — первая зафиксированная версия: x-element-type, x-deprecated-aliases, x-container,
 *     x-ts-type вместо пустой схемы, anyOf вместо oneOf, без x-defaults (дефолт — в свойстве).
 */

export const FORMAT_VERSION = 1;

export const JSON_SCHEMA_DRAFT = 'http://json-schema.org/draft-07/schema#';

export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export type JsonType = 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array' | 'null';

export type Category = 'basic' | 'form' | 'layout' | 'overlay';

/** Схема значения: подмножество draft-07 + расширения x-*. */
export interface PropSchema {
  $ref?: string;
  type?: JsonType | JsonType[];
  const?: JsonValue;
  /** Только 'date-time' (Date). */
  format?: 'date-time';
  enum?: JsonValue[];
  items?: PropSchema;
  properties?: Record<string, PropSchema>;
  required?: string[];
  additionalProperties?: PropSchema | boolean;
  anyOf?: PropSchema[];
  /** Генератор не выпускает; допустим только в ручной базе (base-element). */
  oneOf?: PropSchema[];
  description?: string;
  default?: JsonValue;
  /** Имя TS-типа, в котором объявлено свойство (только у props верхнего уровня). */
  'x-declared-in'?: string;
  /** Значение — функция-обработчик, а не данные. */
  'x-kind'?: 'handler';
  /** Тип не выражен схемой: исходный текст TS-типа. Причина — в отчёте. */
  'x-ts-type'?: string;
}

export interface MethodParam {
  name: string;
  type: string;
  optional: boolean;
}

export interface MethodSchema {
  name: string;
  returnType: string;
  parameters: MethodParam[];
}

/** События пока берутся из ручной базы (base-events) как есть. */
export type EventSchema = { [key: string]: JsonValue };

export interface ContainerInfo {
  /** null — контейнер, но список допустимых типов не извлечён. */
  allowedChildren: string[] | null;
}

export interface ElementSchema {
  $schema: typeof JSON_SCHEMA_DRAFT;
  $id: string;
  title: string;
  description: string;
  type: 'object';
  'x-format-version': number;
  'x-element-type': string;
  'x-category': Category;
  'x-deprecated-aliases': string[];
  'x-container'?: ContainerInfo;
  properties: Record<string, PropSchema>;
  required: string[];
  'x-events': Record<string, EventSchema>;
  'x-methods': MethodSchema[];
}

export interface SharedSchema extends PropSchema {
  $schema: typeof JSON_SCHEMA_DRAFT;
  $id: string;
  title: string;
}

export interface ManifestEntry {
  path: string;
  title: string;
  deprecatedAliases: string[];
}

export type Manifest = Record<string, ManifestEntry>;

// ─── Отчёт ───────────────────────────────────────────────────────────────────

export type Severity = 'error' | 'warn' | 'info';

export interface Diagnostic {
  code: string;
  severity: Severity;
  /** Путь внутри схемы: props.leftAtom.anyOf[2].icon */
  path: string;
  message: string;
}

export interface SharedCandidate {
  type: string;
  file: string;
  usedIn: string[];
}

export interface Report {
  /** Количество диагностик по кодам. */
  summary: Record<string, number>;
  elements: Record<string, Diagnostic[]>;
  sharedCandidates: SharedCandidate[];
}

/** Один файл со всем результатом прогона --all --bundle. */
export interface Bundle {
  'x-format-version': number;
  shared: Record<string, SharedSchema>;
  elements: Record<string, ElementSchema>;
  report: Report;
}

// ─── Канонический порядок ключей ─────────────────────────────────────────────

const ELEMENT_KEY_ORDER = [
  '$schema',
  '$id',
  'title',
  'description',
  'type',
  'x-format-version',
  'x-element-type',
  'x-category',
  'x-deprecated-aliases',
  'x-container',
  'properties',
  'required',
  'x-events',
  'x-methods',
];

const PROP_KEY_ORDER = [
  '$schema',
  '$id',
  'title',
  'description',
  'x-declared-in',
  'x-kind',
  '$ref',
  'type',
  'const',
  'format',
  'enum',
  'items',
  'properties',
  'required',
  'additionalProperties',
  'anyOf',
  'oneOf',
  'x-ts-type',
  'default',
];

function orderKeys<T extends object>(obj: T, order: readonly string[]): T {
  const rank = (k: string): number => {
    const i = order.indexOf(k);
    return i === -1 ? order.length : i;
  };
  const keys = Object.keys(obj).sort(
    (a, b) => rank(a) - rank(b) || (rank(a) === order.length ? a.localeCompare(b) : 0),
  );
  const out: Record<string, unknown> = {};
  for (const k of keys) out[k] = (obj as Record<string, unknown>)[k];
  return out as T;
}

export function canonicalProp(schema: PropSchema): PropSchema {
  const s: PropSchema = { ...schema };
  if (s.items) s.items = canonicalProp(s.items);
  if (s.properties) {
    const props: Record<string, PropSchema> = {};
    for (const [k, v] of Object.entries(s.properties)) props[k] = canonicalProp(v);
    s.properties = props;
  }
  if (s.additionalProperties && typeof s.additionalProperties === 'object') {
    s.additionalProperties = canonicalProp(s.additionalProperties);
  }
  if (s.anyOf) s.anyOf = s.anyOf.map(canonicalProp);
  if (s.oneOf) s.oneOf = s.oneOf.map(canonicalProp);
  return orderKeys(s, PROP_KEY_ORDER);
}

export function canonicalElement(schema: ElementSchema): ElementSchema {
  const props: Record<string, PropSchema> = {};
  for (const [k, v] of Object.entries(schema.properties)) props[k] = canonicalProp(v);
  return orderKeys(
    { ...schema, properties: props, required: [...schema.required].sort() },
    ELEMENT_KEY_ORDER,
  );
}

export function serialize(value: unknown): string {
  return JSON.stringify(value, null, 2) + '\n';
}
