/**
 * Компоненты фреймворка: поиск вызовов фабрики и сборка схемы компонента.
 *
 * Всё — через компилятор, без опоры на пути и имена файлов: вызов фабрики узнаётся по
 * символу, props и контроллер — по аргументам типа вызова (явным или выведенным), где бы
 * ни были объявлены их типы.
 */

import {
  Node,
  SyntaxKind,
  type CallExpression,
  type ObjectLiteralExpression,
  type Project,
  type Symbol as TsSymbol,
  type Type,
} from 'ts-morph';

import { CATEGORY_BY_ELEMENT, COMPONENT, EXCLUDED_PROPS, SCHEMA_ID_BASE } from './config';
import type { Diagnostics } from './diagnostics';
import { withDefault } from './emit';
import { UNRESOLVED, valueOf } from './extract';
import {
  FORMAT_VERSION,
  JSON_SCHEMA_DRAFT,
  canonicalComponent,
  type ComponentSchema,
  type EventSchema,
  type JsonValue,
  type MethodSchema,
  type PropSchema,
} from './format';
import type { SharedRegistry } from './shared';
import { jsDocDescription, typeText, typeToSchema, type TypeContext } from './type-to-schema';

export interface ComponentEntry {
  elementType: string;
  call: CallExpression;
  title: string;
}

// ─── Поиск ───────────────────────────────────────────────────────────────────

function resolved(symbol: TsSymbol | undefined): TsSymbol | undefined {
  return symbol?.isAlias() ? (symbol.getAliasedSymbol() ?? symbol) : symbol;
}

function isFactoryCall(call: CallExpression): boolean {
  return resolved(call.getExpression().getSymbol())?.getName() === COMPONENT.factory;
}

/** Заголовок: имя переменной/функции-обёртки без суффикса Component, по словам. */
function titleOf(call: CallExpression, fallback: string): string {
  const owner = call.getFirstAncestor(
    (a) => Node.isVariableDeclaration(a) || Node.isFunctionDeclaration(a) || Node.isClassDeclaration(a),
  );
  const name = owner && 'getName' in owner ? (owner.getName() as string | undefined) : undefined;
  if (!name) return fallback;
  return name
    .replace(COMPONENT.titleSuffix, '')
    .replace(/([A-Z])/g, ' $1')
    .trim();
}

/**
 * Все вызовы фабрики в программе. Имя — значение первого аргумента (член ElementsTypes).
 * Ошибки (имя не сводится, дубли) — в диагностику каталога.
 */
export function findComponents(project: Project, diag: Diagnostics): ComponentEntry[] {
  const out: ComponentEntry[] = [];
  const seen = new Set<string>();
  for (const sf of project.getSourceFiles()) {
    // Дешёвый отсев: файл без имени фабрики не содержит её вызова (импорт под псевдонимом
    // всё равно называет её в import).
    if (!sf.getFullText().includes(COMPONENT.factory)) continue;
    for (const call of sf.getDescendantsOfKind(SyntaxKind.CallExpression)) {
      if (!isFactoryCall(call)) continue;
      const nameArg = call.getArguments()[0];
      const where = `${sf.getBaseName()}:${call.getStartLineNumber()}`;
      const name = nameArg ? valueOf(nameArg) : UNRESOLVED;
      if (typeof name !== 'string') {
        diag.report('component-name-unresolved', where, nameArg?.getText() ?? 'нет аргумента');
        continue;
      }
      if (seen.has(name)) {
        diag.report('component-duplicate', where, `компонент ${name} уже найден`);
        continue;
      }
      seen.add(name);
      out.push({ elementType: name, call, title: titleOf(call, name) });
    }
  }
  return out.sort((a, b) => a.elementType.localeCompare(b.elementType));
}

// ─── Чтение вызова ───────────────────────────────────────────────────────────

/** Аргументы типа фабрики [P, C]: явные `<P, C>`, иначе выведенные (тип результата Component<P, C, S>). */
function typeArguments(call: CallExpression): [Type | undefined, Type | undefined] {
  const explicit = call.getTypeArguments();
  if (explicit.length > 0) return [explicit[0]?.getType(), explicit[1]?.getType()];
  const ret = call.getReturnType();
  const args = ret.getTypeArguments().length > 0 ? ret.getTypeArguments() : ret.getAliasTypeArguments();
  return [args[0], args[1]];
}

function unwrap(node: Node | undefined): Node | undefined {
  let n = node;
  while (
    n &&
    (Node.isParenthesizedExpression(n) || Node.isAsExpression(n) || Node.isSatisfiesExpression(n))
  ) {
    n = n.getExpression();
  }
  return n;
}

/** Объект-описание компонента: литерал или идентификатор переменной с литералом. */
function optionsObject(call: CallExpression): ObjectLiteralExpression | undefined {
  let node = unwrap(call.getArguments()[1]);
  if (node && Node.isIdentifier(node)) {
    const decl = resolved(node.getSymbol())?.getDeclarations().find(Node.isVariableDeclaration);
    node = unwrap(decl?.getInitializer());
  }
  return node && Node.isObjectLiteralExpression(node) ? node : undefined;
}

/** Член описания `name`: метод `name() {}` или свойство `name: () => …` / `name: [...]`. */
function member(options: ObjectLiteralExpression | undefined, name: string): Node | undefined {
  const prop = options?.getProperty(name);
  if (!prop) return undefined;
  if (Node.isMethodDeclaration(prop)) return prop;
  if (Node.isPropertyAssignment(prop)) return unwrap(prop.getInitializer());
  return undefined;
}

/** Литерал объекта, возвращаемый функцией (return {…} или стрелка с телом-выражением). */
function returnedObject(fn: Node | undefined): ObjectLiteralExpression | undefined {
  if (!fn) return undefined;
  if (Node.isArrowFunction(fn)) {
    const body = unwrap(fn.getBody());
    if (body && Node.isObjectLiteralExpression(body)) return body;
  }
  if (Node.isArrowFunction(fn) || Node.isFunctionExpression(fn) || Node.isMethodDeclaration(fn)) {
    for (const ret of fn.getDescendantsOfKind(SyntaxKind.ReturnStatement)) {
      const expr = unwrap(ret.getExpression());
      if (expr && Node.isObjectLiteralExpression(expr)) return expr;
    }
  }
  return undefined;
}

/** Имя свойства литерала: обычное или вычисляемое `[CONST]` (значение константы). */
function propertyName(p: Node): string | null {
  if (!Node.isPropertyAssignment(p)) return null;
  const nameNode = p.getNameNode();
  if (Node.isComputedPropertyName(nameNode)) {
    const v = valueOf(nameNode.getExpression());
    return typeof v === 'string' ? v : null;
  }
  return p.getName().replace(/^['"]|['"]$/g, '');
}

function readComponentDefaults(fn: Node | undefined, diag: Diagnostics): Record<string, JsonValue> {
  const out: Record<string, JsonValue> = {};
  const obj = returnedObject(fn);
  if (!obj) return out;
  for (const p of obj.getProperties()) {
    const name = propertyName(p);
    const valueNode = Node.isPropertyAssignment(p) ? p.getInitializer() : undefined;
    if (name === null || !valueNode) {
      diag.report('default-unresolved', 'defaults', p.getText());
      continue;
    }
    const v = valueOf(valueNode);
    if (v === UNRESOLVED) {
      diag.report('default-unresolved', `properties.${name}.default`, valueNode.getText());
      continue;
    }
    if (v !== undefined) out[name] = v;
  }
  return out;
}

/** Методы контроллера: свойства-функции типа C. */
function readControllerMethods(ctrl: Type | undefined, at: Node): MethodSchema[] {
  if (!ctrl || ctrl.isAny() || ctrl.isUnknown()) return [];
  const methods: MethodSchema[] = [];
  for (const symbol of ctrl.getProperties()) {
    const signature = symbol.getTypeAtLocation(at).getCallSignatures()[0];
    if (!signature) continue;
    methods.push({
      name: symbol.getName(),
      returnType: typeText(signature.getReturnType(), at),
      parameters: signature.getParameters().map((param) => {
        const decl = param.getValueDeclaration();
        return {
          name: param.getName(),
          type: typeText(param.getTypeAtLocation(at), at),
          optional: !!decl && Node.isParameterDeclaration(decl) && decl.isOptional(),
        };
      }),
    });
  }
  return methods;
}

/** События: вызовы `$emit('имя', значение)` в описании компонента. */
function readEvents(
  options: ObjectLiteralExpression | undefined,
  ctx: Omit<TypeContext, 'printNode'>,
): Record<string, EventSchema> {
  const events: Record<string, EventSchema> = {};
  for (const call of options?.getDescendantsOfKind(SyntaxKind.CallExpression) ?? []) {
    const callee = call.getExpression();
    if (!Node.isPropertyAccessExpression(callee) || callee.getName() !== COMPONENT.emitMethod) continue;
    const [nameArg, valueArg] = call.getArguments();
    const name = nameArg ? valueOf(nameArg) : UNRESOLVED;
    if (typeof name !== 'string') {
      ctx.diag.report('event-name-unresolved', 'x-events', call.getText().slice(0, 120));
      continue;
    }
    if (events[name]) continue;
    const parameters: Record<string, PropSchema> = {};
    if (valueArg) {
      parameters.value = typeToSchema(
        valueArg.getType(),
        { ...ctx, printNode: call },
        `x-events.${name}.value`,
      );
    }
    events[name] = { parameters };
  }
  return events;
}

/** Состав view: первые аргументы вызовов createElement (первый параметр фабрики view). */
function readComposition(view: Node | undefined): string[] {
  if (
    !view ||
    !(Node.isArrowFunction(view) || Node.isFunctionExpression(view) || Node.isMethodDeclaration(view))
  ) {
    return [];
  }
  const createElement = view.getParameters()[0];
  if (!createElement) return [];
  const target = createElement.getSymbol();
  const out: string[] = [];
  for (const call of view.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    const callee = call.getExpression();
    if (!Node.isIdentifier(callee)) continue;
    const sym = callee.getSymbol();
    if (sym !== target && callee.getText() !== createElement.getName()) continue;
    const typeArg = call.getArguments()[0];
    const v = typeArg ? valueOf(typeArg) : UNRESOLVED;
    if (typeof v === 'string') out.push(v);
  }
  return out;
}

function readSlots(node: Node | undefined): string[] {
  if (!node) return [];
  const v = valueOf(node);
  return Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string') : [];
}

/** Имя interface/type alias, где объявлено свойство; иначе имя типа P. */
function declaredIn(symbol: TsSymbol, props: Type): string {
  const owner = symbol
    .getDeclarations()[0]
    ?.getFirstAncestor((a) => Node.isInterfaceDeclaration(a) || Node.isTypeAliasDeclaration(a));
  const ownerName =
    owner && (Node.isInterfaceDeclaration(owner) || Node.isTypeAliasDeclaration(owner))
      ? owner.getName()
      : undefined;
  return ownerName ?? (props.getAliasSymbol() ?? props.getSymbol())?.getName() ?? '';
}

// ─── Схема ───────────────────────────────────────────────────────────────────

export function buildComponentSchema(
  entry: ComponentEntry,
  shared: SharedRegistry,
  diag: Diagnostics,
): ComponentSchema {
  const { call, elementType } = entry;
  const ctx = { elementType, diag, shared };
  const [propsType, ctrlType] = typeArguments(call);
  const options = optionsObject(call);
  const defaults = readComponentDefaults(member(options, 'defaultProps'), diag);

  const properties: Record<string, PropSchema> = {};
  const required: string[] = [];
  if (!propsType || propsType.isAny() || propsType.isUnknown()) {
    diag.report(
      'component-props-missing',
      'properties',
      `тип props не определён: ${call.getText().slice(0, 80)}`,
    );
  } else {
    for (const symbol of propsType.getProperties()) {
      const name = symbol.getName();
      if (name.startsWith('_') || EXCLUDED_PROPS.includes(name)) continue;
      const description = jsDocDescription(symbol);
      const schema: PropSchema = {
        ...(description ? { description } : {}),
        'x-declared-in': declaredIn(symbol, propsType),
        ...typeToSchema(symbol.getTypeAtLocation(call), { ...ctx, printNode: call }, `properties.${name}`),
      };
      properties[name] = name in defaults ? withDefault(schema, defaults[name]!, name, shared, diag) : schema;
      if (!symbol.isOptional()) required.push(name);
    }
  }
  for (const name of Object.keys(defaults)) {
    if (!(name in properties)) {
      diag.report('default-without-prop', `defaults.${name}`, 'ключ defaultProps без свойства в props');
    }
  }

  return canonicalComponent({
    $schema: JSON_SCHEMA_DRAFT,
    $id: `${SCHEMA_ID_BASE}/components/${elementType}.schema.json`,
    title: entry.title,
    description: `JSON-схема для компонента "${elementType}"`,
    type: 'object',
    'x-format-version': FORMAT_VERSION,
    'x-element-type': elementType,
    'x-entity': 'component',
    'x-category': CATEGORY_BY_ELEMENT[elementType] ?? 'basic',
    properties,
    required,
    'x-events': readEvents(options, ctx),
    'x-methods': readControllerMethods(ctrlType, call),
    'x-composition': readComposition(member(options, 'view')),
    'x-slots': readSlots(member(options, 'slots')),
  });
}
