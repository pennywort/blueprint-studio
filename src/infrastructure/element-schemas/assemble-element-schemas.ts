import type {
  AttributeOption,
  ElementAttribute,
  ElementAttributeType,
  ElementSchema,
} from '@application/ports/element-schema-provider';

// Сборка описаний элементов: JSON-схема + политика редактора → ElementSchema
// (этап 3 docs/schemas/PLAN.md). Одна функция на два места: провайдер при
// старте приложения и `npm run schemas:check` / `schemas:import` (Node без
// сборки, поэтому здесь только `import type` и синтаксис, который Node
// снимает сам: без enum, namespace и параметров-свойств).
//
// Политика — данные, а не ветвления (§4a): состав элементов, видимые
// атрибуты, обязательность, порядок, подписи. Она только СУЖАЕТ схему: тип
// значения выводится из схемы, enum политики ⊆ enum схемы, обязательное в
// схеме нельзя сделать необязательным. Нарушение — ошибка со списком всех
// расхождений.

/** Версия формата схем, которую понимает редактор (format.ts генератора). */
export const SUPPORTED_FORMAT_VERSION = 2;

type JsonSchema = Record<string, unknown>;

/** Бандл схем: элементы по x-element-type и общие схемы для $ref. */
export type SchemaBundle = {
  'x-format-version': number;
  shared: Record<string, JsonSchema>;
  elements: Record<string, JsonSchema>;
};

export type PolicyAttribute = {
  key: string;
  label?: string;
  required?: boolean;
  placeholder?: string;
  helperText?: string;
  multiline?: boolean;
  section?: string;
  /** Вид редактора enum: переключатели вместо выпадающего списка. */
  widget?: 'radio';
  /** Подмножество enum схемы с подписями; без него — весь enum. */
  options?: AttributeOption[];
  /** Ключи id и подписи элемента массива объектов (optionList). */
  item?: { id: string; label: string };
  visibleWhen?: { key: string; equals: unknown };
};

export type PolicyElement = {
  kind: string;
  label?: string;
  category: string;
  description?: string;
  card?: { title?: string; subtitle?: string; badge?: string };
  defaults?: Record<string, unknown>;
  attributes: PolicyAttribute[];
};

export type EditorPolicy = {
  elements: PolicyElement[];
};

export type SchemaSources = {
  framework: unknown;
  project: unknown;
  policy: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// Тип значения свойства схемы, каким его редактирует панель атрибутов.
type ValueKind =
  | { type: 'bool' | 'number' | 'text' | 'stringList' }
  | { type: 'enum'; values: readonly string[] }
  | { type: 'objectList'; item: JsonSchema };

function checkBundle(raw: unknown, name: string, errors: string[]): SchemaBundle | null {
  if (!isRecord(raw) || !isRecord(raw.elements) || !isRecord(raw.shared)) {
    errors.push(`${name}: ожидается объект { x-format-version, shared, elements }`);
    return null;
  }
  const version = raw['x-format-version'];
  if (version !== SUPPORTED_FORMAT_VERSION) {
    errors.push(
      `${name}: x-format-version ${String(version)}, редактор понимает ${SUPPORTED_FORMAT_VERSION} — обновите редактор или схемы`,
    );
    return null;
  }
  return raw as SchemaBundle;
}

// $ref на общую схему пакета: «../shared/icon.schema.json#» → shared['icon.schema.json'].
function resolveRef(schema: JsonSchema, shared: Record<string, JsonSchema>): JsonSchema {
  const ref = schema.$ref;
  if (typeof ref !== 'string') {
    return schema;
  }
  const file = ref.replace(/#.*$/, '').split('/').pop() ?? '';
  return shared[file] ?? schema;
}

// Свойства элемента: общая база (allOf + $ref) и собственные props элемента.
function elementProperties(
  schema: JsonSchema,
  shared: Record<string, JsonSchema>,
): Record<string, JsonSchema> {
  const base = (Array.isArray(schema.allOf) ? schema.allOf : [])
    .filter(isRecord)
    .map((part) => resolveRef(part, shared))
    .map((part) => (isRecord(part.properties) ? part.properties : {}));
  return Object.assign({}, ...base, isRecord(schema.properties) ? schema.properties : {}) as Record<
    string,
    JsonSchema
  >;
}

function elementRequired(schema: JsonSchema, shared: Record<string, JsonSchema>): Set<string> {
  const parts = [schema, ...(Array.isArray(schema.allOf) ? schema.allOf.filter(isRecord) : [])].map((part) =>
    resolveRef(part, shared),
  );
  return new Set(parts.flatMap((part) => (Array.isArray(part.required) ? part.required.map(String) : [])));
}

function valueKind(raw: JsonSchema, shared: Record<string, JsonSchema>): ValueKind | null {
  const schema = resolveRef(raw, shared);
  // anyOf: значение по одной из ветвей — редактор пишет первую простую
  // (строка из «строка | объект»): это сужение, тип значения остаётся допустимым.
  if (Array.isArray(schema.anyOf)) {
    for (const branch of schema.anyOf.filter(isRecord)) {
      const kind = valueKind(branch, shared);
      if (kind && kind.type !== 'objectList') {
        return kind;
      }
    }
    return null;
  }
  const types = (Array.isArray(schema.type) ? schema.type : [schema.type]).filter((type) => type !== 'null');
  if (types.length !== 1) {
    return null;
  }
  switch (types[0]) {
    case 'boolean':
      return { type: 'bool' };
    case 'number':
    case 'integer':
      return Array.isArray(schema.enum) ? null : { type: 'number' };
    case 'string':
      return Array.isArray(schema.enum)
        ? { type: 'enum', values: schema.enum.filter((value) => typeof value === 'string') }
        : { type: 'text' };
    case 'array': {
      const item = isRecord(schema.items) ? resolveRef(schema.items, shared) : null;
      if (!item) {
        return null;
      }
      if (item.type === 'string') {
        return { type: 'stringList' };
      }
      return item.type === 'object' && isRecord(item.properties) ? { type: 'objectList', item } : null;
    }
    default:
      return null;
  }
}

// Нейтральное значение обязательного поля нового элемента массива.
function neutralValue(schema: JsonSchema): unknown {
  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;
  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    return schema.enum[0];
  }
  switch (type) {
    case 'boolean':
      return false;
    case 'number':
    case 'integer':
      return 0;
    case 'array':
      return [];
    default:
      return '';
  }
}

function matchesKind(kind: ValueKind, value: unknown): boolean {
  switch (kind.type) {
    case 'bool':
      return typeof value === 'boolean';
    case 'number':
      return typeof value === 'number';
    case 'text':
      return typeof value === 'string';
    case 'enum':
      return typeof value === 'string' && kind.values.includes(value);
    case 'stringList':
      return Array.isArray(value) && value.every((item) => typeof item === 'string');
    case 'objectList':
      return Array.isArray(value) && value.every(isRecord);
  }
}

function assembleAttribute(
  policy: PolicyAttribute,
  property: JsonSchema,
  schemaRequired: boolean,
  shared: Record<string, JsonSchema>,
  fail: (message: string) => void,
): ElementAttribute | null {
  const kind = valueKind(property, shared);
  if (!kind) {
    fail('тип значения в схеме не поддерживается редактором — уберите атрибут из политики');
    return null;
  }
  if (schemaRequired && policy.required === false) {
    fail('обязателен в схеме — политика не может снять обязательность');
  }
  const attribute: ElementAttribute = {
    key: policy.key,
    type: 'text',
    required: schemaRequired || policy.required === true,
    label: policy.label ?? policy.key,
  };
  for (const field of ['placeholder', 'helperText', 'section'] as const) {
    if (policy[field] !== undefined) {
      attribute[field] = policy[field];
    }
  }
  if (policy.visibleWhen) {
    attribute.visibleWhen = policy.visibleWhen;
  }
  if (policy.multiline && kind.type !== 'text') {
    fail('multiline — только у строкового атрибута');
  }
  if ((policy.options || policy.widget) && kind.type !== 'enum') {
    fail('options/widget — только у атрибута с enum в схеме');
  }
  if (policy.item && kind.type !== 'objectList') {
    fail('item — только у массива объектов');
  }

  switch (kind.type) {
    case 'enum': {
      const options = policy.options ?? kind.values.map((value) => ({ value, label: value }));
      const extra = options.filter((option) => !kind.values.includes(option.value));
      if (extra.length > 0) {
        fail(`варианты ${extra.map((option) => option.value).join(', ')} отсутствуют в enum схемы`);
      }
      attribute.type = policy.widget === 'radio' ? 'radio' : 'select';
      attribute.options = options;
      return attribute;
    }
    case 'objectList': {
      const properties = isRecord(kind.item.properties)
        ? (kind.item.properties as Record<string, JsonSchema>)
        : {};
      const keys = policy.item ? [policy.item.id, policy.item.label] : [];
      const invalid = keys.filter((key) => properties[key]?.type !== 'string');
      if (!policy.item || invalid.length > 0) {
        fail('массив объектов: политика задаёт item { id, label } — строковые поля элемента массива');
        return null;
      }
      const required = Array.isArray(kind.item.required) ? kind.item.required.map(String) : [];
      const template = Object.fromEntries(required.map((key) => [key, neutralValue(properties[key] ?? {})]));
      attribute.type = 'optionList';
      attribute.item = { idKey: policy.item.id, labelKey: policy.item.label, template };
      return attribute;
    }
    case 'text':
      attribute.type = 'text';
      if (policy.multiline) {
        attribute.multiline = true;
      }
      return attribute;
    default:
      attribute.type = kind.type as ElementAttributeType;
      return attribute;
  }
}

function assembleElement(
  policy: PolicyElement,
  schema: JsonSchema,
  source: ElementSchema['source'],
  shared: Record<string, JsonSchema>,
  errors: string[],
): ElementSchema {
  const fail = (key: string) => (message: string) => errors.push(`${policy.kind}.${key}: ${message}`);
  const properties = elementProperties(schema, shared);
  const required = elementRequired(schema, shared);
  const attributes: ElementAttribute[] = [];
  const seen = new Set<string>();

  for (const attributePolicy of policy.attributes) {
    const property = properties[attributePolicy.key];
    if (seen.has(attributePolicy.key)) {
      fail(attributePolicy.key)('атрибут указан в политике дважды');
      continue;
    }
    seen.add(attributePolicy.key);
    if (!property) {
      fail(attributePolicy.key)('нет в схеме элемента');
      continue;
    }
    const attribute = assembleAttribute(
      attributePolicy,
      property,
      required.has(attributePolicy.key),
      shared,
      fail(attributePolicy.key),
    );
    if (attribute) {
      attributes.push(attribute);
    }
  }

  for (const attribute of attributes) {
    if (attribute.visibleWhen && !seen.has(attribute.visibleWhen.key)) {
      fail(attribute.key)(`visibleWhen ссылается на атрибут вне политики: ${attribute.visibleWhen.key}`);
    }
  }

  const card = policy.card ?? {};
  for (const key of [card.title, card.subtitle, card.badge]) {
    if (key !== undefined && !properties[key]) {
      fail(`card.${key}`)('нет в схеме элемента');
    }
  }

  const defaults = policy.defaults ?? {};
  for (const [key, value] of Object.entries(defaults)) {
    const property = properties[key];
    const kind = property ? valueKind(property, shared) : null;
    if (!kind || !matchesKind(kind, value)) {
      fail(`defaults.${key}`)('значения нет в схеме или оно не подходит по типу');
    }
  }

  const title = typeof schema.title === 'string' ? schema.title : policy.kind;
  return {
    kind: policy.kind,
    source,
    label: policy.label ?? title,
    category: policy.category,
    ...(policy.description ? { description: policy.description } : null),
    card,
    defaults,
    attributes,
  };
}

/**
 * Схемы фреймворка и проекта + политика → описания элементов в порядке
 * политики. Бросает Error со списком всех расхождений.
 */
export function assembleElementSchemas(sources: SchemaSources): ElementSchema[] {
  const errors: string[] = [];
  const framework = checkBundle(sources.framework, 'схемы фреймворка', errors);
  const project = checkBundle(sources.project, 'схемы проекта', errors);
  const policy = sources.policy;
  if (!isRecord(policy) || !Array.isArray(policy.elements)) {
    errors.push('политика: ожидается объект { elements: [...] }');
  }
  if (!framework || !project || errors.length > 0) {
    throw new Error(`Схемы элементов не загружены:\n${errors.join('\n')}`);
  }

  for (const kind of Object.keys(project.elements)) {
    if (kind in framework.elements) {
      errors.push(`${kind}: схема проекта совпадает по имени со схемой фреймворка`);
    }
  }
  const shared = { ...framework.shared, ...project.shared };
  const kinds = new Set<string>();
  const result: ElementSchema[] = [];

  for (const element of (policy as EditorPolicy).elements) {
    if (!isRecord(element) || typeof element.kind !== 'string' || !Array.isArray(element.attributes)) {
      errors.push(`политика: элемент без kind или attributes: ${JSON.stringify(element)}`);
      continue;
    }
    if (kinds.has(element.kind)) {
      errors.push(`${element.kind}: элемент указан в политике дважды`);
      continue;
    }
    kinds.add(element.kind);
    const frameworkSchema = framework.elements[element.kind];
    const schema = frameworkSchema ?? project.elements[element.kind];
    if (!schema) {
      errors.push(`${element.kind}: нет ни в схемах фреймворка, ни в схемах проекта`);
      continue;
    }
    result.push(assembleElement(element, schema, frameworkSchema ? 'framework' : 'project', shared, errors));
  }

  if (errors.length > 0) {
    throw new Error(`Политика редактора не соответствует схемам элементов:\n${errors.join('\n')}`);
  }
  return result;
}
