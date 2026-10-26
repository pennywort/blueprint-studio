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
 * 2 — общая часть в shared/base-element.schema.json (генерируется из кода): элемент
 *     подключает её через allOf + $ref, в properties — только свои props, дефолты общих
 *     props элемента — x-base-defaults; общие события — x-events базы (из BaseElement.on*).
 *     Дополнения без смены версии (новые необязательные ключи): секция `components` бандла
 *     и каталог src/components — схемы компонентов (ComponentSchema, x-entity: component);
 *     x-deprecated / x-replaced-by у устаревших элементов (из constants).
 */

export const FORMAT_VERSION = 2;

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
  /** handler — функция-обработчик; element — вложенный элемент (шаблон или узел). */
  'x-kind'?: 'handler' | 'element';
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

/** Событие: параметры обработчика по именам (из сигнатуры on*-свойства). */
export interface EventSchema {
  description?: string;
  parameters: Record<string, PropSchema>;
}

export interface ContainerInfo {
  /**
   * null — ограничений нет (любые дочерние элементы). Массив — только эти типы.
   * Когда во фреймворке появится типизация детей, заполнится массив; формат не меняется.
   */
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
  /** Тип устарел (LegacyElementsTypesMap / DeprecatedElementsTypes в constants). */
  'x-deprecated'?: true;
  /** Актуальный тип вместо устаревшего (LegacyElementsTypesMap). */
  'x-replaced-by'?: string;
  'x-container'?: ContainerInfo;
  /** Общая часть: [{ $ref: '../shared/base-element.schema.json#' }]. */
  allOf: Array<{ $ref: string }>;
  /** Только props элемента; общие — в базе. */
  properties: Record<string, PropSchema>;
  required: string[];
  /** Значения по умолчанию, которые элемент задаёт общим props. */
  'x-base-defaults': Record<string, JsonValue>;
  /** События элемента сверх общих (x-events базы). */
  'x-events': Record<string, EventSchema>;
  'x-methods': MethodSchema[];
}

/**
 * Компонент фреймворка: составная сущность из элементов с логикой (ComponentFactoryImpl).
 * Имя — член ElementsTypes (первый аргумент фабрики), props и контроллер — аргументы типа
 * фабрики. Унаследованный целиком набор props (props элемента или база) — ссылкой allOf + $ref,
 * а не копией; в properties — только свои props компонента.
 */
export interface ComponentSchema {
  $schema: typeof JSON_SCHEMA_DRAFT;
  $id: string;
  title: string;
  description: string;
  type: 'object';
  'x-format-version': number;
  'x-element-type': string;
  'x-entity': 'component';
  'x-category': Category;
  /** [{ $ref: схема элемента | shared/base-element }]; нет ключа — набора для ссылки нет. */
  allOf?: Array<{ $ref: string }>;
  properties: Record<string, PropSchema>;
  required: string[];
  /** Значения по умолчанию, которые компонент задаёт props из allOf. */
  'x-base-defaults': Record<string, JsonValue>;
  /** События `$emit('имя', значение)`: параметр `value` — тип значения. */
  'x-events': Record<string, EventSchema>;
  /** Методы контроллера (аргумент типа C фабрики). */
  'x-methods': MethodSchema[];
  /** Типы элементов/компонентов, из которых собран view (createElement). */
  'x-composition': string[];
  /** Именованные слоты компонента. */
  'x-slots': string[];
}

export interface SharedSchema extends PropSchema {
  $schema: typeof JSON_SCHEMA_DRAFT;
  $id: string;
  title: string;
}

/** shared/base-element.schema.json — общие props и события всех элементов. */
export interface BaseSchema {
  $schema: typeof JSON_SCHEMA_DRAFT;
  $id: string;
  title: string;
  description: string;
  type: 'object';
  'x-format-version': number;
  properties: Record<string, PropSchema>;
  required: string[];
  'x-events': Record<string, EventSchema>;
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
  shared: Record<string, SharedSchema | BaseSchema>;
  elements: Record<string, ElementSchema>;
  components: Record<string, ComponentSchema>;
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
  'x-entity',
  'x-category',
  'x-deprecated-aliases',
  'x-deprecated',
  'x-replaced-by',
  'x-container',
  'allOf',
  'properties',
  'required',
  'x-base-defaults',
  'x-events',
  'x-methods',
  'x-composition',
  'x-slots',
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

function canonicalProps(props: Record<string, PropSchema>): Record<string, PropSchema> {
  const out: Record<string, PropSchema> = {};
  for (const [k, v] of Object.entries(props)) out[k] = canonicalProp(v);
  return out;
}

function canonicalEvents(events: Record<string, EventSchema>): Record<string, EventSchema> {
  const out: Record<string, EventSchema> = {};
  for (const [k, v] of Object.entries(events)) {
    out[k] = orderKeys({ ...v, parameters: canonicalProps(v.parameters) }, ['description', 'parameters']);
  }
  return out;
}

export function canonicalElement(schema: ElementSchema): ElementSchema {
  return orderKeys(
    {
      ...schema,
      properties: canonicalProps(schema.properties),
      required: [...schema.required].sort(),
      'x-events': canonicalEvents(schema['x-events']),
    },
    ELEMENT_KEY_ORDER,
  );
}

export function canonicalComponent(schema: ComponentSchema): ComponentSchema {
  return orderKeys(
    {
      ...schema,
      properties: canonicalProps(schema.properties),
      required: [...schema.required].sort(),
      'x-events': canonicalEvents(schema['x-events']),
      'x-composition': [...new Set(schema['x-composition'])].sort(),
      'x-slots': [...new Set(schema['x-slots'])].sort(),
    },
    ELEMENT_KEY_ORDER,
  );
}

export function canonicalBase(schema: BaseSchema): BaseSchema {
  return orderKeys(
    {
      ...schema,
      properties: canonicalProps(schema.properties),
      required: [...schema.required].sort(),
      'x-events': canonicalEvents(schema['x-events']),
    },
    ELEMENT_KEY_ORDER,
  );
}

export function serialize(value: unknown): string {
  return JSON.stringify(value, null, 2) + '\n';
}
