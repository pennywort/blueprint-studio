/**
 * Проверка готовых схем валидатором ajv (если установлен в пакете схем):
 * схема компилируется по draft-07, значения по умолчанию проверяются своей схемой.
 * Без ajv шаг пропускается с предупреждением.
 */

import type { Diagnostics } from './diagnostics';
import type { ElementSchema, JsonValue, SharedSchema } from './format';

/** Ключи-расширения формата: валидатор их знает и не считает опечатками. */
const EXTENSION_KEYWORDS = [
  'x-format-version',
  'x-element-type',
  'x-category',
  'x-deprecated-aliases',
  'x-container',
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

export function createValidator(shared: Record<string, SharedSchema>, warn: (msg: string) => void) {
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
  for (const s of Object.values(shared)) ajv.addSchema(s);

  return (schema: ElementSchema, diag: Diagnostics): void => {
    // Дефолты проверяются схемой элемента без required: объект «все дефолты сразу»
    const defaults: { [key: string]: JsonValue } = {};
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
}
