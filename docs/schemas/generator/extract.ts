/**
 * Чтение исходников фреймворка: справочник элементов, класс, defaultProps, методы,
 * контейнерность, props. Здесь нет знания о формате вывода — только сведения из кода.
 */

import * as fs from 'fs';
import * as path from 'path';

import {
  Node,
  Project,
  SyntaxKind,
  type ClassDeclaration,
  type InterfaceDeclaration,
  type SourceFile,
  type Symbol as TsSymbol,
  type TypeAliasDeclaration,
} from 'ts-morph';

import {
  CHILDREN_GETTERS,
  CONTAINER_BASE_CLASSES,
  ELEMENT_REF_TYPES,
  PATHS,
  PUBLIC_METHOD_DECORATORS,
} from './config';
import type { Diagnostics } from './diagnostics';
import type { JsonValue, MethodSchema } from './format';
import { typeText } from './type-to-schema';

// ─── Справочник элементов ────────────────────────────────────────────────────

export interface ElementEntry {
  elementType: string;
  className: string;
  dirPath: string;
  deprecatedAliases: string[];
}

export interface ElementCatalog {
  elements: Record<string, ElementEntry>;
  /** Имя члена ElementsTypes → строковое значение. */
  enumValues: Record<string, string>;
}

function findFileRecursively(dirPath: string, fileName: string): string | null {
  const exact = path.join(dirPath, fileName);
  if (fs.existsSync(exact)) return exact;
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const found = findFileRecursively(path.join(dirPath, entry.name), fileName);
    if (found) return found;
  }
  return null;
}

function findMapObject(sf: SourceFile): Node | null {
  const decl = sf.getVariableDeclaration(PATHS.elementsMapVariable);
  const init = decl?.getInitializer();
  if (init?.isKind(SyntaxKind.ObjectLiteralExpression)) return init;
  for (const ea of sf.getExportAssignments()) {
    const expr = ea.getExpression();
    if (expr.isKind(SyntaxKind.ObjectLiteralExpression)) return expr;
  }
  return null;
}

function memberNameOfKey(text: string): string {
  return (text.startsWith('[') && text.endsWith(']') ? text.slice(1, -1) : text).split('.').pop() ?? text;
}

export function readCatalog(rootDir: string, warn: (msg: string) => void): ElementCatalog {
  const mapPath = path.resolve(rootDir, PATHS.elementsMap);
  const constantsPath = path.resolve(rootDir, PATHS.constants);
  for (const p of [mapPath, constantsPath]) {
    if (!fs.existsSync(p)) throw new Error(`Не найден файл: ${p}`);
  }

  const project = new Project({ compilerOptions: { strict: true, skipLibCheck: true } });
  const enumDecl = project.addSourceFileAtPath(constantsPath).getEnum(PATHS.elementsTypesEnum);
  if (!enumDecl) throw new Error(`enum ${PATHS.elementsTypesEnum} не найден в ${constantsPath}`);
  const enumValues: Record<string, string> = {};
  for (const m of enumDecl.getMembers()) {
    const v = m.getValue();
    if (typeof v === 'string') enumValues[m.getName()] = v;
  }

  const mapObject = findMapObject(project.addSourceFileAtPath(mapPath));
  if (!mapObject?.isKind(SyntaxKind.ObjectLiteralExpression)) throw new Error('Объект ElementsMap не найден');

  const elementsDir = path.resolve(rootDir, PATHS.elementsDir);
  const elements: Record<string, ElementEntry> = {};
  const aliases: Array<{ alias: string; target: string }> = [];

  for (const prop of mapObject.getProperties()) {
    if (!prop.isKind(SyntaxKind.PropertyAssignment)) continue;
    const member = memberNameOfKey(prop.getNameNode().getText());
    const elementType = enumValues[member];
    if (!elementType) {
      warn(`[WARN] нет значения ${PATHS.elementsTypesEnum}.${member}`);
      continue;
    }
    const init = prop.getInitializer();
    if (init?.isKind(SyntaxKind.PropertyAccessExpression)) {
      // Устаревший алиас: [ElementsTypes.TAB_VIEW]: ElementsTypes.TABS
      const target = enumValues[init.getName()];
      if (target) aliases.push({ alias: elementType, target });
      continue;
    }
    if (!init?.isKind(SyntaxKind.Identifier)) continue;
    const className = init.getText();
    const file = findFileRecursively(elementsDir, `${className}.ts`);
    if (!file) {
      warn(`[WARN] не найден файл класса ${className}`);
      continue;
    }
    elements[elementType] = { elementType, className, dirPath: path.dirname(file), deprecatedAliases: [] };
  }

  for (const { alias, target } of aliases) {
    elements[target]?.deprecatedAliases.push(alias);
  }
  for (const e of Object.values(elements)) e.deprecatedAliases.sort();

  return { elements, enumValues };
}

// ─── Программа типов ─────────────────────────────────────────────────────────

/** Полная программа lib: без неё checker не резолвит импортированные типы. */
export function createProgram(rootDir: string): Project {
  const libPath = path.resolve(rootDir, PATHS.libPackage);
  const project = new Project({
    tsConfigFilePath: path.join(libPath, 'tsconfig.json'),
    compilerOptions: {
      strict: true,
      skipLibCheck: true,
      experimentalDecorators: true,
      emitDecoratorMetadata: true,
    },
  });
  project.addSourceFilesAtPaths([path.join(libPath, 'src/**/*.ts')]);
  return project;
}

export function findClass(project: Project, entry: ElementEntry): ClassDeclaration | null {
  const own = project
    .getSourceFile(path.join(entry.dirPath, `${entry.className}.ts`))
    ?.getClass(entry.className);
  if (own) return own;
  for (const sf of project.getSourceFiles()) {
    const cls = sf.getClass(entry.className);
    if (cls) return cls;
  }
  return null;
}

// ─── defaultProps ────────────────────────────────────────────────────────────

const UNRESOLVED = Symbol('unresolved');
type Extracted = JsonValue | undefined | typeof UNRESOLVED;

function valueOf(node: Node, depth = 0): Extracted {
  if (depth > 10) return UNRESOLVED;
  if (Node.isNullLiteral(node)) return null;
  if (Node.isTrueLiteral(node)) return true;
  if (Node.isFalseLiteral(node)) return false;
  if (Node.isNumericLiteral(node)) return node.getLiteralValue();
  if (Node.isStringLiteral(node) || Node.isNoSubstitutionTemplateLiteral(node)) return node.getLiteralValue();
  if (Node.isPrefixUnaryExpression(node) && node.getOperatorToken() === SyntaxKind.MinusToken) {
    const v = valueOf(node.getOperand(), depth + 1);
    return typeof v === 'number' ? -v : UNRESOLVED;
  }
  if (Node.isParenthesizedExpression(node) || Node.isAsExpression(node) || Node.isSatisfiesExpression(node)) {
    return valueOf(node.getExpression(), depth + 1);
  }
  if (Node.isIdentifier(node) || Node.isPropertyAccessExpression(node)) {
    if (node.getText() === 'undefined') return undefined;
    const sym = node.getSymbol();
    for (const decl of (sym?.getAliasedSymbol() ?? sym)?.getDeclarations() ?? []) {
      if (Node.isEnumMember(decl)) {
        const v = decl.getValue();
        return v === undefined ? decl.getName() : v;
      }
      if (Node.isVariableDeclaration(decl)) {
        const init = decl.getInitializer();
        if (init) return valueOf(init, depth + 1);
      }
    }
    return UNRESOLVED;
  }
  // Enum['key'] — член enum по строковому ключу
  if (Node.isElementAccessExpression(node)) {
    const arg = node.getArgumentExpression();
    const sym = node.getExpression().getSymbol();
    const enumDecl = (sym?.getAliasedSymbol() ?? sym)?.getDeclarations().find(Node.isEnumDeclaration);
    if (enumDecl && arg && Node.isStringLiteral(arg)) {
      const key = arg.getLiteralValue();
      // имя члена может быть записано в кавычках: 'row-reverse' = ...
      const member = enumDecl.getMembers().find((m) => m.getName().replace(/^['"]|['"]$/g, '') === key);
      if (member) return member.getValue() ?? member.getName();
    }
    return UNRESOLVED;
  }
  if (Node.isArrayLiteralExpression(node)) {
    const items: JsonValue[] = [];
    for (const el of node.getElements()) {
      const v = valueOf(el, depth + 1);
      if (v === UNRESOLVED || v === undefined) return UNRESOLVED;
      items.push(v);
    }
    return items;
  }
  if (Node.isObjectLiteralExpression(node)) {
    const obj: { [key: string]: JsonValue } = {};
    for (const p of node.getProperties()) {
      if (!Node.isPropertyAssignment(p)) return UNRESOLVED;
      const init = p.getInitializer();
      const v = init ? valueOf(init, depth + 1) : UNRESOLVED;
      if (v === UNRESOLVED) return UNRESOLVED;
      if (v !== undefined) obj[p.getName().replace(/^['"]|['"]$/g, '')] = v;
    }
    return obj;
  }
  return UNRESOLVED;
}

/** static defaultProps → имя → JSON-значение. Несводимые выражения — в диагностику. */
export function readDefaults(cls: ClassDeclaration, diag: Diagnostics): Record<string, JsonValue> {
  const out: Record<string, JsonValue> = {};
  const member = cls.getStaticProperty('defaultProps');
  if (!member || !Node.isPropertyDeclaration(member)) return out;
  const init = member.getInitializer();
  if (!init || !Node.isObjectLiteralExpression(init)) return out;
  for (const p of init.getProperties()) {
    if (!Node.isPropertyAssignment(p)) continue;
    const name = p.getName().replace(/^['"_]+|['"]+$/g, '');
    const valueNode = p.getInitializer();
    if (!valueNode) continue;
    if (Node.isArrowFunction(valueNode) || Node.isFunctionExpression(valueNode)) continue;
    const v = valueOf(valueNode);
    if (v === UNRESOLVED) {
      diag.report('default-unresolved', `props.${name}.default`, valueNode.getText());
      continue;
    }
    if (v !== undefined) out[name] = v;
  }
  return out;
}

// ─── Методы ──────────────────────────────────────────────────────────────────

export function readMethods(cls: ClassDeclaration): MethodSchema[] {
  const methods: MethodSchema[] = [];
  for (const m of cls.getInstanceMethods()) {
    if (!m.getDecorators().some((d) => PUBLIC_METHOD_DECORATORS.includes(d.getName()))) continue;
    methods.push({
      name: m.getName(),
      returnType: m.getReturnTypeNode()?.getText() ?? typeText(m.getReturnType(), m),
      parameters: m.getParameters().map((p) => ({
        name: p.getName(),
        type: p.getTypeNode()?.getText() ?? typeText(p.getType(), p),
        optional: p.isOptional(),
      })),
    });
  }
  return methods;
}

// ─── Контейнер ───────────────────────────────────────────────────────────────

export function isContainer(cls: ClassDeclaration): boolean {
  let current: ClassDeclaration | undefined = cls;
  for (let i = 0; current && i < 20; i++) {
    const ext = current.getExtends()?.getExpression().getText();
    if (ext && CONTAINER_BASE_CLASSES.includes(ext)) return true;
    current = current.getBaseClass();
  }
  // Запасной путь: базовый класс не резолвится (миксины, фабрики)
  const text = cls.getExtends()?.getText() ?? '';
  return CONTAINER_BASE_CLASSES.some((n) => text.includes(n));
}

/** Значения допустимых дочерних типов или null, если извлечь не удалось. */
export function readAllowedChildren(
  cls: ClassDeclaration,
  enumValues: Record<string, string>,
  diag: Diagnostics,
): string[] | null {
  // Геттер может быть объявлен в базовом классе — идём вверх по цепочке
  const chain: ClassDeclaration[] = [];
  for (let c: ClassDeclaration | undefined = cls; c && chain.length < 20; c = c.getBaseClass()) chain.push(c);
  const getters = CHILDREN_GETTERS.flatMap((name) => chain.map((c) => c.getGetAccessor(name)));

  for (const getter of getters) {
    if (!getter) continue;
    const name = `${getter.getParentOrThrow().getSymbol()?.getName()}.${getter.getName()}`;

    // По коду: return [ElementsTypes.A, ElementsTypes.B]
    const literal = getter
      .getDescendantsOfKind(SyntaxKind.ReturnStatement)
      .map((r) => r.getExpression())
      .find((e) => e && Node.isArrayLiteralExpression(e));
    if (literal && Node.isArrayLiteralExpression(literal)) {
      const values = literal.getElements().map((e) => valueOf(e));
      if (values.length > 0 && values.every((v): v is string => typeof v === 'string'))
        return [...new Set(values)];
    }

    // По типу, если он уже, чем весь enum: (A | B)[] / readonly [A, B]
    const ret = getter.getReturnType();
    const el = ret.getArrayElementType();
    const parts = el
      ? el.isUnion()
        ? el.getUnionTypes()
        : [el]
      : ret.isTuple()
        ? ret.getTupleElements()
        : [];
    const values = parts.map((p) => p.getLiteralValue()).filter((v): v is string => typeof v === 'string');
    const narrowed = values.length < Object.keys(enumValues).length;
    if (values.length > 0 && values.length === parts.length && narrowed) return [...new Set(values)];

    // По тексту тела
    const body = getter.getBody()?.getText() ?? '';
    const members = [...body.matchAll(/ElementsTypes\.(\w+)/g)].map((m) => m[1]!);
    const byText = [...new Set(members.map((m) => enumValues[m]).filter((v): v is string => !!v))];
    if (byText.length > 0) {
      diag.report('children-by-text', 'x-container', `${name}: тип возврата ${typeText(ret, getter)}`);
      return byText;
    }
  }
  // Нет геттера — ограничений нет (null). Геттер есть, но не разобран — это проблема.
  if (getters.some(Boolean)) {
    diag.report('children-unresolved', 'x-container', 'геттер допустимых типов не разобран');
  }
  return null;
}

// ─── Props ───────────────────────────────────────────────────────────────────

export type PropsDecl = InterfaceDeclaration | TypeAliasDeclaration;

/** interface/type alias по имени: сначала в ожидаемом файле, затем во всей программе. */
export function findTypeDecl(project: Project, filePath: string, name: string): PropsDecl | null {
  const hinted = project.getSourceFile(filePath);
  const own = hinted?.getInterface(name) ?? hinted?.getTypeAlias(name);
  if (own) return own;
  for (const sf of project.getSourceFiles()) {
    const decl = sf.getInterface(name) ?? sf.getTypeAlias(name);
    if (decl) return decl;
  }
  return null;
}

function propsDeclIn(sf: SourceFile, name: string): PropsDecl | undefined {
  return sf.getInterface(name) ?? sf.getTypeAlias(name);
}

/**
 * Объявление props элемента: первый аргумент типа базового класса
 * (`extends BaseElementImpl<XProps, XModel>`), затем по имени <Base>Props в импортах и каталоге.
 */
export function findPropsDecl(
  project: Project,
  cls: ClassDeclaration,
  entry: ElementEntry,
): PropsDecl | null {
  const arg = cls.getExtends()?.getTypeArguments()[0];
  if (arg) {
    const t = arg.getType();
    const decl = (t.getAliasSymbol() ?? t.getSymbol())
      ?.getDeclarations()
      .find((d): d is PropsDecl => Node.isInterfaceDeclaration(d) || Node.isTypeAliasDeclaration(d));
    if (decl) return decl;
  }

  // Тип свойства props класса (наследуется от базового класса с generic)
  const propsSym = cls.getType().getProperty('props');
  if (propsSym) {
    const t = propsSym.getTypeAtLocation(cls);
    const decl = (t.getAliasSymbol() ?? t.getSymbol())
      ?.getDeclarations()
      .find((d): d is PropsDecl => Node.isInterfaceDeclaration(d) || Node.isTypeAliasDeclaration(d));
    if (decl && !ELEMENT_REF_TYPES.includes(decl.getName())) return decl;
  }

  const name = `${entry.className.replace(/Element$/, '')}Props`;
  const isPropsFile = (p: string): boolean =>
    /Props\.ts$/.test(path.basename(p)) && !/ModelProps/.test(path.basename(p));

  for (const imp of cls.getSourceFile().getImportDeclarations()) {
    const sf = imp.getModuleSpecifierSourceFile();
    if (sf && isPropsFile(sf.getFilePath())) {
      const decl = propsDeclIn(sf, name);
      if (decl) return decl;
    }
  }
  for (const sf of project.getSourceFiles()) {
    if (sf.getFilePath().startsWith(entry.dirPath) && isPropsFile(sf.getFilePath())) {
      const decl = propsDeclIn(sf, name);
      if (decl) return decl;
    }
  }
  return null;
}

export interface PropEntry {
  name: string;
  symbol: TsSymbol;
  optional: boolean;
  /** Имя interface/type alias, где объявлено свойство. */
  declaredIn: string;
  own: boolean;
}

/** Все свойства типа <X>Props, включая унаследованные, в порядке компилятора. */
export function readProps(decl: PropsDecl): PropEntry[] {
  const ownName = decl.getName();
  return decl
    .getType()
    .getProperties()
    .map((symbol) => {
      const d = symbol.getDeclarations()[0];
      const owner = d?.getFirstAncestor(
        (a): a is PropsDecl => Node.isInterfaceDeclaration(a) || Node.isTypeAliasDeclaration(a),
      );
      const declaredIn = owner?.getName() ?? ownName;
      return {
        name: symbol.getName(),
        symbol,
        optional: symbol.isOptional(),
        declaredIn,
        own: declaredIn === ownName,
      };
    });
}
