/**
 * TS-тип (резолвленный компилятором) → схема значения.
 *
 * Тип читается флагами структуры, а не текстом. Всё, что схема выразить не может,
 * получает x-ts-type + диагностику — пустой схемы («что угодно») генератор не выпускает.
 */

import { Node, SyntaxKind, type Symbol as TsSymbol, type Type } from 'ts-morph';

import { ELEMENT_REF_TYPES, ELEMENT_TYPE_ENUMS, KNOWN_EXTERNAL_TYPES } from './config';
import type { Diagnostics } from './diagnostics';
import type { JsonType, JsonValue, PropSchema } from './format';
import type { SharedRegistry } from './shared';

export interface TypeContext {
  elementType: string;
  diag: Diagnostics;
  shared: SharedRegistry;
  /** Узел, относительно которого печатается текст типа (без import("...") путей). */
  printNode: Node;
}

/** Текст типа без import("абсолютный/путь") — иначе в схему попадает путь с машины разработчика. */
export function typeText(type: Type, node: Node): string {
  return type.getText(node).replace(/import\("[^"]*"\)\./g, '');
}

/** Ссылка на вложенный элемент (props шаблона или рантайм-узел): тип или его предок из ELEMENT_REF_TYPES. */
function isElementRef(type: Type): boolean {
  const queue: Type[] = [type];
  const seen = new Set<Type>();
  while (queue.length > 0) {
    const t = queue.shift()!;
    if (seen.has(t)) continue;
    seen.add(t);
    const names = [t.getAliasSymbol()?.getName(), t.getSymbol()?.getName()];
    if (names.some((n) => n && ELEMENT_REF_TYPES.includes(n))) return true;
    queue.push(...t.getBaseTypes());
    if (t.isIntersection()) queue.push(...t.getIntersectionTypes());
  }
  return false;
}

/** JSDoc-описание объявления (первое непустое). */
export function jsDocDescription(symbol: TsSymbol): string | undefined {
  for (const decl of symbol.getDeclarations()) {
    if (Node.isJSDocable(decl)) {
      const text = decl
        .getJsDocs()
        .map((d) => d.getDescription().trim())
        .filter(Boolean)
        .join('\n');
      if (text) return text;
    }
  }
  return undefined;
}

function unresolved(
  ctx: TypeContext,
  type: Type,
  path: string,
  code: Parameters<Diagnostics['report']>[0],
  why: string,
): PropSchema {
  const text = typeText(type, ctx.printNode);
  ctx.diag.report(code, path, `${why}: ${text}`);
  return { 'x-ts-type': text };
}

function isNamedSourceType(type: Type): { name: string; file: string } | null {
  const sym = type.getAliasSymbol() ?? type.getSymbol();
  const decl = sym?.getDeclarations()[0];
  if (!sym || !decl) return null;
  const sf = decl.getSourceFile();
  if (sf.isDeclarationFile() || sf.getFilePath().includes('/typescript/lib/')) return null;
  const name = sym.getName();
  if (name.startsWith('__')) return null; // анонимные литералы типов
  return { name, file: sf.getFilePath() };
}

/** Рантайм-объект движка: в типе есть метод именованного interface/class. */
function isRuntimeObjectType(type: Type): boolean {
  for (const prop of type.getProperties()) {
    for (const decl of prop.getDeclarations()) {
      const parent = decl.getParent();
      if (decl.isKind(SyntaxKind.MethodDeclaration) && parent?.isKind(SyntaxKind.ClassDeclaration))
        return true;
      if (decl.isKind(SyntaxKind.MethodSignature) && parent?.isKind(SyntaxKind.InterfaceDeclaration))
        return true;
    }
  }
  return false;
}

/** Тип — enum типов элементов (или его члены): ELEMENT_TYPE_ENUMS. */
function isElementTypeRef(type: Type): boolean {
  const parts = type.isUnion() ? type.getUnionTypes().filter((p) => !p.isUndefined() && !p.isNull()) : [type];
  return (
    parts.length > 0 &&
    parts.every((p) => {
      const decl = p.getSymbol()?.getDeclarations()[0];
      const enumDecl = decl?.isKind(SyntaxKind.EnumMember) ? decl.getParent() : decl;
      return (
        enumDecl?.isKind(SyntaxKind.EnumDeclaration) === true &&
        ELEMENT_TYPE_ENUMS.includes(enumDecl.getName())
      );
    })
  );
}

function literalValue(t: Type): string | number | null {
  const v = t.getLiteralValue();
  if (typeof v === 'string' || typeof v === 'number') return v;
  return null;
}

function withNull(schema: PropSchema, nullableRef = false): PropSchema {
  if (schema.$ref) return nullableRef ? schema : { anyOf: [schema, { type: 'null' }] };
  if (typeof schema.type === 'string' && !schema.anyOf) {
    const out: PropSchema = { ...schema, type: [schema.type, 'null'] };
    if (out.enum) out.enum = [...out.enum, null];
    if ('const' in out) {
      out.enum = [out.const as JsonValue, null];
      delete out.const;
    }
    return out;
  }
  if (schema.anyOf) return { ...schema, anyOf: [...schema.anyOf, { type: 'null' }] };
  return { anyOf: [schema, { type: 'null' }] };
}

function dedupe(schemas: PropSchema[]): PropSchema[] {
  const seen = new Set<string>();
  return schemas.filter((s) => {
    const key = JSON.stringify(s);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function typeToSchema(
  type: Type,
  ctx: TypeContext,
  path: string,
  seen: Set<string> = new Set(),
): PropSchema {
  // Общий тип по имени (Icon, Icon-alias)
  const sharedRef = ctx.shared.matchType(type);
  if (sharedRef) return { $ref: sharedRef.$ref };

  if (type.isAny() || type.isUnknown()) return unresolved(ctx, type, path, 'any-type', 'any/unknown');

  if (type.getCallSignatures().length > 0) return { 'x-kind': 'handler' };

  if (type.isUnion()) return unionToSchema(type, ctx, path, seen);

  // Вложенный элемент: тип и допустимые дети — у самого элемента (x-container)
  if ((type.isObject() || type.isIntersection()) && isElementRef(type)) return { 'x-kind': 'element' };

  if (type.isEnumLiteral() || type.isStringLiteral()) {
    return { type: 'string', const: String(type.getLiteralValue() ?? type.getText()) };
  }
  if (type.isNumberLiteral()) return { type: 'number', const: Number(type.getLiteralValue()) };
  if (type.isBooleanLiteral()) return { type: 'boolean', const: type.getText() === 'true' };

  if (type.isEnum()) {
    const decl = type
      .getSymbol()
      ?.getDeclarations()
      .find((d) => d.isKind(SyntaxKind.EnumDeclaration));
    if (decl?.isKind(SyntaxKind.EnumDeclaration)) {
      const values = decl.getMembers().map((m) => String(m.getValue() ?? m.getName()));
      return { type: 'string', enum: values };
    }
    return unresolved(ctx, type, path, 'unresolved-type', 'enum без объявления');
  }

  if (type.isArray()) {
    const el = type.getArrayElementType();
    if (!el) return unresolved(ctx, type, path, 'unresolved-type', 'тип элемента массива');
    return { type: 'array', items: typeToSchema(el, ctx, `${path}[]`, seen) };
  }

  if (type.isTuple()) {
    const items = dedupe(type.getTupleElements().map((t, i) => typeToSchema(t, ctx, `${path}[${i}]`, seen)));
    return { type: 'array', items: items.length === 1 ? items[0]! : { anyOf: items } };
  }

  if (type.isString() || type.isTemplateLiteral()) return { type: 'string' };
  if (type.isNumber()) return { type: 'number' };
  if (type.isBoolean()) return { type: 'boolean' };
  if (type.isNull()) return { type: 'null' };

  if (type.isObject()) return objectToSchema(type, ctx, path, seen);
  // Пересечение объектов (A & { x }) — один объект со свойствами всех частей (план 2.3)
  if (type.isIntersection() && type.getIntersectionTypes().every((t) => t.isObject())) {
    return objectToSchema(type, ctx, path, seen);
  }

  return unresolved(ctx, type, path, 'unresolved-type', 'не распознан');
}

function unionToSchema(type: Type, ctx: TypeContext, path: string, seen: Set<string>): PropSchema {
  const parts = type.getUnionTypes();
  const hasNull = parts.some((p) => p.isNull());
  const rest = parts.filter((p) => !p.isNull() && !p.isUndefined());

  // true | false — это boolean (компилятор разворачивает boolean в union)
  const bools = rest.filter((p) => p.isBooleanLiteral());
  const hasBoolean = bools.length === 2;
  const nonBool = hasBoolean ? rest.filter((p) => !p.isBooleanLiteral()) : rest;

  const strLits = nonBool.filter(
    (p) => p.isStringLiteral() || (p.isEnumLiteral() && typeof literalValue(p) === 'string'),
  );
  const numLits = nonBool.filter(
    (p) => p.isNumberLiteral() || (p.isEnumLiteral() && typeof literalValue(p) === 'number'),
  );
  const others = nonBool.filter((p) => !strLits.includes(p) && !numLits.includes(p));

  const branches: PropSchema[] = [];
  let nullableRef = false;

  if (strLits.length > 0) {
    const values = [...new Set(strLits.map((p) => String(literalValue(p) ?? p.getText())))];
    const ref = ctx.shared.matchLiterals(values);
    if (ref) {
      branches.push({ $ref: ref.$ref });
      nullableRef = ref.nullable;
    } else {
      branches.push(
        values.length === 1 ? { type: 'string', const: values[0]! } : { type: 'string', enum: values },
      );
    }
  }
  if (numLits.length > 0) {
    const values = [...new Set(numLits.map((p) => Number(literalValue(p))))];
    branches.push(
      values.length === 1 ? { type: 'number', const: values[0]! } : { type: 'number', enum: values },
    );
  }
  if (hasBoolean) branches.push({ type: 'boolean' });
  const first = branches.length;
  const single = first === 0 && others.length === 1;
  others.forEach((p, i) =>
    branches.push(typeToSchema(p, ctx, single ? path : `${path}.anyOf[${first + i}]`, seen)),
  );

  const unique = dedupe(branches);
  if (unique.length === 0)
    return hasNull ? { type: 'null' } : unresolved(ctx, type, path, 'unresolved-type', 'пустой union');
  if (unique.length === 1) return hasNull ? withNull(unique[0]!, nullableRef) : unique[0]!;

  // Простые типы без ограничений сливаются в type: [...]
  const simple = unique.every((s) => Object.keys(s).length === 1 && typeof s.type === 'string');
  if (simple) {
    const types = unique.map((s) => s.type as JsonType);
    if (hasNull) types.push('null');
    return { type: types };
  }
  return { anyOf: hasNull && !nullableRef ? [...unique, { type: 'null' }] : unique };
}

function objectToSchema(type: Type, ctx: TypeContext, path: string, seen: Set<string>): PropSchema {
  const sym = type.getAliasSymbol() ?? type.getSymbol();
  const decl = sym?.getDeclarations()[0];
  const sf = decl?.getSourceFile();

  if (sf && (sf.isDeclarationFile() || sf.getFilePath().includes('/typescript/lib/'))) {
    const known = sym ? KNOWN_EXTERNAL_TYPES[sym.getName()] : undefined;
    if (known) return { ...known };
    return unresolved(ctx, type, path, 'external-type', 'внешний тип не раскрывается');
  }
  if (isRuntimeObjectType(type)) return unresolved(ctx, type, path, 'runtime-type', 'рантайм-объект движка');

  const named = isNamedSourceType(type);
  if (named) ctx.shared.trackUsage(named.name, named.file, ctx.elementType);

  const key = `${sf?.getFilePath() ?? ''}#${type.getText()}`;
  if (seen.has(key)) return unresolved(ctx, type, path, 'cycle-type', 'циклическая ссылка');
  const nextSeen = new Set(seen).add(key);

  const properties: Record<string, PropSchema> = {};
  const required: string[] = [];
  for (const prop of type.getProperties()) {
    const name = prop.getName();
    if (name.startsWith('_')) continue;
    // У пересечения нет своего объявления — тип берём в месте объявления свойства
    const at = decl ?? prop.getValueDeclaration() ?? prop.getDeclarations()[0];
    const propType = at ? prop.getTypeAtLocation(at) : prop.getDeclaredType();
    if (name === 'type' && isElementTypeRef(propType)) continue;
    const schema = typeToSchema(propType, ctx, `${path}.${name}`, nextSeen);
    const description = jsDocDescription(prop);
    properties[name] = description ? { description, ...schema } : schema;
    if (!prop.isOptional()) required.push(name);
  }

  if (Object.keys(properties).length > 0) {
    const out: PropSchema = { type: 'object', properties };
    if (required.length > 0) out.required = required;
    return out;
  }

  const index = type.getStringIndexType();
  if (index) {
    if (index.isAny() || index.isUnknown()) {
      ctx.diag.report('loose-object', path, `произвольные ключи: ${typeText(type, ctx.printNode)}`);
      return { type: 'object' };
    }
    return { type: 'object', additionalProperties: typeToSchema(index, ctx, `${path}{}`, nextSeen) };
  }
  return { type: 'object' };
}
