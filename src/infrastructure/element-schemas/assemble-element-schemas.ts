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

/**
 * Надстройки проекта над схемой [owner 2026-10-22]: свои атрибуты для всех
 * элементов (all) и для одного kind (byKind) — объектные схемы
 * { properties, required }. Только добавляют: ключ, совпавший со свойством
 * элемента или между all и byKind, — ошибка. Значения хранятся в ext элемента.
 */
export type SchemaExtensions = {
  all?: JsonSchema;
  byKind?: Record<string, JsonSchema>;
};

/**
 * Бандл схем: элементы и компоненты по x-element-type, общие схемы для $ref.
 * Компоненты (`ComponentFactoryImpl`, этап 4) — только у фреймворка,
 * надстройки (extensions) — только у схем проекта.
 */
export type SchemaBundle = {
  'x-format-version': number;
  shared: Record<string, JsonSchema>;
  elements: Record<string, JsonSchema>;
  components?: Record<string, JsonSchema>;
  extensions?: SchemaExtensions;
};

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
  /**
   * Атрибуты надстроек extensions.all у всех элементов политики — после своих
   * атрибутов элемента; элемент, указавший такой ключ сам, задаёт ему место.
   */
  common?: { attributes: PolicyAttribute[] };
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
// editor — редактор enum, заданный общей схемой (SHARED_ENUM_EDITORS).
type ValueKind =
  | { type: 'bool' | 'number' | 'text' | 'stringList' }
  | { type: 'enum'; values: readonly string[]; editor?: ElementAttributeType }
  | { type: 'enumList'; values: readonly string[] }
  | { type: 'objectList'; item: JsonSchema };

// Поле ввода значения с вариантами по ключу `editor` политики: вид значения →
// допустимые editor и редактор по умолчанию. Новый способ выбора — запись в
// таблице (§4a), несовместимый editor — ошибка `schemas:check`.
const CHOICE_EDITORS: Readonly<
  Record<
    'enum' | 'enumList',
    { fallback: ElementAttributeType; editors: Readonly<Partial<Record<PolicyEditor, ElementAttributeType>>> }
  >
> = {
  enum: { fallback: 'select', editors: { select: 'select', radio: 'radio', chips: 'chips' } },
  // Несколько вариантов: переключатели не подходят — для них нужны флажки.
  enumList: { fallback: 'chips', editors: { chips: 'chips', select: 'select' } },
};

const stringEnum = (schema: JsonSchema): string[] | null =>
  Array.isArray(schema.enum)
    ? schema.enum.filter((value): value is string => typeof value === 'string')
    : null;

// Общие схемы ($ref на shared/*) со своим редактором: атрибут любого
// элемента, ссылающийся на схему, получает этот редактор [owner 2026-10-20].
// Новый общий редактор — запись в таблице, не ветвление (§4a).
const SHARED_ENUM_EDITORS: Readonly<Record<string, ElementAttributeType>> = {
  'icon.schema.json': 'icon',
};

// Имя файла общей схемы из $ref («../shared/icon.schema.json#» → icon.schema.json).
function sharedRefFile(schema: JsonSchema): string | null {
  const ref = schema.$ref;
  if (typeof ref !== 'string') {
    return null;
  }
  const [dir, file] = ref.replace(/#.*$/, '').split('/').slice(-2);
  return dir === 'shared' && file ? file : null;
}

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

// Схемы, на которые ссылается $ref пакета, по файлу: «../shared/icon.schema.json#»
// → shared['icon.schema.json'], «../schemas/autocomplete.schema.json#» → схема
// элемента autocomplete (база компонента, этап 4.1a).
type RefTargets = {
  shared: Record<string, JsonSchema>;
  elements: Record<string, JsonSchema>;
};

function resolveRef(schema: JsonSchema, refs: RefTargets): JsonSchema {
  const ref = schema.$ref;
  if (typeof ref !== 'string') {
    return schema;
  }
  const [dir, file = ''] = ref.replace(/#.*$/, '').split('/').slice(-2);
  const target = dir === 'schemas' ? refs.elements[file.replace(/\.schema\.json$/, '')] : refs.shared[file];
  return target ?? schema;
}

// Части схемы с базами allOf + $ref, рекурсивно (компонент → элемент → base-element);
// база — раньше собственных частей, чтобы свои props перекрывали унаследованные.
function schemaParts(schema: JsonSchema, refs: RefTargets, seen = new Set<JsonSchema>()): JsonSchema[] {
  if (seen.has(schema)) {
    return [];
  }
  seen.add(schema);
  const bases = (Array.isArray(schema.allOf) ? schema.allOf : [])
    .filter(isRecord)
    .map((part) => resolveRef(part, refs))
    .flatMap((part) => schemaParts(part, refs, seen));
  return [...bases, schema];
}

// Свойства элемента или компонента: базы (allOf + $ref) и собственные props.
function elementProperties(schema: JsonSchema, refs: RefTargets): Record<string, JsonSchema> {
  const parts = schemaParts(schema, refs).map((part) => (isRecord(part.properties) ? part.properties : {}));
  return Object.assign({}, ...parts) as Record<string, JsonSchema>;
}

function elementRequired(schema: JsonSchema, refs: RefTargets): Set<string> {
  return new Set(
    schemaParts(schema, refs).flatMap((part) =>
      Array.isArray(part.required) ? part.required.map(String) : [],
    ),
  );
}

function valueKind(raw: JsonSchema, refs: RefTargets): ValueKind | null {
  const schema = resolveRef(raw, refs);
  // anyOf: значение по одной из ветвей — редактор пишет первую простую
  // (строка из «строка | объект»): это сужение, тип значения остаётся допустимым.
  if (Array.isArray(schema.anyOf)) {
    for (const branch of schema.anyOf.filter(isRecord)) {
      const kind = valueKind(branch, refs);
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
    case 'string': {
      if (!Array.isArray(schema.enum)) {
        return { type: 'text' };
      }
      const values = schema.enum.filter((value): value is string => typeof value === 'string');
      const shared = sharedRefFile(raw);
      const editor = shared ? SHARED_ENUM_EDITORS[shared] : undefined;
      return editor ? { type: 'enum', values, editor } : { type: 'enum', values };
    }
    case 'array': {
      const item = isRecord(schema.items) ? resolveRef(schema.items, refs) : null;
      if (!item) {
        return null;
      }
      // Массив значений enum — выбор нескольких вариантов (чипы).
      const values = stringEnum(item);
      if (values && (item.type === undefined || item.type === 'string')) {
        return { type: 'enumList', values };
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
    case 'enumList':
      return (
        Array.isArray(value) && value.every((item) => typeof item === 'string' && kind.values.includes(item))
      );
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
  store: ElementAttribute['store'],
  refs: RefTargets,
  fail: (message: string) => void,
): ElementAttribute | null {
  const kind = valueKind(property, refs);
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
    store,
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
  if ((policy.options || policy.editor) && kind.type !== 'enum' && kind.type !== 'enumList') {
    fail('options/editor — только у атрибута с enum в схеме');
  }
  if (policy.item && kind.type !== 'objectList') {
    fail('item — только у массива объектов');
  }

  switch (kind.type) {
    case 'enum':
    case 'enumList': {
      const options = policy.options ?? kind.values.map((value) => ({ value, label: value }));
      const extra = options.filter((option) => !kind.values.includes(option.value));
      if (extra.length > 0) {
        fail(`варианты ${extra.map((option) => option.value).join(', ')} отсутствуют в enum схемы`);
      }
      const choice = CHOICE_EDITORS[kind.type];
      const editor = policy.editor ? choice.editors[policy.editor] : choice.fallback;
      if (!editor) {
        fail(
          `editor ${String(policy.editor)} не подходит значению — допустимо: ${Object.keys(choice.editors).join(', ')}`,
        );
      }
      // Редактор общей схемы (иконки) важнее вида из политики.
      attribute.type = (kind.type === 'enum' ? kind.editor : undefined) ?? editor ?? choice.fallback;
      if (kind.type === 'enumList') {
        attribute.multiple = true;
      }
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

// Сокращение надстройки [owner 2026-10-23]: `"multiple": true` рядом с enum —
// множественный выбор, развёртывается в JSON-схему массива значений enum;
// `"multiple": false` или без флага — одно значение. Флаг без enum — ошибка.
function expandMultiple(property: JsonSchema, fail: (message: string) => void): JsonSchema {
  if (!('multiple' in property)) {
    return property;
  }
  const { multiple, ...rest } = property;
  const values = stringEnum(rest);
  if (typeof multiple !== 'boolean' || !values) {
    fail('multiple (true/false) — только у атрибута с enum строк');
    return rest;
  }
  if (!multiple) {
    return rest;
  }
  const { enum: _values, type: _type, ...meta } = rest;
  return { ...meta, type: 'array', items: { type: 'string', enum: values } };
}

// Надстройка с развёрнутыми сокращениями свойств (expandMultiple).
function expandExtension(schema: unknown, path: string, errors: string[]): JsonSchema | undefined {
  if (!isRecord(schema) || !isRecord(schema.properties)) {
    return isRecord(schema) ? schema : undefined;
  }
  const properties = Object.fromEntries(
    Object.entries(schema.properties).map(([key, property]) => [
      key,
      isRecord(property)
        ? expandMultiple(property, (message) => errors.push(`${path}.${key}: ${message}`))
        : property,
    ]),
  );
  return { ...schema, properties };
}

// Свойства и обязательные ключи объектной схемы надстройки.
function extensionPart(schema: JsonSchema | undefined): {
  properties: Record<string, JsonSchema>;
  required: string[];
} {
  return {
    properties: isRecord(schema?.properties) ? (schema.properties as Record<string, JsonSchema>) : {},
    required: Array.isArray(schema?.required) ? schema.required.map(String) : [],
  };
}

function assembleElement(
  policy: PolicyElement,
  common: readonly PolicyAttribute[],
  schema: JsonSchema,
  source: ElementSchema['source'],
  extensions: SchemaExtensions,
  refs: RefTargets,
  errors: string[],
): ElementSchema {
  const fail = (key: string) => (message: string) => errors.push(`${policy.kind}.${key}: ${message}`);
  const properties = elementProperties(schema, refs);
  const required = elementRequired(schema, refs);

  // Надстройки: общие (all) и этого kind (byKind) — только новые ключи.
  const all = extensionPart(extensions.all);
  const own = extensionPart(extensions.byKind?.[policy.kind]);
  for (const key of [...Object.keys(all.properties), ...Object.keys(own.properties)]) {
    if (properties[key]) {
      fail(key)('надстройка совпадает со свойством схемы элемента');
    }
  }
  for (const key of Object.keys(own.properties)) {
    if (all.properties[key]) {
      fail(key)('надстройка kind совпадает с общей надстройкой (extensions.all)');
    }
  }
  const extProperties = { ...all.properties, ...own.properties };
  const extRequired = new Set([...all.required, ...own.required]);

  const attributes: ElementAttribute[] = [];
  const seen = new Set<string>();
  const ownKeys = new Set(policy.attributes.map((attribute) => attribute.key));
  // Общие атрибуты политики — после своих, если элемент не задал им место сам.
  const listed = [...policy.attributes, ...common.filter((attribute) => !ownKeys.has(attribute.key))];

  for (const attributePolicy of listed) {
    if (seen.has(attributePolicy.key)) {
      fail(attributePolicy.key)('атрибут указан в политике дважды');
      continue;
    }
    seen.add(attributePolicy.key);
    const property = properties[attributePolicy.key];
    const extProperty = property ? undefined : extProperties[attributePolicy.key];
    if (!property && !extProperty) {
      fail(attributePolicy.key)('нет ни в схеме элемента, ни в надстройках проекта');
      continue;
    }
    const attribute = property
      ? assembleAttribute(
          attributePolicy,
          property,
          required.has(attributePolicy.key),
          'props',
          refs,
          fail(attributePolicy.key),
        )
      : assembleAttribute(
          attributePolicy,
          extProperty!,
          extRequired.has(attributePolicy.key),
          'ext',
          refs,
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
    const kind = property ? valueKind(property, refs) : null;
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
 * Замены устаревших типов фреймворка (`x-replaced-by` схем, источник — constants
 * LegacyElementsTypesMap): устаревший kind → актуальный. Читает загрузка карт
 * (persistence), чтобы старые карты открывались актуальными элементами [owner 2026-10-20].
 */
export function legacyKindReplacements(framework: unknown): Readonly<Record<string, string>> {
  const section = (key: string) =>
    isRecord(framework) && isRecord(framework[key]) ? (framework[key] as Record<string, unknown>) : {};
  const out: Record<string, string> = {};
  for (const [kind, schema] of Object.entries({ ...section('elements'), ...section('components') })) {
    const replacement = isRecord(schema) ? schema['x-replaced-by'] : undefined;
    if (typeof replacement === 'string') {
      out[kind] = replacement;
    }
  }
  return out;
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

  // Компоненты фреймворка (этап 4) — тот же kind карты, что и элементы:
  // политика ссылается на их имена, схемы проекта с ними не пересекаются.
  const frameworkKinds = { ...framework.elements, ...framework.components };
  for (const kind of Object.keys(project.elements)) {
    if (kind in frameworkKinds) {
      errors.push(`${kind}: схема проекта совпадает по имени со схемой фреймворка`);
    }
  }
  // $ref «../schemas/…» компонента — только на элементы фреймворка.
  const refs: RefTargets = {
    shared: { ...framework.shared, ...project.shared },
    elements: framework.elements,
  };

  // Надстройки проекта (extensions) и общие атрибуты политики (common).
  const rawExtensions: SchemaExtensions = isRecord(project.extensions) ? project.extensions : {};
  if (project.extensions !== undefined && !isRecord(project.extensions)) {
    errors.push('схемы проекта: extensions — объект { all?, byKind? }');
  }
  const rawByKind = isRecord(rawExtensions.byKind) ? rawExtensions.byKind : {};
  const extensions: SchemaExtensions = {
    all: expandExtension(rawExtensions.all, 'extensions.all', errors),
    byKind: Object.fromEntries(
      Object.entries(rawByKind).map(([kind, schema]) => [
        kind,
        expandExtension(schema, `extensions.byKind.${kind}`, errors) ?? {},
      ]),
    ),
  };
  for (const kind of Object.keys(isRecord(extensions.byKind) ? extensions.byKind : {})) {
    if (!(kind in frameworkKinds) && !(kind in project.elements)) {
      errors.push(`extensions.byKind.${kind}: нет ни в схемах фреймворка, ни в схемах проекта`);
    }
  }
  const { common } = policy as EditorPolicy;
  const commonAttributes = isRecord(common) && Array.isArray(common.attributes) ? common.attributes : [];
  if (common !== undefined && !(isRecord(common) && Array.isArray(common.attributes))) {
    errors.push('политика: common — объект { attributes: [...] }');
  }
  const allProperties = extensionPart(extensions.all).properties;
  for (const attribute of commonAttributes) {
    if (!isRecord(attribute) || typeof attribute.key !== 'string' || !allProperties[attribute.key]) {
      errors.push(`common.${String(attribute?.key)}: общий атрибут — только из extensions.all схем проекта`);
    }
  }

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
    const frameworkSchema = frameworkKinds[element.kind];
    const schema = frameworkSchema ?? project.elements[element.kind];
    if (!schema) {
      errors.push(`${element.kind}: нет ни в схемах фреймворка, ни в схемах проекта`);
      continue;
    }
    // Устаревший тип фреймворка (constants: LegacyElementsTypesMap / DeprecatedElementsTypes)
    // в редактор не попадает [owner 2026-10-20]
    if (schema['x-deprecated'] === true) {
      const replacement = schema['x-replaced-by'];
      errors.push(
        `${element.kind}: элемент устарел во фреймворке${typeof replacement === 'string' ? ` — используйте ${replacement}` : ''}`,
      );
      continue;
    }
    result.push(
      assembleElement(
        element,
        commonAttributes,
        schema,
        frameworkSchema ? 'framework' : 'project',
        extensions,
        refs,
        errors,
      ),
    );
  }

  if (errors.length > 0) {
    throw new Error(`Политика редактора не соответствует схемам элементов:\n${errors.join('\n')}`);
  }
  return result;
}
