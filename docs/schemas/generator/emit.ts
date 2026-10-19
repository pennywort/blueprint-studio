/**
 * Сборка схем: общая база (shared/base-element.schema.json) и схема элемента.
 * Всё — из кода; база генерируется при каждом прогоне.
 */

import * as path from 'path';

import { Node, type ClassDeclaration, type Project } from 'ts-morph';

import { BASE, CATEGORY_BY_ELEMENT, EXCLUDED_PROPS, SCHEMA_ID_BASE } from './config';
import type { Diagnostics } from './diagnostics';
import {
  findPropsDecl,
  findTypeDecl,
  isContainer,
  readAllowedChildren,
  readDefaults,
  readMethods,
  readProps,
  type ElementCatalog,
  type ElementEntry,
  type PropsDecl,
} from './extract';
import {
  JSON_SCHEMA_DRAFT,
  FORMAT_VERSION,
  canonicalBase,
  canonicalElement,
  type BaseSchema,
  type ElementSchema,
  type EventSchema,
  type JsonValue,
  type PropSchema,
} from './format';
import type { SharedRegistry } from './shared';
import { jsDocDescription, typeToSchema, type TypeContext } from './type-to-schema';

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

/** Свойства props-типа → схемы (с описанием и источником), в порядке компилятора. */
function propsToSchemas(
  decl: PropsDecl,
  ctx: Omit<TypeContext, 'printNode'>,
  skip: (name: string, declNode: Node | undefined) => boolean,
): Array<{ name: string; schema: PropSchema; optional: boolean }> {
  const out: Array<{ name: string; schema: PropSchema; optional: boolean }> = [];
  for (const prop of readProps(decl)) {
    const name = prop.name;
    if (name.startsWith('_') || EXCLUDED_PROPS.includes(name)) continue;
    if (skip(name, prop.symbol.getDeclarations()[0])) continue;
    const schema = typeToSchema(
      prop.symbol.getTypeAtLocation(decl),
      { ...ctx, printNode: decl },
      `properties.${name}`,
    );
    const description = jsDocDescription(prop.symbol);
    out.push({
      name,
      schema: { ...(description ? { description } : {}), 'x-declared-in': prop.declaredIn, ...schema },
      optional: prop.optional,
    });
  }
  return out;
}

// ─── База ────────────────────────────────────────────────────────────────────

export interface BaseInfo {
  schema: BaseSchema;
  ref: string;
  /** Имя общего prop → узел объявления: совпадение узла = prop унаследован, а не переобъявлен. */
  declNodes: Map<string, Node | undefined>;
}

export function buildBase(
  project: Project,
  rootDir: string,
  shared: SharedRegistry,
  diag: Diagnostics,
): BaseInfo | null {
  const propsDecl = findTypeDecl(project, path.resolve(rootDir, BASE.propsFile), BASE.propsType);
  if (!propsDecl) {
    diag.report('base-missing', 'properties', `тип ${BASE.propsType} не найден`);
    return null;
  }
  const ctx = { elementType: '$base', diag, shared };
  const properties: Record<string, PropSchema> = {};
  const required: string[] = [];
  const declNodes = new Map<string, Node | undefined>();
  for (const p of propsToSchemas(propsDecl, ctx, () => false)) {
    properties[p.name] = p.schema;
    if (!p.optional) required.push(p.name);
  }
  for (const prop of readProps(propsDecl)) declNodes.set(prop.name, prop.symbol.getDeclarations()[0]);

  // События: свойства-функции on* интерфейса элемента
  const events: Record<string, EventSchema> = {};
  const elementDecl = findTypeDecl(project, path.resolve(rootDir, BASE.elementFile), BASE.elementInterface);
  if (!elementDecl) {
    diag.report('base-missing', 'x-events', `интерфейс ${BASE.elementInterface} не найден`);
  } else {
    for (const prop of elementDecl.getType().getProperties()) {
      const name = prop.getName();
      if (!BASE.eventNamePattern.test(name)) continue;
      const signature = prop.getTypeAtLocation(elementDecl).getCallSignatures()[0];
      if (!signature) continue;
      const parameters: Record<string, PropSchema> = {};
      for (const param of signature.getParameters()) {
        parameters[param.getName()] = typeToSchema(
          param.getTypeAtLocation(elementDecl),
          { ...ctx, printNode: elementDecl },
          `x-events.${name}.${param.getName()}`,
        );
      }
      const description = jsDocDescription(prop);
      events[name] = { ...(description ? { description } : {}), parameters };
    }
  }

  const schema = canonicalBase({
    $schema: JSON_SCHEMA_DRAFT,
    $id: `${SCHEMA_ID_BASE}/shared/${BASE.fileName}`,
    title: BASE.title,
    description: `Общие свойства и события всех UI-элементов (из ${BASE.propsType} и ${BASE.elementInterface})`,
    type: 'object',
    'x-format-version': FORMAT_VERSION,
    properties,
    required,
    'x-events': events,
  });
  return { schema, ref: `../shared/${BASE.fileName}#`, declNodes };
}

// ─── Элемент ─────────────────────────────────────────────────────────────────

export interface BuildInput {
  project: Project;
  cls: ClassDeclaration;
  entry: ElementEntry;
  catalog: ElementCatalog;
  base: BaseInfo | null;
  shared: SharedRegistry;
}

export function buildElementSchema(input: BuildInput, diag: Diagnostics): ElementSchema {
  const { project, cls, entry, catalog, base, shared } = input;
  const elementType = entry.elementType;
  const defaults = readDefaults(cls, diag);

  // Общий prop, унаследованный без переобъявления, описан базой
  const isBaseProp = (name: string, declNode: Node | undefined): boolean =>
    !!base && base.declNodes.has(name) && base.declNodes.get(name) === declNode;

  const properties: Record<string, PropSchema> = {};
  const required: string[] = [];
  const baseDefaults: Record<string, JsonValue> = {};

  const decl = findPropsDecl(project, cls, entry);
  if (!decl) {
    diag.report('props-missing', 'properties', `не найден ${entry.className.replace(/Element$/, '')}Props`);
  } else {
    for (const prop of readProps(decl)) {
      if (prop.name.startsWith('_') || EXCLUDED_PROPS.includes(prop.name)) continue;
      if (prop.name in defaults && isBaseProp(prop.name, prop.symbol.getDeclarations()[0])) {
        baseDefaults[prop.name] = defaults[prop.name]!;
      }
    }
    for (const p of propsToSchemas(decl, { elementType, diag, shared }, isBaseProp)) {
      let schema = p.schema;
      if (p.name in defaults) {
        const value = defaults[p.name]!;
        if (value === null && !allowsNull(schema, shared)) {
          diag.report(
            'default-null-widened',
            `properties.${p.name}`,
            'default: null, а тип без null — тип расширен',
          );
          schema = nullable(schema);
        }
        schema.default = value;
      }
      properties[p.name] = schema;
      if (!p.optional) required.push(p.name);
    }
  }

  for (const name of Object.keys(defaults)) {
    if (!(name in properties) && !(name in baseDefaults) && !EXCLUDED_PROPS.includes(name)) {
      diag.report('default-without-prop', `defaults.${name}`, 'ключ defaultProps без свойства в props');
    }
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
    allOf: base ? [{ $ref: base.ref }] : [],
    properties,
    required,
    'x-base-defaults': baseDefaults,
    'x-events': {},
    'x-methods': readMethods(cls),
  };
  if (isContainer(cls)) {
    schema['x-container'] = { allowedChildren: readAllowedChildren(cls, catalog.enumValues, diag) };
  }
  return canonicalElement(schema);
}
