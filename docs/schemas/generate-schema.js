#!/usr/bin/env ts-node

/**
 * Генератор JSON-схемы для одного UI-элемента.
 *
 * Использует ts-morph для парсинга AST TypeScript-файлов элемента
 * и извлечения публичного контракта: props, константы, defaultProps,
 * методы, события.
 *
 * Типы свойств резолвятся через TypeScript type checker (member.getType()),
 * а не через парсинг текста типа — компилятор сам следует по импортам
 * (PropertyConstants.ts, namespace ActionModel, enum literal-ы и т.д.).
 *
 * Источник правды для маппинга elementType → директория — ElementsMap.ts.
 *
 * Использование:
 *   ts-node scripts/generate-element-spec.ts --element button [--checkOnly] [--outputDir <dir>]
 *
 * ВНИМАНИЕ: для резолва типов загружается полная программа lib
 * (tsconfig + все src-файлы). Первый прогон медленный — это нормально.
 */

import * as fs from 'fs';
import * as path from 'path';

import {
  Project,
  type Node,
  SyntaxKind,
  type SourceFile,
  type ClassDeclaration,
  type EnumDeclaration,
  type Type,
  type PropertySignature,
} from 'ts-morph';

import type {
  SchemaProperty,
  SchemaEvent,
  SchemaMethod,
  ElementSchema,
  Manifest,
  ElementMapping,
  CliArgs,
} from './types';

// ─── CLI Args ────────────────────────────────────────────────────────────────

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

// ─── Path Resolution ─────────────────────────────────────────────────────────

const ROOT_DIR = path.resolve(__dirname, '../../..');
const ELEMENTS_DIR = path.resolve(ROOT_DIR, 'packages/lib/src/dom/elements');
const CONSTANTS_PATH = path.resolve(ROOT_DIR, 'packages/constants/src/index.ts');

// Deprecated enum keys → current types mapping (for CLI normalization only)
const DEPRECATED_TYPE_MAP: Record<string, string> = {
  TEXT: 'text-field',
  VIEW: 'container',
  SCROLL_VIEW: 'container',
  LABEL: 'typography',
  SUGGEST: 'autocomplete',
  DATE_PICKER: 'date-field',
  MENU_BUTTON: 'dropdown',
  DIALOG: 'modal',
};

// ─── Category detection ──────────────────────────────────────────────────────

function detectCategory(elementType: string): string {
  const overlayTypes = ['pop-up', 'modal', 'dialog', 'popover', 'drawer', 'tooltip'];
  const layoutTypes = ['container', 'view', 'grid', 'scroll-view', 'flex-container'];
  const formTypes = [
    'text-field',
    'select',
    'checkbox',
    'radio-group',
    'switch',
    'date-field',
    'search-field',
    'autocomplete',
    'mask-input',
    'step-input',
    'range',
    'rating',
    'color-card',
    'counter',
  ];

  if (overlayTypes.includes(elementType)) return 'overlay';
  if (layoutTypes.includes(elementType)) return 'layout';
  if (formTypes.includes(elementType)) return 'form';
  return 'basic';
}

// ─── Extract mapping from ElementsMap.ts ─────────────────────────────────────

/**
 * Извлекает маппинг elementType → { dirPath, dirName, baseName } из ElementsMap.ts.
 *
 * 1. Парсит ElementsMap, извлекает className (TextElement, GridElement, ...)
 * 2. Для каждого класса находит директорию элемента файловым fallback'ом
 * 3. baseName = className без суффикса "Element" (TextElement → Text)
 *
 * Deprecated aliases (TAB_VIEW: TABS) пропускаются — значение не Element class.
 */
function extractElementMapping(): ElementMapping {
  const elementsMapPath = path.resolve(ELEMENTS_DIR, 'ElementsMap.ts');
  const constantsPath = CONSTANTS_PATH;

  if (!fs.existsSync(elementsMapPath)) {
    console.error(`ElementsMap.ts not found at: ${elementsMapPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(constantsPath)) {
    console.error(`constants/src/index.ts not found at: ${constantsPath}`);
    process.exit(1);
  }

  // Маппинг парсится отдельным лёгким проектом — полная программа не нужна
  const project = new Project({
    compilerOptions: { strict: true, skipLibCheck: true },
  });

  const elementsMapFile = project.addSourceFileAtPath(elementsMapPath);
  const constantsFile = project.addSourceFileAtPath(constantsPath);

  // 1. Построить маппинг enum key → stringValue из ElementsTypes enum
  const enumValueMap = extractEnumStringValueMap(constantsFile);

  // 2. Парсить ElementsMap
  const mapObject = findElementsMapObject(elementsMapFile);
  if (!mapObject) {
    console.error('ElementsMap object not found in ElementsMap.ts');
    process.exit(1);
  }

  const mapping: ElementMapping = {};

  for (const property of (mapObject as any).getProperties()) {
    if (!property.isKind(SyntaxKind.PropertyAssignment)) continue;

    const name = property.getNameNode().getText();

    // Ключ: [ElementsTypes.TEXT_FIELD] → TEXT_FIELD
    let enumMemberName: string | undefined;
    if (name.startsWith('[') && name.endsWith(']')) {
      enumMemberName = name.slice(1, -1).split('.').pop();
    } else {
      enumMemberName = name;
    }

    if (!enumMemberName) continue;

    const stringValue = enumValueMap[enumMemberName];
    if (!stringValue) {
      console.warn(`[WARN] No enum value found for: ${enumMemberName}`);
      continue;
    }

    const initializer = property.getInitializer();
    if (!initializer) continue;

    // Deprecated alias: [ElementsTypes.TAB_VIEW]: ElementsTypes.TABS
    if (initializer.isKind(SyntaxKind.PropertyAccessExpression)) continue;

    if (!initializer.isKind(SyntaxKind.Identifier)) continue;
    const className = initializer.getText();

    const fallbackDir = findElementDirFallback(className);
    if (!fallbackDir) {
      console.warn(`[WARN] No directory found for ${className}`);
      continue;
    }
    mapping[stringValue] = {
      dirPath: fallbackDir.dirPath,
      dirName: fallbackDir.dirName,
      baseName: className.replace(/Element$/, ''),
    };
  }

  return mapping;
}

/**
 * Fallback: ищем директорию элемента по fs без ts-morph.
 */
function findElementDirFallback(className: string): { dirPath: string; dirName: string } | null {
  const entries = fs.readdirSync(ELEMENTS_DIR, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dirPath = path.resolve(ELEMENTS_DIR, entry.name);

    if (fs.existsSync(path.join(dirPath, `${className}.ts`))) {
      return { dirPath, dirName: entry.name };
    }

    const found = findFileInElementDir(dirPath, `${className}.ts`);
    if (found) {
      return { dirPath: path.dirname(found), dirName: path.basename(path.dirname(found)) };
    }
  }

  return null;
}

/**
 * Извлекает маппинг enum member name → string value из ElementsTypes enum.
 * Пример: TEXT_FIELD → 'text-field', BUTTON → 'button'
 */
function extractEnumStringValueMap(sourceFile: SourceFile): Record<string, string> {
  const enumMap: Record<string, string> = {};

  for (const node of sourceFile.getStatements()) {
    if (node.isKind(SyntaxKind.EnumDeclaration) && node.getName() === 'ElementsTypes') {
      for (const member of node.getMembers()) {
        const memberName = member.getName();
        const initializer = member.getInitializer();
        if (initializer) {
          const value = initializer.getText().replace(/['"`]/g, '');
          enumMap[memberName] = value;
        }
      }
    }
  }

  return enumMap;
}

/**
 * Находит ObjectLiteralExpression объекта ElementsMap.
 */
function findElementsMapObject(sourceFile: SourceFile): Node | null {
  for (const stmt of sourceFile.getStatements()) {
    if (stmt.isKind(SyntaxKind.VariableStatement)) {
      const declarations = stmt.getDeclarations();
      for (const decl of declarations) {
        if (decl.getName() === 'ElementsMap') {
          const initializer = decl.getInitializer();
          if (initializer && initializer.isKind(SyntaxKind.ObjectLiteralExpression)) {
            return initializer;
          }
        }
      }
    }

    if (stmt.isKind(SyntaxKind.ExportAssignment)) {
      const expr = stmt.getExpression();
      if (expr && expr.isKind(SyntaxKind.ObjectLiteralExpression)) {
        return expr;
      }
    }
  }

  const exportAssignments = sourceFile.getExportAssignments();
  if (exportAssignments.length > 0) {
    const expr = exportAssignments[0].getExpression();
    if (expr && expr.isKind(SyntaxKind.ObjectLiteralExpression)) {
      return expr;
    }
  }

  return null;
}

// ─── ts-morph helpers ────────────────────────────────────────────────────────

function normalizeElementName(rawName: string): string {
  const upper = rawName.toUpperCase();
  if (DEPRECATED_TYPE_MAP[upper]) {
    return DEPRECATED_TYPE_MAP[upper];
  }
  return rawName.toLowerCase().replace(/_/g, '-');
}

/** Кэш маппинга — вычисляется один раз */
let _elementMapping: ElementMapping | null = null;

function getElementMapping(): ElementMapping {
  if (!_elementMapping) {
    _elementMapping = extractElementMapping();
  }
  return _elementMapping;
}

function findElementBundle(elementType: string): { dirPath: string; dirName: string; baseName: string } | null {
  const mapping = getElementMapping();
  const entry = mapping[elementType];

  if (!entry) return null;
  if (!fs.existsSync(entry.dirPath) || !fs.statSync(entry.dirPath).isDirectory()) return null;

  return entry;
}

function findFileInElementDir(dirPath: string, filenamePattern: string): string | null {
  const exactPath = path.resolve(dirPath, filenamePattern);
  if (fs.existsSync(exactPath)) return exactPath;
  return findFileRecursively(dirPath, filenamePattern);
}

function findFileRecursively(dirPath: string, filename: string): string | null {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      const found = findFileRecursively(fullPath, filename);
      if (found) return found;
    } else if (entry.name === filename) {
      return fullPath;
    }
  }

  return null;
}

/**
 * Создаёт Project с ПОЛНОЙ программой lib.
 *
 * Это требование type checker'а: чтобы резолвить типы свойств
 * (Icon из PropertyConstants, ActionModel.* из namespace, enum literal-ы),
 * компилятор должен видеть все файлы проекта и следовать по импортам.
 *
 * Первичная загрузка медленная (резолв программы), но это разовая
 * стоимость на запуск скрипта.
 */
function createProject(): Project {
  const libPath = path.resolve(ROOT_DIR, 'packages/lib');

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

/**
 * Извлекает static defaultProps из класса.
 */
function extractDefaultProps(classNode: ClassDeclaration): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};

  for (const member of classNode.getMembers()) {
    if (member.isKind(SyntaxKind.PropertyDeclaration) && member.isStatic()) {
      if (member.getName() === 'defaultProps') {
        const initializer = member.getInitializer();
        if (initializer && initializer.isKind(SyntaxKind.ObjectLiteralExpression)) {
          for (const prop of initializer.getProperties()) {
            if (!prop.isKind(SyntaxKind.PropertyAssignment)) continue;
            const name = prop.getName().replace(/^['_]+/, '');
            const valueNode = prop.getInitializer();
            if (!valueNode) continue;
            defaults[name] = extractLiteralValue(valueNode);
          }
          return defaults;
        }
      }
    }
  }

  return defaults;
}

function extractLiteralValue(node: any): unknown {
  switch (node.getKind()) {
    case SyntaxKind.NullKeyword:
      return null;
    case SyntaxKind.TrueKeyword:
      return true;
    case SyntaxKind.FalseKeyword:
      return false;
    case SyntaxKind.NumericLiteral:
      return (node as any).getLiteralValue();
    case SyntaxKind.StringLiteral:
      return (node as any).getLiteralValue();
    case SyntaxKind.Identifier: {
      const text = node.getText();
      if (text === 'undefined') return undefined;
      return text;
    }
    case SyntaxKind.PropertyAccessExpression: {
      const name = node.getName();
      const symbol = node.getSymbol();
      if (symbol) {
        const declarations = symbol.getDeclarations();
        for (const decl of declarations) {
          if (decl.isKind(SyntaxKind.EnumMember)) {
            const initializer = decl.getInitializer();
            if (initializer) {
              return extractLiteralValue(initializer);
            }
            return name;
          }
        }
      }
      return name;
    }
    case SyntaxKind.ArrayLiteralExpression: {
      const items: unknown[] = [];
      for (const elem of (node as any).getElements()) {
        items.push(extractLiteralValue(elem));
      }
      return items;
    }
    case SyntaxKind.ObjectLiteralExpression: {
      const obj: Record<string, unknown> = {};
      for (const prop of (node as any).getProperties()) {
        if (prop.isKind(SyntaxKind.PropertyAssignment)) {
          const key = prop.getName();
          const init = prop.getInitializer();
          if (init) obj[String(key)] = extractLiteralValue(init);
        }
      }
      return obj;
    }
    default:
      return node.getText();
  }
}

/**
 * Извлекает публичные методы из @PublicApiMethod декорированных членов класса.
 */
function extractPublicMethods(classNode: ClassDeclaration): SchemaMethod[] {
  const methods: SchemaMethod[] = [];

  for (const member of classNode.getInstanceMembers()) {
    if (!member.isKind(SyntaxKind.MethodDeclaration)) continue;

    const decorators = member.getDecorators();
    const hasPublicApiMethod = decorators.some((d) => {
      const name = d.getName();
      return name === 'PublicApiMethod' || name === 'PublicApiField';
    });

    if (!hasPublicApiMethod) continue;

    const sig = member.getSignature();
    const returnType = sig?.getReturnType().getText() ?? 'void';
    const params = member.getParameters();

    methods.push({
      name: member.getName(),
      returnType,
      parameters: params.map((p) => ({
        type: p.getTypeNode()?.getText() ?? 'any',
        description: p.getName(),
      })),
    });
  }

  return methods;
}

/**
 * Извлекает значения из EnumDeclaration.
 */
function extractEnumValues(enumNode: EnumDeclaration): string[] {
  return enumNode.getMembers().map((m) => {
    const name = m.getName();
    const value = m.getInitializer();
    if (value?.isKind(SyntaxKind.StringLiteral)) {
      return (value as any).getLiteralValue() as string;
    }
    if (value?.isKind(SyntaxKind.NumericLiteral)) {
      return String((value as any).getLiteralValue() as number);
    }
    return name;
  });
}

/**
 * Извлекает свойства интерфейса XProps.
 *
 * Возвращает ссылку на PropertySignature — тип резолвится позже
 * через type checker (member.getType()), см. typeToSchema.
 */
function extractProps(sourceFile: SourceFile): Record<string, { member: PropertySignature; optional: boolean }> {
  const props: Record<string, { member: PropertySignature; optional: boolean }> = {};

  // 1. Интерфейсы: interface XProps extends ContainerProps { ... }
  for (const node of sourceFile.getDescendantsOfKind(SyntaxKind.InterfaceDeclaration)) {
    const members = node.getMembers();
    for (const member of members) {
      if (!member.isKind(SyntaxKind.PropertySignature)) continue;

      const name = member.getName();
      if (name.startsWith('_')) continue; // private
      if (name === 'type') continue; // internal

      props[name] = { member, optional: member.hasQuestionToken() };
    }
  }

  // 2. Type alias с intersection: type XProps = { ... } & BaseProps
  for (const node of sourceFile.getDescendantsOfKind(SyntaxKind.TypeAliasDeclaration)) {
    // Используем type checker для резолва intersection в Type
    const type = node.getType();
    for (const prop of type.getProperties()) {
      const propName = prop.getName();
      if (propName.startsWith('_')) continue;
      if (propName === 'type') continue;
      if (props[propName]) continue; // уже из interface
      const decls = prop.getDeclarations();
      const sig = decls.find((d) => d.isKind(SyntaxKind.PropertySignature)) as PropertySignature | undefined;
      if (!sig) continue;
      // Берём только пропсы, объявленные внутри этого же Props-исходника.
      // Унаследованные из BaseProps (slotType и т.п.) исключаем — иначе
      // type alias'ы выдавали бы лишние base-пропсы, которых нет у
      // interface-элементов (те берут только собственные members).
      if (sig.getSourceFile() !== sourceFile) continue;
      props[propName] = { member: sig, optional: sig.hasQuestionToken() };
    }
  }

  return props;
}

function isContainer(classNode: ClassDeclaration): boolean {
  const extendsClause = classNode.getExtends();
  if (!extendsClause) return false;
  const typeName = extendsClause.getText();
  return typeName.includes('ContainerImpl') || typeName.includes('Container');
}

function extractChildren(classNode: ClassDeclaration): { allowedTypes: string[] } | undefined {
  if (!isContainer(classNode)) return undefined;

  for (const member of classNode.getInstanceMembers()) {
    if (member.isKind(SyntaxKind.GetAccessor)) {
      const name = member.getName();
      if (name === 'allowedTypes' || name === 'childrenTypes') {
        const body = member.getBody();
        if (body) {
          const text = body.getText();
          const match = text.match(/ElementsTypes\.(\w+)/g);
          if (match) {
            return {
              allowedTypes: match.map((m) =>
                m.replace('ElementsTypes.', '').toLowerCase().replace(/_/g, '-')
              ),
            };
          }
        }
      }
    }
  }

  return undefined;
}

// ─── Icon enum → shared icon.schema.json через $ref ──────────────────────────

/** Кэш: флаг, что icon.schema.json уже сгенерирован */
let _iconSchemaGenerated = false;
/** Кэш: значения enum Icon в порядке объявления (первый прогон) */
let _iconEnumValues: string[] | null = null;

/**
 * Определяет, является ли тип «Icon» — либо прямое enum (PropertyConstants),
 * либо alias/template (ModelConstants).
 *
 * Определение — СТРОГО по имени символа:
 * 1. getAliasSymbol()?.getName() === 'Icon' — template-literal alias (ModelConstants).
 * 2. getSymbol()?.getName() === 'Icon' — enum Icon (PropertyConstants).
 *
 * ВАЖНО: ts-morph разворачивает `Icon | null | undefined` в union из ~559
 * литералов, у которого ни alias-, ни прямой символ не называется 'Icon'.
 * Такой случай ловится НЕ здесь, а в union-ветке typeToSchema: если все
 * части — литералы и их >50, это заведомо развёрнутый Icon (см. allLiterals).
 *
 * Текстовый ('.Icon') детект НЕ используется: он ложно срабатывает на
 * объектные типы (badge, actions), чей getText() включает вложенные Icon-поля,
 * и на локальные enum'ы вроде IconProps (icon-toggle-button), не являющиеся Icon.
 */
function isIconType(type: Type): boolean {
  const aliasName = type.getAliasSymbol()?.getName();
  const directName = type.getSymbol()?.getName();
  return aliasName === 'Icon' || directName === 'Icon';
}

/**
 * При первом вызове: извлекает все значения enum Icon (порядок объявления),
 * записывает packages/element-schemas/src/shared/icon.schema.json.
 * Возвращает { $ref: '../shared/icon.schema.json#' } для использования в схеме элемента.
 */
function ensureIconSchema(): { $ref: string } | null {
  if (_iconSchemaGenerated) {
    return { $ref: '../shared/icon.schema.json#' };
  }

  const values = loadIconEnumValues();
  if (!values) return null;

  const sharedDir = path.resolve(ROOT_DIR, 'packages/element-schemas/src/shared');
  if (!fs.existsSync(sharedDir)) {
    fs.mkdirSync(sharedDir, { recursive: true });
  }

  const iconSchemaPath = path.resolve(sharedDir, 'icon.schema.json');
  const iconSchema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    // $id должен отличаться от $id элементной схемы icon.schema.json, иначе
    // загрузка обеих схем в один валидатор даёт "key or id already exists".
    // Ровно в этот URI резолвится и относительный $ref элемента.
    $id: 'https://framework.internal/shared/icon.schema.json',
    title: 'Icon',
    type: ['string', 'null'],
    enum: values,
  };

  fs.writeFileSync(iconSchemaPath, JSON.stringify(iconSchema, null, 2) + '\n');
  console.log(`  Generated shared/icon.schema.json (${values.length} icons)`);

  _iconSchemaGenerated = true;
  return { $ref: '../shared/icon.schema.json#' };
}

/**
 * Извлекает значения enum Icon из PropertyConstants.ts (порядок объявления).
 * Кеширует в _iconEnumValues. Возвращает null, если enum не найден.
 */
function loadIconEnumValues(): string[] | null {
  if (_iconEnumValues !== null) return _iconEnumValues;

  const propertyConstantsPath = path.resolve(ELEMENTS_DIR, 'PropertyConstants.ts');
  if (!fs.existsSync(propertyConstantsPath)) {
    console.warn('[WARN] PropertyConstants.ts not found, cannot extract Icon enum');
    return null;
  }

  const iconProject = new Project({
    compilerOptions: { skipLibCheck: true },
  });
  const iconFile = iconProject.addSourceFileAtPath(propertyConstantsPath);

  let iconEnumDecl: EnumDeclaration | undefined;
  for (const node of iconFile.getStatements()) {
    if (node.isKind(SyntaxKind.EnumDeclaration) && node.getName() === 'Icon') {
      iconEnumDecl = node;
      break;
    }
  }

  if (!iconEnumDecl) {
    console.warn('[WARN] Icon enum not found in PropertyConstants.ts');
    return null;
  }

  _iconEnumValues = extractEnumValues(iconEnumDecl);
  return _iconEnumValues;
}

/**
 * Возвращает множество значений Icon enum для сверки union-литералов.
 * Используется как страховка в union-ветке typeToSchema: большой набор
 * литералов признаётся Icon только если ОН ПОДМНОЖЕСТВО общего Icon enum.
 */
function getIconEnumValueSet(): Set<string> | null {
  const values = loadIconEnumValues();
  return values ? new Set(values) : null;
}

// ─── Type resolution через TypeScript type checker ──────────────────────────
//
// ВАЖНО: здесь нет парсинга текста типа (split('|'), regex, поиск по имени).
// Компилятор уже резолвил тип, мы только читаем его структуру флагами:
//
//   member.getType() → Type
//     isUnion()        → 'A | B', 'T | null'
//     isEnumLiteral()  → ActionTypes.button (литерал-дискриминатор)
//     isEnum()         → Icon (enum целиком)
//     isArray()        → Array<T>, T[]
//     isObject()       → ActionModel.IconButton, TooltipModel (рекурсия)
//
// Checker сам следует по импортам: PropertyConstants.ts, namespace ActionModel,
// TextConstants.ts — ничего из этого вручную загружать не нужно.

/**
 * «Движковый» тип или данные?
 *
 * Движковые типы (BaseElement, Container и наследники движка) описывают рантайм-узел
 * виртуального DOM и напичканы методами: getAttributes(), render(), appendChild()...
 * Раскрывать их нельзя: рекурсия уходит в дерево DOM
 * (parentElement → children → firstElementChild → ...) и вместо контракта пропсов
 * отдаёт мусор (в т.ч. `type: ElementsTypes | InternalComponentTypes` — 157 литералов).
 *
 * Данные (BadgeModel, SearchFieldOptionModel, TooltipModel, ...) методов не имеют:
 * обработчики в них записаны как `onX?: () => void`, то есть PropertySignature с
 * функциональным типом, а не MethodSignature. Признак точный и не зависит от
 * имён/путей файлов — в отличие от проверки на class: BaseElement и Container —
 * это interface'ы (dom/BaseElement/BaseElement.ts, dom/Container/Container.ts).
 *
 * Учитываются только методы ИМЕНОВАННЫХ деклараций (interface/class). Метод внутри
 * анонимного литерала типа — это часть контракта пропса, а не API движка:
 * `itemProps?: Array<{ uid: string; error: { message: string; retryRequest(): void } }>`
 * (AttachmentProps.ts) обязана остаться раскрытой, иначе из схемы пропадёт `message`.
 * Методы `Array<T>` из lib.d.ts объявлены в именованном interface, поэтому кортежи
 * (например `MenuItems?: [{...}]` у list-item) по-прежнему не раскрываются — в их
 * `getProperties()` входят push/concat/flat, которые раньше попадали в схему как поля.
 *
 * `constructor` — ConstructorDeclaration, не метод, поэтому data-классы
 * (Radio, SocialBlockItem) продолжают раскрываться.
 */
function isRuntimeObjectType(type: Type): boolean {
  for (const prop of type.getProperties()) {
    for (const decl of prop.getDeclarations()) {
      const parent = decl.getParent();
      // Метод класса (BaseElementImpl, SegmentItemElement, ...)
      if (decl.isKind(SyntaxKind.MethodDeclaration) && parent?.isKind(SyntaxKind.ClassDeclaration)) {
        return true;
      }
      // Метод interface (BaseElement, Container, Array<T>, ...)
      if (decl.isKind(SyntaxKind.MethodSignature) && parent?.isKind(SyntaxKind.InterfaceDeclaration)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Конвертирует резолвленный Type в SchemaProperty.
 */
function typeToSchema(type: Type, seen: Set<string> = new Set()): SchemaProperty {
  // Icon enum (прямо или через union: Icon | null | undefined) → $ref на shared/schema
  if (isIconType(type)) {
    const ref = ensureIconSchema();
    if (ref) return ref;
  }

  // Union: 'A | B', 'T | null', 'MaskProps | Array<Record<string, any>>'
  if (type.isUnion()) {
    const parts = type.getUnionTypes();
    // undefined ≠ null: опциональность ('label?: string') — это работа required-массива,
    // а не nullable-типа. Null добавляем в тип ТОЛЬКО если он объявлен явно ('T | null').
    const hasNull = parts.some((p) => p.isNull());
    const nonNull = parts.filter((p) => !p.isNull() && !p.isUndefined());

    // Все non-null части — булевы литералы (true | false) → { type: 'boolean' }
    // isBooleanLiteral() не проходит через isEnumLiteral/isStringLiteral, поэтому
    // без этой проверки union true | false падал бы в fallback {type:'any', oneOf: [...]}.
    if (nonNull.length > 0 && nonNull.every((p) => p.isBooleanLiteral())) {
      return { type: 'boolean' };
    }

    // Union из литералов (enum members, string literals) → один enum.
    // Покрывает: 'primary' | 'secondary', Icon (template-literal alias
    // из ModelConstants раскрывается checker'ом именно в такой union).
    const literalValues: string[] = [];
    let allLiterals = nonNull.length > 0;
    for (const p of nonNull) {
      if (p.isEnumLiteral() || p.isStringLiteral()) {
        literalValues.push(String(p.getLiteralValue() ?? p.getText()));
      } else {
        allLiterals = false;
        break;
      }
    }
    if (allLiterals) {
      // draft-07 запрещает дубликаты в enum: значение может приходить из двух
      // веток union (например 'error' в badge.variant). Set даёт дедуп с
      // сохранением порядка первых вхождений.
      const uniqueValues = [...new Set(literalValues)];

      // Union из 50+ литералов — это развёрнутый Icon enum (559 значений),
      // а не легитимный маленький enum (primary|secondary). → icon-$ref.
      // СТРАХОВКА: $ref только если каждое значение literalValues входит в
      // общее множество Icon enum. Иначе (кастомный набор >50, не равный Icon)
      // остаёмся обычным inline enum.
      if (uniqueValues.length > 50) {
        const iconSet = getIconEnumValueSet();
        const isSubsetOfIcon = iconSet !== null && uniqueValues.every((v) => iconSet.has(v));
        if (isSubsetOfIcon) {
          const ref = ensureIconSchema();
          if (ref) return ref;
        }
      }
      const base: SchemaProperty = { type: 'string', enum: uniqueValues };
      return hasNull ? { ...base, type: ['string', 'null'] } : base;
    }

    const resolved = nonNull.map((p) => typeToSchema(p, seen));

    // Одна не-null часть + null → ['T', 'null'], НЕ oneOf
    if (resolved.length === 1) {
      const inner = resolved[0];
      if (hasNull && typeof inner.type === 'string') {
        inner.type = [inner.type, 'null'];
      }
      return inner;
    }

    if (hasNull) resolved.push({ type: 'null' });
    // Нераспознанная ветка union отдаёт пустую схему, а она совпадает с любым
    // значением. Внутри oneOf («ровно одно совпадение») это делает ветку
    // невыполнимой для любых значений, поэтому уходит в anyOf («не менее одного»).
    if (resolved.some((p) => Object.keys(p).length === 0)) {
      return { anyOf: resolved };
    }
    const allObjects = resolved.every((p) => p.type === 'object' || p.type === 'null');
    return allObjects ? { type: 'object', oneOf: resolved } : { oneOf: resolved };
  }

  // ActionTypes.button → литерал-дискриминатор: enum из ОДНОГО значения
  if (type.isEnumLiteral()) {
    return { type: 'string', enum: [String(type.getLiteralValue() ?? type.getText())] };
  }

  // Icon (enum целиком) → все значения
  if (type.isEnum()) {
    const enumDecl = type
      .getSymbol()
      ?.getDeclarations()
      .find((d): d is EnumDeclaration => d.isKind(SyntaxKind.EnumDeclaration));
    if (enumDecl) {
      return { type: 'string', enum: extractEnumValues(enumDecl) };
    }
    return { type: 'string' };
  }

  // Array<T>, T[]
  if (type.isArray()) {
    const elementType = type.getArrayElementType();
    return { type: 'array', items: elementType ? typeToSchema(elementType, seen) : {} };
  }

  // Примитивы
  if (type.isString()) return { type: 'string' };
  if (type.isNumber()) return { type: 'number' };
  if (type.isBoolean()) return { type: 'boolean' };

  // Объектные типы: ActionModel.IconButton, TooltipModel и т.п.
  // Рекурсия по свойствам через checker (prop.getTypeAtLocation).
  if (type.isObject() && type.getCallSignatures().length === 0) {
    const symbol = type.getSymbol();
    const aliasDecl = type.getAliasSymbol()?.getDeclarations()?.[0];
    const decl = aliasDecl ?? symbol?.getDeclarations()?.[0];
    const declPath = decl?.getSourceFile().getFilePath() ?? '';

    // Не раскрываем типы из lib.d.ts (Date, Record и т.п.) и из .d.ts файлов —
    // там DOM-мусор (parentElement/nextSibling/tag names) в enum 157 значений.
    const srcFile = decl?.getSourceFile();
    if (declPath.includes('typescript/lib') || srcFile?.isDeclarationFile()) {
      return {};
    }

    // Рантайм-узел движка (методы в типе) — не контракту пропсов, не раскрываем.
    if (isRuntimeObjectType(type)) {
      return {};
    }

    const key = `${declPath}#${type.getText()}`;
    if (seen.has(key)) return {}; // защита от циклических типов
    const nextSeen = new Set(seen).add(key);

    const properties: Record<string, SchemaProperty> = {};
    for (const prop of type.getProperties()) {
      const propName = prop.getName();
      // Те же отсеки, что в extractProps: приватное и служебный дискриминатор.
      // Без этого во вложенных объектах раскрывается PrivateBaseProps:
      // `type: ElementsTypes | InternalComponentTypes` (157 литералов) и
      // `_parent: Container`, ведущий в дерево DOM.
      if (propName.startsWith('_') || propName === 'type') continue;
      const propType = decl ? prop.getTypeAtLocation(decl) : prop.getDeclaredType();
      properties[propName] = typeToSchema(propType, nextSeen);
    }

    if (Object.keys(properties).length > 0) {
      return { type: 'object', properties };
    }
  }

  // Фallback: тип не распознан. Пустая схема == «любое JSON-значение» и остаётся
  // валидной частью draft-07, в отличие от { type: 'any' }.
  return {};
}

// ─── Schema generation ───────────────────────────────────────────────────────

function generateSchema(
  elementType: string,
  baseProps: Record<string, SchemaProperty>,
  props: Record<string, { member: PropertySignature; optional: boolean }>,
  defaultProps: Record<string, unknown>,
  methods: SchemaMethod[],
  isContainerFlag: boolean,
  children: { allowedTypes: string[] } | undefined,
  title: string
): ElementSchema {
  const humanTitle = title
    .replace(/Element$/, '')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const schema: ElementSchema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: `https://framework.internal/schemas/${elementType}.schema.json`,
    title: humanTitle,
    description: `JSON-схема для UI-элемента "${elementType}"`,
    type: 'object',
    elementType,
    'x-category': detectCategory(elementType),
    properties: { ...baseProps },
    'x-events': {},
    'x-methods': methods,
    'x-defaults': {},
    required: [],
    deprecatedAliases: [],
  };

  for (const [propName, propDef] of Object.entries(props)) {
    if (propName in schema.properties) continue; // already in base

    // Тип резолвит TypeScript checker — включая внешние enum,
    // namespace-типы, enum literal-ы и union-ы
    const schemaProp = typeToSchema(propDef.member.getType());

    if (propName in defaultProps) {
      schemaProp.default = defaultProps[propName];
      schema['x-defaults'][propName] = defaultProps[propName];
    }

    schema.properties[propName] = schemaProp;

    if (!propDef.optional) {
      schema.required!.push(propName);
    }
  }

  const INTERNAL_FIELDS = new Set([
    'type',
    '_parent',
    '_nextElement',
    '_previousElement',
    'clientId',
    'parentId',
    'slotType',
    'isComponentChild',
    'width',
    'margin',
  ]);
  for (const [key, value] of Object.entries(defaultProps)) {
    if (!INTERNAL_FIELDS.has(key)) {
      schema['x-defaults'][key] = value;
    }
  }

  if (isContainerFlag && children) {
    schema.children = children;
  }

  if (schema.required) {
    schema.required.sort();
  }

  return schema;
}

/**
 * Находит Props-файл через разбор import-ов из XElement.ts.
 *
 * Primary: resolved imports (getModuleSpecifierSourceFile).
 * Fallback: поиск по директории элемента, затем по basename.
 */
function resolvePropsFile(
  elementDir: { dirName: string; dirPath: string },
  elementSf: SourceFile,
  project: Project,
  baseName: string
): SourceFile | null {
  const expectedPropsName = baseName + 'Props';
  const propsCandidates: SourceFile[] = [];

  for (const importDecl of elementSf.getImportDeclarations()) {
    const resolvedSf = importDecl.getModuleSpecifierSourceFile();
    if (!resolvedSf) continue;

    if (/Props\.ts$/i.test(resolvedSf.getBaseName()) && !/ModelProps/i.test(resolvedSf.getBaseName())) {
      propsCandidates.push(resolvedSf);
    }
  }

  for (const candidate of propsCandidates) {
    const hasMainInterface = candidate.getInterfaces().some((i) => i.getName() === expectedPropsName);
    const hasMainTypeAlias = candidate.getTypeAliases().some((ta) => ta.getName() === expectedPropsName);
    if (hasMainInterface || hasMainTypeAlias) {
      return candidate;
    }
  }

  if (!propsCandidates.length) {
    const dirFiles = project.getSourceFiles().filter((sf) => {
      const fp = sf.getFilePath();
      return (
        fp.startsWith(elementDir.dirPath) &&
        /Props\.ts$/i.test(path.basename(fp)) &&
        !/ModelProps/i.test(path.basename(fp))
      );
    });

    for (const sf of dirFiles) {
      const hasMainInterface = sf.getInterfaces().some((i) => i.getName() === expectedPropsName);
      const hasMainTypeAlias = sf.getTypeAliases().some((ta) => ta.getName() === expectedPropsName);
      if (hasMainInterface || hasMainTypeAlias) {
        return sf;
      }
    }
  }

  const basenamePropsFile = findFileInElementDir(elementDir.dirPath, `${baseName}Props.ts`);
  if (basenamePropsFile) {
    return project.getSourceFile(basenamePropsFile) ?? project.addSourceFileAtPath(basenamePropsFile);
  }

  console.warn(
    `[WARN] Не найден Props-файл для ${elementDir.dirName}. ` +
    `Ожидался ${expectedPropsName}. Генерируем схему без element-specific props.`
  );
  return null;
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  const args = parseArgs(process.argv.slice(2)) as CliArgs;
  const elementRaw = args.element as string;

  if (!elementRaw) {
    console.error('Usage: ts-node generate-element-spec.ts --element <name> [--checkOnly] [--outputDir <dir>]');
    process.exit(1);
  }

  const elementType = normalizeElementName(elementRaw);
  const outputDir = (args.outputDir as string) || path.resolve(ROOT_DIR, 'packages/element-schemas/src/schemas');
  const manifestPath = path.resolve(ROOT_DIR, 'packages/element-schemas/src/index.json');
  const checkOnly = !!(args.checkOnly || args.check);

  console.log(`Generating schema for element: ${elementType}`);

  // 1. Маппинг elementType → baseName/директория
  const elementDir = findElementBundle(elementType);
  if (!elementDir) {
    console.error(`Element bundle not found for: ${elementType}`);
    process.exit(1);
  }
  console.log(`Found element bundle: ${elementDir.dirPath} (${elementDir.dirName})`);

  // 2. Полная программа lib — нужна type checker'у для резолва типов
  console.log('Loading full lib program (first run is slow)...');
  const project = createProject();
  const baseName = elementDir.baseName;

  // 3. Класс элемента — перебор SourceFile (у Project нет getClass)
  const elementClassName = `${baseName}Element`;
  let classNode: ClassDeclaration | undefined;
  for (const sf of project.getSourceFiles()) {
    classNode = sf.getClass(elementClassName);
    if (classNode) break;
  }
  if (!classNode) {
    console.error(`Class ${elementClassName} not found in program`);
    process.exit(1);
  }

  // 4. defaultProps, методы, контейнерность
  const elementDefaults = extractDefaultProps(classNode);
  const methods = extractPublicMethods(classNode);
  const isContainerFlag = isContainer(classNode);
  const children = extractChildren(classNode);
  const elementSf = classNode.getSourceFile();

  // 5. Props-файл
  const propsSf = resolvePropsFile(elementDir, elementSf, project, baseName);

  let props: Record<string, { member: PropertySignature; optional: boolean }> = {};
  if (propsSf) {
    props = extractProps(propsSf);
  }

  // 6. Базовые пропсы и события
  const baseSchemaPath = path.resolve(ROOT_DIR, 'packages/element-schemas/src/shared/base-element.schema.json');
  let baseProps: Record<string, SchemaProperty> = {};
  if (fs.existsSync(baseSchemaPath)) {
    const baseSchema = JSON.parse(fs.readFileSync(baseSchemaPath, 'utf-8'));
    baseProps = baseSchema.properties || {};
  }

  const baseEventsPath = path.resolve(ROOT_DIR, 'packages/element-schemas/src/shared/base-events.schema.json');
  let baseEvents: Record<string, SchemaEvent> = {};
  if (fs.existsSync(baseEventsPath)) {
    const baseEventsSchema = JSON.parse(fs.readFileSync(baseEventsPath, 'utf-8'));
    baseEvents = baseEventsSchema['x-events'] || {};
  }

  // 7. Генерация схемы
  const className = classNode.getName() || elementType;
  const schema = generateSchema(
    elementType,
    baseProps,
    props,
    elementDefaults,
    methods,
    isContainerFlag,
    children,
    className
  );

  schema['x-events'] = { ...baseEvents };

  // 8. Check mode
  if (checkOnly) {
    const schemaPath = path.join(outputDir, `${elementType}.schema.json`);
    if (!fs.existsSync(schemaPath)) {
      console.error(`Schema file not found for comparison: ${schemaPath}`);
      process.exit(1);
    }
    const existing = fs.readFileSync(schemaPath, 'utf-8');
    const generated = JSON.stringify(schema, null, 2) + '\n';

    if (existing.trim() !== generated.trim()) {
      console.error(`Schema mismatch for ${elementType}. Run generation to update.`);
      process.exit(1);
    }
    console.log(`Schema check passed for ${elementType}`);
    return;
  }

  // 9. Write schema file
  const schemaPath = path.join(outputDir, `${elementType}.schema.json`);
  fs.mkdirSync(path.dirname(schemaPath), { recursive: true });
  fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2) + '\n');
  console.log(`Schema written to: ${schemaPath}`);

  // 10. Update manifest (index.json)
  if (fs.existsSync(manifestPath)) {
    const manifest: Manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    manifest[elementType] = {
      path: `src/schemas/${elementType}.schema.json`,
      title: schema.title,
      deprecatedAliases: schema.deprecatedAliases || [],
    };
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    console.log(`Manifest updated: ${manifestPath}`);
  } else {
    console.warn(`Manifest not found: ${manifestPath} (skipping update)`);
  }

  console.log(`Done! Generated schema for ${elementType}`);
}

main();