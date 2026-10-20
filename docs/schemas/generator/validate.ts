/**
 * Проверка готовых схем валидатором ajv (если установлен в пакете схем):
 * схема компилируется по draft-07, значения по умолчанию проверяются своей схемой.
 * Без ajv шаг пропускается с предупреждением.
 */

import type { Diagnostics } from './diagnostics';
import type { Bundle, ComponentSchema, ElementSchema, JsonValue } from './format';

/** Ключи-расширения формата: валидатор их знает и не считает опечатками. */
const EXTENSION_KEYWORDS = [
  'x-format-version',
  'x-element-type',
  'x-entity',
  'x-category',
  'x-composition',
  'x-slots',
  'x-deprecated-aliases',
  'x-container',
  'x-base-defaults',
  'x-events',
  'x-methods',
  'x-declared-in',
  'x-kind',
  'x-ts-type',
];

interface AjvLike {
  addSchema(schema: object): unknown;
  addVocabulary(keywords: string[]): unknown;
  compile(
    schema: object,
  ): ((data: unknown) => boolean) & { errors?: Array<{ instancePath: string; message?: string }> | null };
  removeSchema(id: string): unknown;
}

function loadAjv(): (new (opts: object) => AjvLike) | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('ajv');
    return (mod.default ?? mod) as new (opts: object) => AjvLike;
  } catch {
    return null;
  }
}

export function createValidator(shared: Bundle['shared'], warn: (msg: string) => void) {
  const Ajv = loadAjv();
  if (!Ajv) {
    warn('[WARN] ajv не установлен — проверка схем пропущена');
    return null;
  }
  const ajv = new Ajv({
    strict: true,
    strictTypes: false,
    strictTuples: false,
    strictRequired: false,
    allErrors: true,
    // format (date-time) — подсказка редактору; проверка форматов требует ajv-formats
    validateFormats: false,
  });
  ajv.addVocabulary(EXTENSION_KEYWORDS);
  // required снимаем и у базы: проверяется объект «только дефолты», а не полный элемент
  for (const s of Object.values(shared)) ajv.addSchema('required' in s ? { ...s, required: [] } : s);

  const check = (schema: ElementSchema | ComponentSchema, diag: Diagnostics): void => {
    // Дефолты проверяются схемой элемента без required: объект «все дефолты сразу»
    const defaults: { [key: string]: JsonValue } = {
      ...('x-base-defaults' in schema ? schema['x-base-defaults'] : {}),
    };
    for (const [name, prop] of Object.entries(schema.properties)) {
      if (prop.default !== undefined) defaults[name] = prop.default;
    }
    try {
      const validate = ajv.compile({ ...schema, required: [] });
      if (!validate(defaults)) {
        for (const e of validate.errors ?? []) {
          diag.report('default-invalid', `properties${e.instancePath.replace(/\//g, '.')}`, e.message ?? '');
        }
      }
    } catch (e) {
      diag.report('schema-invalid', '$', (e as Error).message);
    } finally {
      ajv.removeSchema(schema.$id);
    }
  };
  /** Схемы, на которые ссылаются следующие проверяемые (схемы элементов для компонентов). */
  const register = (schemas: ReadonlyArray<ElementSchema>): void => {
    for (const s of schemas) ajv.addSchema({ ...s, required: [] });
  };
  return { check, register };
}
