/**
 * Сборка схемы элемента из сведений, извлечённых из кода.
 */

import * as fs from 'fs';

import type { ClassDeclaration, Project } from 'ts-morph';

import { CATEGORY_BY_ELEMENT, EXCLUDED_PROPS, SCHEMA_ID_BASE } from './config';
import { Diagnostics } from './diagnostics';
import {
  findPropsDecl,
  isContainer,
  readAllowedChildren,
  readDefaults,
  readMethods,
  readProps,
  type ElementCatalog,
  type ElementEntry,
} from './extract';
import {
  JSON_SCHEMA_DRAFT,
  FORMAT_VERSION,
  canonicalElement,
  type ElementSchema,
  type EventSchema,
  type JsonValue,
  type PropSchema,
} from './format';
import type { SharedRegistry } from './shared';
import { jsDocDescription, typeToSchema } from './type-to-schema';

export interface BaseSchemas {
  properties: Record<string, PropSchema>;
  events: Record<string, EventSchema>;
}

/** Убирает невалидный для draft-07 "type": "any" из ручной базы событий. */
function stripAnyType(value: JsonValue, onFound: () => void): JsonValue {
  if (Array.isArray(value)) return value.map((v) => stripAnyType(v, onFound));
  if (value && typeof value === 'object') {
    const out: { [key: string]: JsonValue } = {};
    for (const [k, v] of Object.entries(value)) {
      if (k === 'type' && v === 'any') {
        onFound();
        continue;
      }
      out[k] = stripAnyType(v, onFound);
    }
    return out;
  }
  return value;
}

export function readBaseSchemas(baseElementPath: string, baseEventsPath: string): BaseSchemas {
  const read = (p: string): { [key: string]: JsonValue } =>
    fs.existsSync(p) ? (JSON.parse(fs.readFileSync(p, 'utf-8')) as { [key: string]: JsonValue }) : {};
  const properties = (read(baseElementPath).properties ?? {}) as unknown as Record<string, PropSchema>;
  const events = (read(baseEventsPath)['x-events'] ?? {}) as Record<string, EventSchema>;
  return { properties, events };
}

function title(className: string): string {
  return className
    .replace(/Element$/, '')
    .replace(/([A-Z])/g, ' $1')
    .trim();
}

function allowsNull(schema: PropSchema, shared: SharedRegistry): boolean {
  if (schema.type === 'null' || (Array.isArray(schema.type) && schema.type.includes('null'))) return true;
  if (schema.$ref) return shared.refAllowsNull(schema.$ref);
  return (schema.anyOf ?? schema.oneOf ?? []).some((s) => allowsNull(s, shared));
}

function nullable(schema: PropSchema): PropSchema {
  const { description, 'x-declared-in': declaredIn, ...rest } = schema;
  const head: PropSchema = {};
  if (description) head.description = description;
  if (declaredIn) head['x-declared-in'] = declaredIn;
  if (typeof rest.type === 'string' && !rest.anyOf && !rest.oneOf) {
    const out: PropSchema = { ...head, ...rest, type: [rest.type, 'null'] };
    if (out.enum) out.enum = [...out.enum, null];
    return out;
  }
  if (rest.anyOf) return { ...head, ...rest, anyOf: [...rest.anyOf, { type: 'null' }] };
  return { ...head, anyOf: [rest, { type: 'null' }] };
}

export interface BuildInput {
  project: Project;
  cls: ClassDeclaration;
  entry: ElementEntry;
  catalog: ElementCatalog;
  base: BaseSchemas;
  shared: SharedRegistry;
}

export function buildElementSchema(input: BuildInput, diag: Diagnostics): ElementSchema {
  const { project, cls, entry, catalog, base, shared } = input;
  const elementType = entry.elementType;
  const defaults = readDefaults(cls, diag);

  const properties: Record<string, PropSchema> = {};
  const required: string[] = [];

  // 1. Ручная база: определение из базы, дефолт — элемента (если задан)
  for (const [name, schema] of Object.entries(base.properties)) {
    properties[name] = name in defaults ? { ...schema, default: defaults[name]! } : { ...schema };
  }

  // 2. Props элемента (собственные и унаследованные)
  const decl = findPropsDecl(project, cls, entry);
  if (!decl) {
    diag.report('props-missing', 'properties', `не найден ${entry.className.replace(/Element$/, '')}Props`);
  } else {
    for (const prop of readProps(decl)) {
      const name = prop.name;
      if (name.startsWith('_') || EXCLUDED_PROPS.includes(name)) continue;
      if (name in base.properties) {
        properties[name] = { ...properties[name]!, 'x-declared-in': prop.declaredIn };
        continue;
      }
      if (!prop.own) diag.report('inherited-prop', `properties.${name}`, `из ${prop.declaredIn}`);

      const ctx = { elementType, diag, shared, printNode: decl };
      let schema: PropSchema = typeToSchema(prop.symbol.getTypeAtLocation(decl), ctx, `properties.${name}`);
      const description = jsDocDescription(prop.symbol);
      schema = { ...(description ? { description } : {}), 'x-declared-in': prop.declaredIn, ...schema };

      if (name in defaults) {
        const value = defaults[name]!;
        if (value === null && !allowsNull(schema, shared)) {
          diag.report(
            'default-null-widened',
            `properties.${name}`,
            'default: null, а тип без null — тип расширен',
          );
          schema = nullable(schema);
        }
        schema.default = value;
      }
      properties[name] = schema;
      if (!prop.optional) required.push(name);
    }
  }

  for (const name of Object.keys(defaults)) {
    if (!(name in properties) && !EXCLUDED_PROPS.includes(name)) {
      diag.report('default-without-prop', `defaults.${name}`, 'ключ defaultProps без свойства в props');
    }
  }

  // 3. События — ручная база
  const events: Record<string, EventSchema> = {};
  for (const [name, ev] of Object.entries(base.events)) {
    events[name] = stripAnyType(ev, () =>
      diag.report('base-event-any', `x-events.${name}`, '"type": "any" убран'),
    ) as EventSchema;
  }

  const schema: ElementSchema = {
    $schema: JSON_SCHEMA_DRAFT,
    $id: `${SCHEMA_ID_BASE}/schemas/${elementType}.schema.json`,
    title: title(entry.className),
    description: `JSON-схема для UI-элемента "${elementType}"`,
    type: 'object',
    'x-format-version': FORMAT_VERSION,
    'x-element-type': elementType,
    'x-category': CATEGORY_BY_ELEMENT[elementType] ?? 'basic',
    'x-deprecated-aliases': entry.deprecatedAliases,
    properties,
    required,
    'x-events': events,
    'x-methods': readMethods(cls),
  };
  if (isContainer(cls)) {
    schema['x-container'] = { allowedChildren: readAllowedChildren(cls, catalog.enumValues, diag) };
  }
  return canonicalElement(schema);
}
