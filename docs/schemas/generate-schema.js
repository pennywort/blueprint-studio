// СОБРАНО из docs/schemas/generator (npm run schemas:build) — не править вручную
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// docs/schemas/generator/cli.ts
var fs3 = __toESM(require("fs"), 1);
var path5 = __toESM(require("path"), 1);

// docs/schemas/generator/component.ts
var path3 = __toESM(require("path"), 1);
var import_ts_morph3 = require("ts-morph");

// docs/schemas/generator/config.ts
var ROOT_MARKER = "packages/lib/tsconfig.json";
var PATHS = {
  elementsDir: "packages/lib/src/dom/elements",
  elementsMap: "packages/lib/src/dom/elements/ElementsMap.ts",
  elementsMapVariable: "ElementsMap",
  constants: "packages/constants/src/index.ts",
  elementsTypesEnum: "ElementsTypes",
  /** В constants: карта «устаревший тип → актуальный» ({ [ElementsTypes.A]: ElementsTypes.B }). */
  legacyTypesMap: "LegacyElementsTypesMap",
  /** В constants: устаревшие типы без замены ([ElementsTypes.A, …]). */
  deprecatedTypesList: "DeprecatedElementsTypes",
  libPackage: "packages/lib",
  schemasPackage: "packages/element-schemas",
  /** Относительно schemasPackage. */
  schemasDir: "src/schemas",
  sharedDir: "src/shared",
  manifest: "src/index.json"
};
var BASE = {
  /** Тип общих props. */
  propsType: "BaseProps",
  propsFile: "packages/lib/src/dom/BaseElement/BaseProps.ts",
  /** Интерфейс элемента: его свойства-функции on* — общие события. */
  elementInterface: "BaseElement",
  elementFile: "packages/lib/src/dom/BaseElement/BaseElement.ts",
  eventNamePattern: /^on[A-Z]/,
  fileName: "base-element.schema.json",
  title: "BaseElement"
};
var COMPONENT = {
  /** Фабрика компонентов: вызов `factory<P, C, S>(ElementsTypes.X, { ... })`. */
  factory: "ComponentFactoryImpl",
  /** Метод отправки события в теле компонента: `$emit('имя', значение)`. */
  emitMethod: "$emit",
  /** Окончание имени переменной/функции-обёртки, отрезаемое в заголовке схемы. */
  titleSuffix: /Component$/,
  /** Каталог схем компонентов относительно schemasPackage. */
  componentsDir: "src/components"
};
var SCHEMA_ID_BASE = "https://framework.internal";
var CLI_NAME_ALIASES = {
  TEXT: "text-field",
  VIEW: "container",
  SCROLL_VIEW: "container",
  LABEL: "typography",
  SUGGEST: "autocomplete",
  DATE_PICKER: "date-field",
  MENU_BUTTON: "dropdown",
  DIALOG: "modal"
};
var CATEGORY_BY_ELEMENT = {
  "pop-up": "overlay",
  modal: "overlay",
  dialog: "overlay",
  popover: "overlay",
  drawer: "overlay",
  tooltip: "overlay",
  container: "layout",
  view: "layout",
  grid: "layout",
  "scroll-view": "layout",
  "flex-container": "layout",
  "text-field": "form",
  select: "form",
  checkbox: "form",
  "radio-group": "form",
  switch: "form",
  "date-field": "form",
  "search-field": "form",
  autocomplete: "form",
  "mask-input": "form",
  "step-input": "form",
  range: "form",
  rating: "form",
  "color-card": "form",
  counter: "form"
};
var EXCLUDED_PROPS = [
  "type",
  "clientId",
  "parentId",
  "slotType",
  "isComponentChild"
];
var ELEMENT_TYPE_ENUMS = ["ElementsTypes", "InternalComponentTypes"];
var ELEMENT_REF_TYPES = ["BaseProps", "BaseElement", "BaseElementImpl"];
var KNOWN_EXTERNAL_TYPES = {
  Date: { type: "string", format: "date-time" }
};
var KNOWN_CONSTANTS = {
  "Number.MAX_VALUE": Number.MAX_VALUE,
  "Number.MIN_VALUE": Number.MIN_VALUE,
  "Number.MAX_SAFE_INTEGER": Number.MAX_SAFE_INTEGER,
  "Number.MIN_SAFE_INTEGER": Number.MIN_SAFE_INTEGER
};
var CONTAINER_BASE_CLASSES = ["ContainerImpl"];
var CHILDREN_GETTERS = ["allowedTypes", "childrenTypes"];
var PUBLIC_METHOD_DECORATORS = ["PublicApiMethod", "PublicApiField"];
var SHARED_ENUMS = [
  {
    typeName: "Icon",
    sourceFile: "packages/lib/src/dom/elements/PropertyConstants.ts",
    enumName: "Icon",
    fileName: "icon.schema.json",
    title: "Icon",
    nullable: true
  }
];
var SHARED_ENUM_SUBSET_THRESHOLD = 50;

// docs/schemas/generator/emit.ts
var path2 = __toESM(require("path"), 1);

// docs/schemas/generator/extract.ts
var fs = __toESM(require("fs"), 1);
var path = __toESM(require("path"), 1);
var import_ts_morph2 = require("ts-morph");

// docs/schemas/generator/type-to-schema.ts
var import_ts_morph = require("ts-morph");
function typeText(type, node) {
  return type.getText(node).replace(/import\("[^"]*"\)\./g, "");
}
function isElementRef(type) {
  const queue = [type];
  const seen = /* @__PURE__ */ new Set();
  while (queue.length > 0) {
    const t = queue.shift();
    if (seen.has(t)) continue;
    seen.add(t);
    const names = [t.getAliasSymbol()?.getName(), t.getSymbol()?.getName()];
    if (names.some((n) => n && ELEMENT_REF_TYPES.includes(n))) return true;
    queue.push(...t.getBaseTypes());
    if (t.isIntersection()) queue.push(...t.getIntersectionTypes());
  }
  return false;
}
function jsDocDescription(symbol) {
  for (const decl of symbol.getDeclarations()) {
    if (import_ts_morph.Node.isJSDocable(decl)) {
      const text = decl.getJsDocs().map((d) => d.getDescription().trim()).filter(Boolean).join("\n");
      if (text) return text;
    }
  }
  return void 0;
}
function unresolved(ctx, type, path6, code, why) {
  const text = typeText(type, ctx.printNode);
  ctx.diag.report(code, path6, `${why}: ${text}`);
  return { "x-ts-type": text };
}
function isNamedSourceType(type) {
  const sym = type.getAliasSymbol() ?? type.getSymbol();
  const decl = sym?.getDeclarations()[0];
  if (!sym || !decl) return null;
  const sf = decl.getSourceFile();
  if (sf.isDeclarationFile() || sf.getFilePath().includes("/typescript/lib/")) return null;
  const name = sym.getName();
  if (name.startsWith("__")) return null;
  return { name, file: sf.getFilePath() };
}
function isRuntimeObjectType(type) {
  for (const prop of type.getProperties()) {
    for (const decl of prop.getDeclarations()) {
      const parent = decl.getParent();
      if (decl.isKind(import_ts_morph.SyntaxKind.MethodDeclaration) && parent?.isKind(import_ts_morph.SyntaxKind.ClassDeclaration))
        return true;
      if (decl.isKind(import_ts_morph.SyntaxKind.MethodSignature) && parent?.isKind(import_ts_morph.SyntaxKind.InterfaceDeclaration))
        return true;
    }
  }
  return false;
}
function isElementTypeRef(type) {
  const parts = type.isUnion() ? type.getUnionTypes().filter((p) => !p.isUndefined() && !p.isNull()) : [type];
  return parts.length > 0 && parts.every((p) => {
    const decl = p.getSymbol()?.getDeclarations()[0];
    const enumDecl = decl?.isKind(import_ts_morph.SyntaxKind.EnumMember) ? decl.getParent() : decl;
    return enumDecl?.isKind(import_ts_morph.SyntaxKind.EnumDeclaration) === true && ELEMENT_TYPE_ENUMS.includes(enumDecl.getName());
  });
}
function literalValue(t) {
  const v = t.getLiteralValue();
  if (typeof v === "string" || typeof v === "number") return v;
  return null;
}
function withNull(schema, nullableRef = false) {
  if (schema.$ref) return nullableRef ? schema : { anyOf: [schema, { type: "null" }] };
  if (typeof schema.type === "string" && !schema.anyOf) {
    const out = { ...schema, type: [schema.type, "null"] };
    if (out.enum) out.enum = [...out.enum, null];
    if ("const" in out) {
      out.enum = [out.const, null];
      delete out.const;
    }
    return out;
  }
  if (schema.anyOf) return { ...schema, anyOf: [...schema.anyOf, { type: "null" }] };
  return { anyOf: [schema, { type: "null" }] };
}
function dedupe(schemas) {
  const seen = /* @__PURE__ */ new Set();
  return schemas.filter((s) => {
    const key = JSON.stringify(s);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function typeToSchema(type, ctx, path6, seen = /* @__PURE__ */ new Set()) {
  const sharedRef = ctx.shared.matchType(type);
  if (sharedRef) return { $ref: sharedRef.$ref };
  if (type.isAny() || type.isUnknown()) return unresolved(ctx, type, path6, "any-type", "any/unknown");
  if (type.getCallSignatures().length > 0) return { "x-kind": "handler" };
  if (type.isUnion()) return unionToSchema(type, ctx, path6, seen);
  if ((type.isObject() || type.isIntersection()) && isElementRef(type)) return { "x-kind": "element" };
  if (type.isEnumLiteral() || type.isStringLiteral()) {
    return { type: "string", const: String(type.getLiteralValue() ?? type.getText()) };
  }
  if (type.isNumberLiteral()) return { type: "number", const: Number(type.getLiteralValue()) };
  if (type.isBooleanLiteral()) return { type: "boolean", const: type.getText() === "true" };
  if (type.isEnum()) {
    const decl = type.getSymbol()?.getDeclarations().find((d) => d.isKind(import_ts_morph.SyntaxKind.EnumDeclaration));
    if (decl?.isKind(import_ts_morph.SyntaxKind.EnumDeclaration)) {
      const values = decl.getMembers().map((m) => String(m.getValue() ?? m.getName()));
      return { type: "string", enum: values };
    }
    return unresolved(ctx, type, path6, "unresolved-type", "enum \u0431\u0435\u0437 \u043E\u0431\u044A\u044F\u0432\u043B\u0435\u043D\u0438\u044F");
  }
  if (type.isArray()) {
    const el = type.getArrayElementType();
    if (!el) return unresolved(ctx, type, path6, "unresolved-type", "\u0442\u0438\u043F \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u0430 \u043C\u0430\u0441\u0441\u0438\u0432\u0430");
    return { type: "array", items: typeToSchema(el, ctx, `${path6}[]`, seen) };
  }
  if (type.isTuple()) {
    const items = dedupe(type.getTupleElements().map((t, i) => typeToSchema(t, ctx, `${path6}[${i}]`, seen)));
    return { type: "array", items: items.length === 1 ? items[0] : { anyOf: items } };
  }
  if (type.isString() || type.isTemplateLiteral()) return { type: "string" };
  if (type.isNumber()) return { type: "number" };
  if (type.isBoolean()) return { type: "boolean" };
  if (type.isNull()) return { type: "null" };
  if (type.getFlags() & import_ts_morph.TypeFlags.NonPrimitive) {
    ctx.diag.report("loose-object", path6, "object \u0431\u0435\u0437 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u044F \u043F\u043E\u043B\u0435\u0439");
    return { type: "object" };
  }
  if (type.isObject()) return objectToSchema(type, ctx, path6, seen);
  if (type.isIntersection() && type.getIntersectionTypes().every((t) => t.isObject())) {
    return objectToSchema(type, ctx, path6, seen);
  }
  if (type.isIntersection()) {
    const prim = type.getIntersectionTypes().find((t) => t.isString() || t.isNumber() || t.isBoolean());
    if (prim) return typeToSchema(prim, ctx, path6, seen);
  }
  return unresolved(ctx, type, path6, "unresolved-type", "\u043D\u0435 \u0440\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u043D");
}
function unionToSchema(type, ctx, path6, seen) {
  const parts = type.getUnionTypes();
  const hasNull = parts.some((p) => p.isNull());
  const rest = parts.filter((p) => !p.isNull() && !p.isUndefined());
  const bools = rest.filter((p) => p.isBooleanLiteral());
  const hasBoolean = bools.length === 2;
  const nonBool = hasBoolean ? rest.filter((p) => !p.isBooleanLiteral()) : rest;
  const strLits = nonBool.filter(
    (p) => p.isStringLiteral() || p.isEnumLiteral() && typeof literalValue(p) === "string"
  );
  const numLits = nonBool.filter(
    (p) => p.isNumberLiteral() || p.isEnumLiteral() && typeof literalValue(p) === "number"
  );
  const others = nonBool.filter((p) => !strLits.includes(p) && !numLits.includes(p));
  const branches = [];
  let nullableRef = false;
  if (strLits.length > 0) {
    const values = [...new Set(strLits.map((p) => String(literalValue(p) ?? p.getText())))];
    const ref = ctx.shared.matchLiterals(values);
    if (ref) {
      branches.push({ $ref: ref.$ref });
      nullableRef = ref.nullable;
    } else {
      branches.push(
        values.length === 1 ? { type: "string", const: values[0] } : { type: "string", enum: values }
      );
    }
  }
  if (numLits.length > 0) {
    const values = [...new Set(numLits.map((p) => Number(literalValue(p))))];
    branches.push(
      values.length === 1 ? { type: "number", const: values[0] } : { type: "number", enum: values }
    );
  }
  if (hasBoolean) branches.push({ type: "boolean" });
  const first = branches.length;
  const single = first === 0 && others.length === 1;
  others.forEach(
    (p, i) => branches.push(typeToSchema(p, ctx, single ? path6 : `${path6}.anyOf[${first + i}]`, seen))
  );
  const unique = dedupe(branches);
  if (unique.length === 0)
    return hasNull ? { type: "null" } : unresolved(ctx, type, path6, "unresolved-type", "\u043F\u0443\u0441\u0442\u043E\u0439 union");
  if (unique.length === 1) return hasNull ? withNull(unique[0], nullableRef) : unique[0];
  const simple = unique.every((s) => Object.keys(s).length === 1 && typeof s.type === "string");
  if (simple) {
    const types = unique.map((s) => s.type);
    if (hasNull) types.push("null");
    return { type: types };
  }
  return { anyOf: hasNull && !nullableRef ? [...unique, { type: "null" }] : unique };
}
function objectToSchema(type, ctx, path6, seen) {
  const sym = type.getAliasSymbol() ?? type.getSymbol();
  const decl = sym?.getDeclarations()[0];
  const sf = decl?.getSourceFile();
  const isRecord = type.getAliasSymbol()?.getName() === "Record" && !!type.getStringIndexType();
  if (!isRecord && sf && (sf.isDeclarationFile() || sf.getFilePath().includes("/typescript/lib/"))) {
    const known = sym ? KNOWN_EXTERNAL_TYPES[sym.getName()] : void 0;
    if (known) return { ...known };
    return unresolved(ctx, type, path6, "external-type", "\u0432\u043D\u0435\u0448\u043D\u0438\u0439 \u0442\u0438\u043F \u043D\u0435 \u0440\u0430\u0441\u043A\u0440\u044B\u0432\u0430\u0435\u0442\u0441\u044F");
  }
  if (isRuntimeObjectType(type)) return unresolved(ctx, type, path6, "runtime-type", "\u0440\u0430\u043D\u0442\u0430\u0439\u043C-\u043E\u0431\u044A\u0435\u043A\u0442 \u0434\u0432\u0438\u0436\u043A\u0430");
  const named = isNamedSourceType(type);
  if (named) ctx.shared.trackUsage(named.name, named.file, ctx.elementType);
  const key = `${sf?.getFilePath() ?? ""}#${type.getText()}`;
  if (seen.has(key)) return unresolved(ctx, type, path6, "cycle-type", "\u0446\u0438\u043A\u043B\u0438\u0447\u0435\u0441\u043A\u0430\u044F \u0441\u0441\u044B\u043B\u043A\u0430");
  const nextSeen = new Set(seen).add(key);
  const properties = {};
  const required = [];
  for (const prop of type.getProperties()) {
    const name = prop.getName();
    if (name.startsWith("_")) continue;
    const at = decl ?? prop.getValueDeclaration() ?? prop.getDeclarations()[0];
    const propType = at ? prop.getTypeAtLocation(at) : prop.getDeclaredType();
    if (name === "type" && isElementTypeRef(propType)) continue;
    const schema = typeToSchema(propType, ctx, `${path6}.${name}`, nextSeen);
    const description = jsDocDescription(prop);
    properties[name] = description ? { description, ...schema } : schema;
    if (!prop.isOptional()) required.push(name);
  }
  if (Object.keys(properties).length > 0) {
    const out = { type: "object", properties };
    if (required.length > 0) out.required = required;
    return out;
  }
  const index = type.getStringIndexType();
  if (index) {
    if (index.isAny() || index.isUnknown()) {
      ctx.diag.report("loose-object", path6, `\u043F\u0440\u043E\u0438\u0437\u0432\u043E\u043B\u044C\u043D\u044B\u0435 \u043A\u043B\u044E\u0447\u0438: ${typeText(type, ctx.printNode)}`);
      return { type: "object" };
    }
    return { type: "object", additionalProperties: typeToSchema(index, ctx, `${path6}{}`, nextSeen) };
  }
  return { type: "object" };
}

// docs/schemas/generator/extract.ts
function findFileRecursively(dirPath, fileName) {
  const exact = path.join(dirPath, fileName);
  if (fs.existsSync(exact)) return exact;
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const found = findFileRecursively(path.join(dirPath, entry.name), fileName);
    if (found) return found;
  }
  return null;
}
function findMapObject(sf) {
  const decl = sf.getVariableDeclaration(PATHS.elementsMapVariable);
  const init = decl?.getInitializer();
  if (init?.isKind(import_ts_morph2.SyntaxKind.ObjectLiteralExpression)) return init;
  for (const ea of sf.getExportAssignments()) {
    const expr = ea.getExpression();
    if (expr.isKind(import_ts_morph2.SyntaxKind.ObjectLiteralExpression)) return expr;
  }
  return null;
}
function memberNameOfKey(text) {
  return (text.startsWith("[") && text.endsWith("]") ? text.slice(1, -1) : text).split(".").pop() ?? text;
}
function readCatalog(rootDir, warn) {
  const mapPath = path.resolve(rootDir, PATHS.elementsMap);
  const constantsPath = path.resolve(rootDir, PATHS.constants);
  for (const p of [mapPath, constantsPath]) {
    if (!fs.existsSync(p)) throw new Error(`\u041D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D \u0444\u0430\u0439\u043B: ${p}`);
  }
  const project = new import_ts_morph2.Project({ compilerOptions: { strict: true, skipLibCheck: true } });
  const enumDecl = project.addSourceFileAtPath(constantsPath).getEnum(PATHS.elementsTypesEnum);
  if (!enumDecl) throw new Error(`enum ${PATHS.elementsTypesEnum} \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D \u0432 ${constantsPath}`);
  const enumValues = {};
  for (const m of enumDecl.getMembers()) {
    const v = m.getValue();
    if (typeof v === "string") enumValues[m.getName()] = v;
  }
  const mapObject = findMapObject(project.addSourceFileAtPath(mapPath));
  if (!mapObject?.isKind(import_ts_morph2.SyntaxKind.ObjectLiteralExpression)) throw new Error("\u041E\u0431\u044A\u0435\u043A\u0442 ElementsMap \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D");
  const elementsDir = path.resolve(rootDir, PATHS.elementsDir);
  const elements = {};
  const aliases = [];
  for (const prop of mapObject.getProperties()) {
    if (!prop.isKind(import_ts_morph2.SyntaxKind.PropertyAssignment)) continue;
    const member2 = memberNameOfKey(prop.getNameNode().getText());
    const elementType = enumValues[member2];
    if (!elementType) {
      warn(`[WARN] \u043D\u0435\u0442 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F ${PATHS.elementsTypesEnum}.${member2}`);
      continue;
    }
    const init = prop.getInitializer();
    if (init?.isKind(import_ts_morph2.SyntaxKind.PropertyAccessExpression)) {
      const target = enumValues[init.getName()];
      if (target) aliases.push({ alias: elementType, target });
      continue;
    }
    if (!init?.isKind(import_ts_morph2.SyntaxKind.Identifier)) continue;
    const className = init.getText();
    const file = findFileRecursively(elementsDir, `${className}.ts`);
    if (!file) {
      warn(`[WARN] \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D \u0444\u0430\u0439\u043B \u043A\u043B\u0430\u0441\u0441\u0430 ${className}`);
      continue;
    }
    elements[elementType] = { elementType, className, dirPath: path.dirname(file), deprecatedAliases: [] };
  }
  const constants = project.getSourceFileOrThrow(constantsPath);
  const replacedBy = {};
  const legacyInit = constants.getVariableDeclaration(PATHS.legacyTypesMap)?.getInitializer();
  if (legacyInit?.isKind(import_ts_morph2.SyntaxKind.ObjectLiteralExpression)) {
    for (const prop of legacyInit.getProperties()) {
      if (!prop.isKind(import_ts_morph2.SyntaxKind.PropertyAssignment)) continue;
      const from = enumValues[memberNameOfKey(prop.getNameNode().getText())];
      const init = prop.getInitializer();
      const to = init?.isKind(import_ts_morph2.SyntaxKind.PropertyAccessExpression) ? enumValues[init.getName()] : void 0;
      if (from && to) {
        replacedBy[from] = to;
        aliases.push({ alias: from, target: to });
      }
    }
  } else {
    warn(`[WARN] ${PATHS.legacyTypesMap} \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D \u0432 ${constantsPath}`);
  }
  const deprecated = new Set(Object.keys(replacedBy));
  const listInit = constants.getVariableDeclaration(PATHS.deprecatedTypesList)?.getInitializer();
  if (listInit?.isKind(import_ts_morph2.SyntaxKind.ArrayLiteralExpression)) {
    for (const el of listInit.getElements()) {
      const value = el.isKind(import_ts_morph2.SyntaxKind.PropertyAccessExpression) ? enumValues[el.getName()] : void 0;
      if (value) deprecated.add(value);
    }
  } else {
    warn(`[WARN] ${PATHS.deprecatedTypesList} \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D \u0432 ${constantsPath}`);
  }
  for (const { alias, target } of aliases) {
    const list = elements[target]?.deprecatedAliases;
    if (list && !list.includes(alias)) list.push(alias);
  }
  for (const e of Object.values(elements)) e.deprecatedAliases.sort();
  return { elements, enumValues, replacedBy, deprecated };
}
function createProgram(rootDir) {
  const libPath = path.resolve(rootDir, PATHS.libPackage);
  const project = new import_ts_morph2.Project({
    tsConfigFilePath: path.join(libPath, "tsconfig.json"),
    compilerOptions: {
      strict: true,
      skipLibCheck: true,
      experimentalDecorators: true,
      emitDecoratorMetadata: true
    }
  });
  project.addSourceFilesAtPaths([path.join(libPath, "src/**/*.ts")]);
  return project;
}
function findClass(project, entry) {
  const own = project.getSourceFile(path.join(entry.dirPath, `${entry.className}.ts`))?.getClass(entry.className);
  if (own) return own;
  for (const sf of project.getSourceFiles()) {
    const cls = sf.getClass(entry.className);
    if (cls) return cls;
  }
  return null;
}
var UNRESOLVED = /* @__PURE__ */ Symbol("unresolved");
function valueOf(node, depth = 0) {
  if (depth > 10) return UNRESOLVED;
  if (import_ts_morph2.Node.isNullLiteral(node)) return null;
  if (import_ts_morph2.Node.isTrueLiteral(node)) return true;
  if (import_ts_morph2.Node.isFalseLiteral(node)) return false;
  if (import_ts_morph2.Node.isNumericLiteral(node)) return node.getLiteralValue();
  if (import_ts_morph2.Node.isStringLiteral(node) || import_ts_morph2.Node.isNoSubstitutionTemplateLiteral(node)) return node.getLiteralValue();
  if (import_ts_morph2.Node.isPrefixUnaryExpression(node) && node.getOperatorToken() === import_ts_morph2.SyntaxKind.MinusToken) {
    const v = valueOf(node.getOperand(), depth + 1);
    return typeof v === "number" ? -v : UNRESOLVED;
  }
  if (import_ts_morph2.Node.isParenthesizedExpression(node) || import_ts_morph2.Node.isAsExpression(node) || import_ts_morph2.Node.isSatisfiesExpression(node)) {
    return valueOf(node.getExpression(), depth + 1);
  }
  if (import_ts_morph2.Node.isIdentifier(node) || import_ts_morph2.Node.isPropertyAccessExpression(node)) {
    if (node.getText() === "undefined") return void 0;
    const known = KNOWN_CONSTANTS[node.getText()];
    if (known !== void 0) return known;
    const sym = node.getSymbol();
    for (const decl of (sym?.getAliasedSymbol() ?? sym)?.getDeclarations() ?? []) {
      if (import_ts_morph2.Node.isEnumMember(decl)) {
        const v = decl.getValue();
        return v === void 0 ? decl.getName() : v;
      }
      if (import_ts_morph2.Node.isVariableDeclaration(decl) || import_ts_morph2.Node.isPropertyAssignment(decl)) {
        const init = decl.getInitializer();
        if (init) return valueOf(init, depth + 1);
      }
    }
    const t = node.getType();
    if (t.isStringLiteral() || t.isNumberLiteral()) return t.getLiteralValue();
    if (t.isBooleanLiteral()) return t.getText() === "true";
    return UNRESOLVED;
  }
  if (import_ts_morph2.Node.isElementAccessExpression(node)) {
    const arg = node.getArgumentExpression();
    const sym = node.getExpression().getSymbol();
    const enumDecl = (sym?.getAliasedSymbol() ?? sym)?.getDeclarations().find(import_ts_morph2.Node.isEnumDeclaration);
    if (enumDecl && arg && import_ts_morph2.Node.isStringLiteral(arg)) {
      const key = arg.getLiteralValue();
      const member2 = enumDecl.getMembers().find((m) => m.getName().replace(/^['"]|['"]$/g, "") === key);
      if (member2) return member2.getValue() ?? member2.getName();
    }
    return UNRESOLVED;
  }
  if (import_ts_morph2.Node.isArrayLiteralExpression(node)) {
    const items = [];
    for (const el of node.getElements()) {
      const v = valueOf(el, depth + 1);
      if (v === UNRESOLVED || v === void 0) return UNRESOLVED;
      items.push(v);
    }
    return items;
  }
  if (import_ts_morph2.Node.isObjectLiteralExpression(node)) {
    const obj = {};
    for (const p of node.getProperties()) {
      if (!import_ts_morph2.Node.isPropertyAssignment(p)) return UNRESOLVED;
      const init = p.getInitializer();
      const v = init ? valueOf(init, depth + 1) : UNRESOLVED;
      if (v === UNRESOLVED) return UNRESOLVED;
      if (v !== void 0) obj[p.getName().replace(/^['"]|['"]$/g, "")] = v;
    }
    return obj;
  }
  return UNRESOLVED;
}
function readDefaults(cls, diag) {
  const out = {};
  const member2 = cls.getStaticProperty("defaultProps");
  if (!member2 || !import_ts_morph2.Node.isPropertyDeclaration(member2)) return out;
  const init = member2.getInitializer();
  if (!init || !import_ts_morph2.Node.isObjectLiteralExpression(init)) return out;
  for (const p of init.getProperties()) {
    if (!import_ts_morph2.Node.isPropertyAssignment(p)) continue;
    const name = p.getName().replace(/^['"_]+|['"]+$/g, "");
    const valueNode = p.getInitializer();
    if (!valueNode) continue;
    if (import_ts_morph2.Node.isArrowFunction(valueNode) || import_ts_morph2.Node.isFunctionExpression(valueNode)) continue;
    const v = valueOf(valueNode);
    if (v === UNRESOLVED) {
      diag.report("default-unresolved", `props.${name}.default`, valueNode.getText());
      continue;
    }
    if (v !== void 0) out[name] = v;
  }
  return out;
}
function readMethods(cls) {
  const methods = [];
  for (const m of cls.getInstanceMethods()) {
    if (!m.getDecorators().some((d) => PUBLIC_METHOD_DECORATORS.includes(d.getName()))) continue;
    methods.push({
      name: m.getName(),
      returnType: m.getReturnTypeNode()?.getText() ?? typeText(m.getReturnType(), m),
      parameters: m.getParameters().map((p) => ({
        name: p.getName(),
        type: p.getTypeNode()?.getText() ?? typeText(p.getType(), p),
        optional: p.isOptional()
      }))
    });
  }
  return methods;
}
function isContainer(cls) {
  let current = cls;
  for (let i = 0; current && i < 20; i++) {
    const ext = current.getExtends()?.getExpression().getText();
    if (ext && CONTAINER_BASE_CLASSES.includes(ext)) return true;
    current = current.getBaseClass();
  }
  const text = cls.getExtends()?.getText() ?? "";
  return CONTAINER_BASE_CLASSES.some((n) => text.includes(n));
}
function readAllowedChildren(cls, enumValues, diag) {
  const chain = [];
  for (let c = cls; c && chain.length < 20; c = c.getBaseClass()) chain.push(c);
  const getters = CHILDREN_GETTERS.flatMap((name) => chain.map((c) => c.getGetAccessor(name)));
  for (const getter of getters) {
    if (!getter) continue;
    const name = `${getter.getParentOrThrow().getSymbol()?.getName()}.${getter.getName()}`;
    const literal = getter.getDescendantsOfKind(import_ts_morph2.SyntaxKind.ReturnStatement).map((r) => r.getExpression()).find((e) => e && import_ts_morph2.Node.isArrayLiteralExpression(e));
    if (literal && import_ts_morph2.Node.isArrayLiteralExpression(literal)) {
      const values2 = literal.getElements().map((e) => valueOf(e));
      if (values2.length > 0 && values2.every((v) => typeof v === "string"))
        return [...new Set(values2)];
    }
    const ret = getter.getReturnType();
    const el = ret.getArrayElementType();
    const parts = el ? el.isUnion() ? el.getUnionTypes() : [el] : ret.isTuple() ? ret.getTupleElements() : [];
    const values = parts.map((p) => p.getLiteralValue()).filter((v) => typeof v === "string");
    const narrowed = values.length < Object.keys(enumValues).length;
    if (values.length > 0 && values.length === parts.length && narrowed) return [...new Set(values)];
    const body = getter.getBody()?.getText() ?? "";
    const members = [...body.matchAll(/ElementsTypes\.(\w+)/g)].map((m) => m[1]);
    const byText = [...new Set(members.map((m) => enumValues[m]).filter((v) => !!v))];
    if (byText.length > 0) {
      diag.report("children-by-text", "x-container", `${name}: \u0442\u0438\u043F \u0432\u043E\u0437\u0432\u0440\u0430\u0442\u0430 ${typeText(ret, getter)}`);
      return byText;
    }
  }
  if (getters.some(Boolean)) {
    diag.report("children-unresolved", "x-container", "\u0433\u0435\u0442\u0442\u0435\u0440 \u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u044B\u0445 \u0442\u0438\u043F\u043E\u0432 \u043D\u0435 \u0440\u0430\u0437\u043E\u0431\u0440\u0430\u043D");
  }
  return null;
}
function findTypeDecl(project, filePath, name) {
  const hinted = project.getSourceFile(filePath);
  const own = hinted?.getInterface(name) ?? hinted?.getTypeAlias(name);
  if (own) return own;
  for (const sf of project.getSourceFiles()) {
    const decl = sf.getInterface(name) ?? sf.getTypeAlias(name);
    if (decl) return decl;
  }
  return null;
}
function propsDeclIn(sf, name) {
  return sf.getInterface(name) ?? sf.getTypeAlias(name);
}
function findPropsDecl(project, cls, entry) {
  for (const name2 of ["_props", "props"]) {
    const typeNode = cls.getProperty(name2)?.getTypeNode();
    if (!typeNode) continue;
    const t = typeNode.getType();
    const decl = (t.getAliasSymbol() ?? t.getSymbol())?.getDeclarations().find((d) => import_ts_morph2.Node.isInterfaceDeclaration(d) || import_ts_morph2.Node.isTypeAliasDeclaration(d));
    if (decl) return decl;
  }
  const arg = cls.getExtends()?.getTypeArguments()[0];
  if (arg) {
    const t = arg.getType();
    const decl = (t.getAliasSymbol() ?? t.getSymbol())?.getDeclarations().find((d) => import_ts_morph2.Node.isInterfaceDeclaration(d) || import_ts_morph2.Node.isTypeAliasDeclaration(d));
    if (decl) return decl;
  }
  const propsSym = cls.getType().getProperty("props");
  if (propsSym) {
    const t = propsSym.getTypeAtLocation(cls);
    const decl = (t.getAliasSymbol() ?? t.getSymbol())?.getDeclarations().find((d) => import_ts_morph2.Node.isInterfaceDeclaration(d) || import_ts_morph2.Node.isTypeAliasDeclaration(d));
    if (decl && !ELEMENT_REF_TYPES.includes(decl.getName())) return decl;
  }
  const name = `${entry.className.replace(/Element$/, "")}Props`;
  const isPropsFile = (p) => /Props\.ts$/.test(path.basename(p)) && !/ModelProps/.test(path.basename(p));
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
function readProps(decl) {
  const ownName = decl.getName();
  return decl.getType().getProperties().map((symbol) => {
    const d = symbol.getDeclarations()[0];
    const owner = d?.getFirstAncestor(
      (a) => import_ts_morph2.Node.isInterfaceDeclaration(a) || import_ts_morph2.Node.isTypeAliasDeclaration(a)
    );
    const declaredIn2 = owner?.getName() ?? ownName;
    return {
      name: symbol.getName(),
      symbol,
      optional: symbol.isOptional(),
      declaredIn: declaredIn2,
      own: declaredIn2 === ownName
    };
  });
}

// docs/schemas/generator/format.ts
var FORMAT_VERSION = 2;
var JSON_SCHEMA_DRAFT = "http://json-schema.org/draft-07/schema#";
var ELEMENT_KEY_ORDER = [
  "$schema",
  "$id",
  "title",
  "description",
  "type",
  "x-format-version",
  "x-element-type",
  "x-entity",
  "x-category",
  "x-deprecated-aliases",
  "x-deprecated",
  "x-replaced-by",
  "x-container",
  "allOf",
  "properties",
  "required",
  "x-base-defaults",
  "x-events",
  "x-methods",
  "x-composition",
  "x-slots"
];
var PROP_KEY_ORDER = [
  "$schema",
  "$id",
  "title",
  "description",
  "x-declared-in",
  "x-kind",
  "$ref",
  "type",
  "const",
  "format",
  "enum",
  "items",
  "properties",
  "required",
  "additionalProperties",
  "anyOf",
  "oneOf",
  "x-ts-type",
  "default"
];
function orderKeys(obj, order) {
  const rank = (k) => {
    const i = order.indexOf(k);
    return i === -1 ? order.length : i;
  };
  const keys = Object.keys(obj).sort(
    (a, b) => rank(a) - rank(b) || (rank(a) === order.length ? a.localeCompare(b) : 0)
  );
  const out = {};
  for (const k of keys) out[k] = obj[k];
  return out;
}
function canonicalProp(schema) {
  const s = { ...schema };
  if (s.items) s.items = canonicalProp(s.items);
  if (s.properties) {
    const props = {};
    for (const [k, v] of Object.entries(s.properties)) props[k] = canonicalProp(v);
    s.properties = props;
  }
  if (s.additionalProperties && typeof s.additionalProperties === "object") {
    s.additionalProperties = canonicalProp(s.additionalProperties);
  }
  if (s.anyOf) s.anyOf = s.anyOf.map(canonicalProp);
  if (s.oneOf) s.oneOf = s.oneOf.map(canonicalProp);
  return orderKeys(s, PROP_KEY_ORDER);
}
function canonicalProps(props) {
  const out = {};
  for (const [k, v] of Object.entries(props)) out[k] = canonicalProp(v);
  return out;
}
function canonicalEvents(events) {
  const out = {};
  for (const [k, v] of Object.entries(events)) {
    out[k] = orderKeys({ ...v, parameters: canonicalProps(v.parameters) }, ["description", "parameters"]);
  }
  return out;
}
function canonicalElement(schema) {
  return orderKeys(
    {
      ...schema,
      properties: canonicalProps(schema.properties),
      required: [...schema.required].sort(),
      "x-events": canonicalEvents(schema["x-events"])
    },
    ELEMENT_KEY_ORDER
  );
}
function canonicalComponent(schema) {
  return orderKeys(
    {
      ...schema,
      properties: canonicalProps(schema.properties),
      required: [...schema.required].sort(),
      "x-events": canonicalEvents(schema["x-events"]),
      "x-composition": [...new Set(schema["x-composition"])].sort(),
      "x-slots": [...new Set(schema["x-slots"])].sort()
    },
    ELEMENT_KEY_ORDER
  );
}
function canonicalBase(schema) {
  return orderKeys(
    {
      ...schema,
      properties: canonicalProps(schema.properties),
      required: [...schema.required].sort(),
      "x-events": canonicalEvents(schema["x-events"])
    },
    ELEMENT_KEY_ORDER
  );
}
function serialize(value) {
  return JSON.stringify(value, null, 2) + "\n";
}

// docs/schemas/generator/emit.ts
function title(className) {
  return className.replace(/Element$/, "").replace(/([A-Z])/g, " $1").trim();
}
function allowsNull(schema, shared) {
  if (schema.type === "null" || Array.isArray(schema.type) && schema.type.includes("null")) return true;
  if (schema.$ref) return shared.refAllowsNull(schema.$ref);
  return (schema.anyOf ?? schema.oneOf ?? []).some((s) => allowsNull(s, shared));
}
function nullable(schema) {
  const { description, "x-declared-in": declaredIn2, ...rest } = schema;
  const head = {};
  if (description) head.description = description;
  if (declaredIn2) head["x-declared-in"] = declaredIn2;
  if (typeof rest.type === "string" && !rest.anyOf && !rest.oneOf) {
    const out = { ...head, ...rest, type: [rest.type, "null"] };
    if (out.enum) out.enum = [...out.enum, null];
    return out;
  }
  if (rest.anyOf) return { ...head, ...rest, anyOf: [...rest.anyOf, { type: "null" }] };
  return { ...head, anyOf: [rest, { type: "null" }] };
}
function withDefault(schema, value, name, shared, diag) {
  let out = schema;
  if (value === null && !allowsNull(out, shared)) {
    diag.report("default-null-widened", `properties.${name}`, "default: null, \u0430 \u0442\u0438\u043F \u0431\u0435\u0437 null \u2014 \u0442\u0438\u043F \u0440\u0430\u0441\u0448\u0438\u0440\u0435\u043D");
    out = nullable(out);
  }
  return { ...out, default: value };
}
function propsToSchemas(decl, ctx, skip) {
  const out = [];
  for (const prop of readProps(decl)) {
    const name = prop.name;
    if (name.startsWith("_") || EXCLUDED_PROPS.includes(name)) continue;
    if (skip(name, prop.symbol.getDeclarations()[0])) continue;
    const schema = typeToSchema(
      prop.symbol.getTypeAtLocation(decl),
      { ...ctx, printNode: decl },
      `properties.${name}`
    );
    const description = jsDocDescription(prop.symbol);
    out.push({
      name,
      schema: { ...description ? { description } : {}, "x-declared-in": prop.declaredIn, ...schema },
      optional: prop.optional
    });
  }
  return out;
}
function buildBase(project, rootDir, shared, diag) {
  const propsDecl = findTypeDecl(project, path2.resolve(rootDir, BASE.propsFile), BASE.propsType);
  if (!propsDecl) {
    diag.report("base-missing", "properties", `\u0442\u0438\u043F ${BASE.propsType} \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D`);
    return null;
  }
  const ctx = { elementType: "$base", diag, shared };
  const properties = {};
  const required = [];
  const declNodes = /* @__PURE__ */ new Map();
  for (const p of propsToSchemas(propsDecl, ctx, () => false)) {
    properties[p.name] = p.schema;
    if (!p.optional) required.push(p.name);
  }
  for (const prop of readProps(propsDecl)) declNodes.set(prop.name, prop.symbol.getDeclarations()[0]);
  const events = {};
  const elementDecl = findTypeDecl(project, path2.resolve(rootDir, BASE.elementFile), BASE.elementInterface);
  if (!elementDecl) {
    diag.report("base-missing", "x-events", `\u0438\u043D\u0442\u0435\u0440\u0444\u0435\u0439\u0441 ${BASE.elementInterface} \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D`);
  } else {
    for (const prop of elementDecl.getType().getProperties()) {
      const name = prop.getName();
      if (!BASE.eventNamePattern.test(name)) continue;
      const signature = prop.getTypeAtLocation(elementDecl).getCallSignatures()[0];
      if (!signature) continue;
      const parameters = {};
      for (const param of signature.getParameters()) {
        parameters[param.getName()] = typeToSchema(
          param.getTypeAtLocation(elementDecl),
          { ...ctx, printNode: elementDecl },
          `x-events.${name}.${param.getName()}`
        );
      }
      const description = jsDocDescription(prop);
      events[name] = { ...description ? { description } : {}, parameters };
    }
  }
  const schema = canonicalBase({
    $schema: JSON_SCHEMA_DRAFT,
    $id: `${SCHEMA_ID_BASE}/shared/${BASE.fileName}`,
    title: BASE.title,
    description: `\u041E\u0431\u0449\u0438\u0435 \u0441\u0432\u043E\u0439\u0441\u0442\u0432\u0430 \u0438 \u0441\u043E\u0431\u044B\u0442\u0438\u044F \u0432\u0441\u0435\u0445 UI-\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u043E\u0432 (\u0438\u0437 ${BASE.propsType} \u0438 ${BASE.elementInterface})`,
    type: "object",
    "x-format-version": FORMAT_VERSION,
    properties,
    required,
    "x-events": events
  });
  return { schema, ref: `../shared/${BASE.fileName}#`, declNodes };
}
function buildElementSchema(input, diag) {
  const { project, cls, entry, catalog, base, shared } = input;
  const elementType = entry.elementType;
  const defaults = readDefaults(cls, diag);
  const isBaseProp = (name, declNode) => !!base && base.declNodes.has(name) && base.declNodes.get(name) === declNode;
  const properties = {};
  const required = [];
  const baseDefaults = {};
  const decl = findPropsDecl(project, cls, entry);
  if (!decl) {
    diag.report(
      "props-missing",
      "properties",
      `\u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D ${entry.className.replace(/Element$/, "")}Props (extends ${cls.getExtends()?.getText() ?? "\u2014"})`
    );
  } else {
    for (const prop of readProps(decl)) {
      if (prop.name.startsWith("_") || EXCLUDED_PROPS.includes(prop.name)) continue;
      if (prop.name in defaults && isBaseProp(prop.name, prop.symbol.getDeclarations()[0])) {
        baseDefaults[prop.name] = defaults[prop.name];
      }
    }
    for (const p of propsToSchemas(decl, { elementType, diag, shared }, isBaseProp)) {
      properties[p.name] = p.name in defaults ? withDefault(p.schema, defaults[p.name], p.name, shared, diag) : p.schema;
      if (!p.optional) required.push(p.name);
    }
  }
  for (const name of Object.keys(defaults)) {
    if (!(name in properties) && !(name in baseDefaults) && !EXCLUDED_PROPS.includes(name)) {
      diag.report("default-without-prop", `defaults.${name}`, "\u043A\u043B\u044E\u0447 defaultProps \u0431\u0435\u0437 \u0441\u0432\u043E\u0439\u0441\u0442\u0432\u0430 \u0432 props");
    }
  }
  const schema = {
    $schema: JSON_SCHEMA_DRAFT,
    $id: `${SCHEMA_ID_BASE}/schemas/${elementType}.schema.json`,
    title: title(entry.className),
    description: `JSON-\u0441\u0445\u0435\u043C\u0430 \u0434\u043B\u044F UI-\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u0430 "${elementType}"`,
    type: "object",
    "x-format-version": FORMAT_VERSION,
    "x-element-type": elementType,
    "x-category": CATEGORY_BY_ELEMENT[elementType] ?? "basic",
    "x-deprecated-aliases": entry.deprecatedAliases,
    allOf: base ? [{ $ref: base.ref }] : [],
    properties,
    required,
    "x-base-defaults": baseDefaults,
    "x-events": {},
    "x-methods": readMethods(cls)
  };
  if (catalog.deprecated.has(elementType)) schema["x-deprecated"] = true;
  const replacement = catalog.replacedBy[elementType];
  if (replacement) schema["x-replaced-by"] = replacement;
  if (isContainer(cls)) {
    schema["x-container"] = { allowedChildren: readAllowedChildren(cls, catalog.enumValues, diag) };
  }
  return canonicalElement(schema);
}

// docs/schemas/generator/component.ts
function resolved(symbol) {
  return symbol?.isAlias() ? symbol.getAliasedSymbol() ?? symbol : symbol;
}
function isFactoryCall(call) {
  return resolved(call.getExpression().getSymbol())?.getName() === COMPONENT.factory;
}
function titleOf(call, fallback) {
  const owner = call.getFirstAncestor(
    (a) => import_ts_morph3.Node.isVariableDeclaration(a) || import_ts_morph3.Node.isFunctionDeclaration(a) || import_ts_morph3.Node.isClassDeclaration(a)
  );
  const name = owner && "getName" in owner ? owner.getName() : void 0;
  if (!name) return fallback;
  return name.replace(COMPONENT.titleSuffix, "").replace(/([A-Z])/g, " $1").trim();
}
function findComponents(project, rootDir, diag) {
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  for (const sf of project.getSourceFiles()) {
    if (!sf.getFullText().includes(COMPONENT.factory)) continue;
    for (const call of sf.getDescendantsOfKind(import_ts_morph3.SyntaxKind.CallExpression)) {
      if (!isFactoryCall(call)) continue;
      const nameArg = call.getArguments()[0];
      const file = path3.relative(rootDir, sf.getFilePath()).replace(/\\/g, "/");
      const where = `${file}:${call.getStartLineNumber()}`;
      const name = nameArg ? valueOf(nameArg) : UNRESOLVED;
      if (typeof name !== "string") {
        diag.report("component-name-unresolved", where, nameArg?.getText() ?? "\u043D\u0435\u0442 \u0430\u0440\u0433\u0443\u043C\u0435\u043D\u0442\u0430");
        continue;
      }
      if (seen.has(name)) {
        diag.report("component-duplicate", where, `\u043A\u043E\u043C\u043F\u043E\u043D\u0435\u043D\u0442 ${name} \u0443\u0436\u0435 \u043D\u0430\u0439\u0434\u0435\u043D`);
        continue;
      }
      seen.add(name);
      out.push({ elementType: name, call, title: titleOf(call, name) });
    }
  }
  return out.sort((a, b) => a.elementType.localeCompare(b.elementType));
}
function typeArguments(call) {
  const explicit = call.getTypeArguments();
  if (explicit.length > 0) return [explicit[0]?.getType(), explicit[1]?.getType()];
  const ret = call.getReturnType();
  const args = ret.getTypeArguments().length > 0 ? ret.getTypeArguments() : ret.getAliasTypeArguments();
  return [args[0], args[1]];
}
function unwrap(node) {
  let n = node;
  while (n && (import_ts_morph3.Node.isParenthesizedExpression(n) || import_ts_morph3.Node.isAsExpression(n) || import_ts_morph3.Node.isSatisfiesExpression(n))) {
    n = n.getExpression();
  }
  return n;
}
function optionsObject(call) {
  let node = unwrap(call.getArguments()[1]);
  if (node && import_ts_morph3.Node.isIdentifier(node)) {
    const decl = resolved(node.getSymbol())?.getDeclarations().find(import_ts_morph3.Node.isVariableDeclaration);
    node = unwrap(decl?.getInitializer());
  }
  return node && import_ts_morph3.Node.isObjectLiteralExpression(node) ? node : void 0;
}
function member(options, name) {
  const prop = options?.getProperty(name);
  if (!prop) return void 0;
  if (import_ts_morph3.Node.isMethodDeclaration(prop)) return prop;
  if (import_ts_morph3.Node.isPropertyAssignment(prop)) return unwrap(prop.getInitializer());
  return void 0;
}
function returnedObject(fn) {
  if (!fn) return void 0;
  if (import_ts_morph3.Node.isArrowFunction(fn)) {
    const body = unwrap(fn.getBody());
    if (body && import_ts_morph3.Node.isObjectLiteralExpression(body)) return body;
  }
  if (import_ts_morph3.Node.isArrowFunction(fn) || import_ts_morph3.Node.isFunctionExpression(fn) || import_ts_morph3.Node.isMethodDeclaration(fn)) {
    for (const ret of fn.getDescendantsOfKind(import_ts_morph3.SyntaxKind.ReturnStatement)) {
      const expr = unwrap(ret.getExpression());
      if (expr && import_ts_morph3.Node.isObjectLiteralExpression(expr)) return expr;
    }
  }
  return void 0;
}
function propertyName(p) {
  if (!import_ts_morph3.Node.isPropertyAssignment(p)) return null;
  const nameNode = p.getNameNode();
  if (import_ts_morph3.Node.isComputedPropertyName(nameNode)) {
    const v = valueOf(nameNode.getExpression());
    return typeof v === "string" ? v : null;
  }
  return p.getName().replace(/^['"]|['"]$/g, "");
}
function readComponentDefaults(fn, diag) {
  const out = {};
  const obj = returnedObject(fn);
  if (!obj) return out;
  for (const p of obj.getProperties()) {
    const name = propertyName(p);
    const valueNode = import_ts_morph3.Node.isPropertyAssignment(p) ? p.getInitializer() : void 0;
    if (name === null || !valueNode) {
      diag.report("default-unresolved", "defaults", p.getText());
      continue;
    }
    const v = valueOf(valueNode);
    if (v === UNRESOLVED) {
      diag.report("default-unresolved", `properties.${name}.default`, valueNode.getText());
      continue;
    }
    if (v !== void 0) out[name] = v;
  }
  return out;
}
function readControllerMethods(ctrl, at) {
  if (!ctrl || ctrl.isAny() || ctrl.isUnknown()) return [];
  const methods = [];
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
          optional: !!decl && import_ts_morph3.Node.isParameterDeclaration(decl) && decl.isOptional()
        };
      })
    });
  }
  return methods;
}
function readEvents(options, ctx) {
  const events = {};
  for (const call of options?.getDescendantsOfKind(import_ts_morph3.SyntaxKind.CallExpression) ?? []) {
    const callee = call.getExpression();
    if (!import_ts_morph3.Node.isPropertyAccessExpression(callee) || callee.getName() !== COMPONENT.emitMethod) continue;
    const [nameArg, valueArg] = call.getArguments();
    const name = nameArg ? valueOf(nameArg) : UNRESOLVED;
    if (typeof name !== "string") {
      ctx.diag.report("event-name-unresolved", "x-events", call.getText().slice(0, 120));
      continue;
    }
    if (events[name]) continue;
    const parameters = {};
    if (valueArg) {
      parameters.value = typeToSchema(
        valueArg.getType(),
        { ...ctx, printNode: call },
        `x-events.${name}.value`
      );
    }
    events[name] = { parameters };
  }
  return events;
}
function readComposition(view) {
  if (!view || !(import_ts_morph3.Node.isArrowFunction(view) || import_ts_morph3.Node.isFunctionExpression(view) || import_ts_morph3.Node.isMethodDeclaration(view))) {
    return [];
  }
  const createElement = view.getParameters()[0];
  if (!createElement) return [];
  const target = createElement.getSymbol();
  const out = [];
  for (const call of view.getDescendantsOfKind(import_ts_morph3.SyntaxKind.CallExpression)) {
    const callee = call.getExpression();
    if (!import_ts_morph3.Node.isIdentifier(callee)) continue;
    const sym = callee.getSymbol();
    if (sym !== target && callee.getText() !== createElement.getName()) continue;
    const typeArg = call.getArguments()[0];
    const v = typeArg ? valueOf(typeArg) : UNRESOLVED;
    if (typeof v === "string") out.push(v);
  }
  return out;
}
function readSlots(node) {
  if (!node) return [];
  const v = valueOf(node);
  return Array.isArray(v) ? v.filter((s) => typeof s === "string") : [];
}
function declaredIn(symbol, props) {
  const owner = symbol.getDeclarations()[0]?.getFirstAncestor((a) => import_ts_morph3.Node.isInterfaceDeclaration(a) || import_ts_morph3.Node.isTypeAliasDeclaration(a));
  const ownerName = owner && (import_ts_morph3.Node.isInterfaceDeclaration(owner) || import_ts_morph3.Node.isTypeAliasDeclaration(owner)) ? owner.getName() : void 0;
  return ownerName ?? (props.getAliasSymbol() ?? props.getSymbol())?.getName() ?? "";
}
var isSchemaProp = (name) => !name.startsWith("_") && !EXCLUDED_PROPS.includes(name);
function elementPropsSources(project, catalog) {
  const sources = [];
  for (const entry of Object.values(catalog.elements)) {
    const cls = findClass(project, entry);
    const decl = cls ? findPropsDecl(project, cls, entry) : null;
    if (!decl) continue;
    const declNodes = /* @__PURE__ */ new Map();
    for (const prop of readProps(decl)) {
      if (isSchemaProp(prop.name)) declNodes.set(prop.name, prop.symbol.getDeclarations()[0]);
    }
    sources.push({
      elementType: entry.elementType,
      ref: `../schemas/${entry.elementType}.schema.json#`,
      declNodes
    });
  }
  const rank = (s) => catalog.deprecated.has(s.elementType) ? 1 : 0;
  return sources.sort(
    (a, b) => b.declNodes.size - a.declNodes.size || rank(a) - rank(b) || a.elementType.localeCompare(b.elementType)
  );
}
function coveringSource(props, sources) {
  return sources.find(
    (s) => s.declNodes.size > 0 && [...s.declNodes].every(([name, node]) => !isSchemaProp(name) || props.get(name) === node)
  ) ?? null;
}
function buildComponentSchema(input, diag) {
  const { entry, shared, sources } = input;
  const { call, elementType } = entry;
  const ctx = { elementType, diag, shared };
  const [propsType, ctrlType] = typeArguments(call);
  const options = optionsObject(call);
  const defaults = readComponentDefaults(member(options, "defaultProps"), diag);
  const properties = {};
  const required = [];
  const baseDefaults = {};
  let source = null;
  if (!propsType || propsType.isAny() || propsType.isUnknown()) {
    diag.report(
      "component-props-missing",
      "properties",
      `\u0442\u0438\u043F props \u043D\u0435 \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0451\u043D: ${call.getText().slice(0, 80)}`
    );
  } else {
    const symbols = propsType.getProperties();
    source = coveringSource(new Map(symbols.map((s) => [s.getName(), s.getDeclarations()[0]])), sources);
    for (const symbol of symbols) {
      const name = symbol.getName();
      if (!isSchemaProp(name)) continue;
      if (source?.declNodes.has(name)) {
        if (name in defaults) baseDefaults[name] = defaults[name];
        continue;
      }
      const description = jsDocDescription(symbol);
      const schema = {
        ...description ? { description } : {},
        "x-declared-in": declaredIn(symbol, propsType),
        ...typeToSchema(symbol.getTypeAtLocation(call), { ...ctx, printNode: call }, `properties.${name}`)
      };
      properties[name] = name in defaults ? withDefault(schema, defaults[name], name, shared, diag) : schema;
      if (!symbol.isOptional()) required.push(name);
    }
  }
  for (const name of Object.keys(defaults)) {
    if (!(name in properties) && !(name in baseDefaults)) {
      diag.report("default-without-prop", `defaults.${name}`, "\u043A\u043B\u044E\u0447 defaultProps \u0431\u0435\u0437 \u0441\u0432\u043E\u0439\u0441\u0442\u0432\u0430 \u0432 props");
    }
  }
  return canonicalComponent({
    $schema: JSON_SCHEMA_DRAFT,
    $id: `${SCHEMA_ID_BASE}/components/${elementType}.schema.json`,
    title: entry.title,
    description: `JSON-\u0441\u0445\u0435\u043C\u0430 \u0434\u043B\u044F \u043A\u043E\u043C\u043F\u043E\u043D\u0435\u043D\u0442\u0430 "${elementType}"`,
    type: "object",
    "x-format-version": FORMAT_VERSION,
    "x-element-type": elementType,
    "x-entity": "component",
    "x-category": CATEGORY_BY_ELEMENT[elementType] ?? "basic",
    ...source ? { allOf: [{ $ref: source.ref }] } : {},
    properties,
    required,
    "x-base-defaults": baseDefaults,
    "x-events": readEvents(options, ctx),
    "x-methods": readControllerMethods(ctrlType, call),
    "x-composition": readComposition(member(options, "view")),
    "x-slots": readSlots(member(options, "slots"))
  });
}

// docs/schemas/generator/diagnostics.ts
var DIAGNOSTIC_CODES = {
  /** Тип не распознан, в схеме x-ts-type. */
  "unresolved-type": "warn",
  /** Явный any/unknown в исходнике. */
  "any-type": "warn",
  /** Объект с произвольными ключами ({[key: string]: any}). */
  "loose-object": "info",
  /** Тип из lib.d.ts / .d.ts — не раскрывается. */
  "external-type": "info",
  /** Рантайм-объект движка (интерфейс с методами) — не раскрывается. */
  "runtime-type": "info",
  /** Циклическая ссылка типа. */
  "cycle-type": "info",
  /** Значение по умолчанию — выражение, не сводимое к JSON. */
  "default-unresolved": "warn",
  /** default: null при типе без null — тип расширен null. */
  "default-null-widened": "warn",
  /** Значение по умолчанию не проходит схему свойства (ajv). */
  "default-invalid": "error",
  /** В defaultProps есть ключ, которого нет среди props. */
  "default-without-prop": "info",
  /** Схема не компилируется валидатором (ajv). */
  "schema-invalid": "error",
  /** Props-файл или тип <X>Props не найден. */
  "props-missing": "error",
  /** Не найден тип общих props или интерфейс элемента (config BASE). */
  "base-missing": "error",
  /** Контейнер, но список дочерних типов не извлечён. */
  "children-unresolved": "warn",
  /** Список дочерних типов извлечён по тексту, а не по типу. */
  "children-by-text": "info",
  /** Генерация элемента упала. */
  "element-failed": "error",
  /** Первый аргумент фабрики компонента не сводится к члену ElementsTypes. */
  "component-name-unresolved": "error",
  /** У вызова фабрики нет типа props (P не указан и не выведен, или any). */
  "component-props-missing": "error",
  /** Два вызова фабрики с одним именем — взят первый. */
  "component-duplicate": "warn",
  /** Имя события в $emit — не строковая константа. */
  "event-name-unresolved": "warn",
  /** Член ElementsTypes не найден ни в ElementsMap, ни среди компонентов. */
  "unclassified-type": "info"
};
var Diagnostics = class {
  items = [];
  report(code, path6, message) {
    const exists = this.items.some((d) => d.code === code && d.path === path6 && d.message === message);
    if (!exists) this.items.push({ code, severity: DIAGNOSTIC_CODES[code], path: path6, message });
  }
};

// docs/schemas/generator/shared.ts
var fs2 = __toESM(require("fs"), 1);
var path4 = __toESM(require("path"), 1);
var import_ts_morph4 = require("ts-morph");
function enumMemberValues(decl) {
  return decl.getMembers().map((m) => {
    const init = m.getInitializer();
    if (init?.isKind(import_ts_morph4.SyntaxKind.StringLiteral)) return init.getLiteralValue();
    if (init?.isKind(import_ts_morph4.SyntaxKind.NumericLiteral)) return String(init.getLiteralValue());
    return m.getName();
  });
}
var SharedRegistry = class {
  constructor(rootDir, warn) {
    this.rootDir = rootDir;
    for (const config of SHARED_ENUMS) {
      const file = path4.resolve(rootDir, config.sourceFile);
      if (!fs2.existsSync(file)) {
        warn(`[WARN] shared ${config.typeName}: \u0444\u0430\u0439\u043B \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D ${config.sourceFile}`);
        continue;
      }
      const project = new import_ts_morph4.Project({ compilerOptions: { skipLibCheck: true } });
      const decl = project.addSourceFileAtPath(file).getEnum(config.enumName);
      if (!decl) {
        warn(`[WARN] shared ${config.typeName}: enum ${config.enumName} \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D`);
        continue;
      }
      const values = enumMemberValues(decl);
      this.loaded.push({ config, values, valueSet: new Set(values) });
    }
  }
  rootDir;
  loaded = [];
  /** Какие shared-файлы реально понадобились в этом прогоне. */
  used = /* @__PURE__ */ new Set();
  /** Именованные типы → элементы, где встретились (кандидаты в shared). */
  usage = /* @__PURE__ */ new Map();
  ref(entry) {
    this.used.add(entry.config.fileName);
    return { $ref: `../shared/${entry.config.fileName}#`, nullable: entry.config.nullable };
  }
  /** Тип узнаётся по имени символа или alias'а. */
  matchType(type) {
    const names = [type.getAliasSymbol()?.getName(), type.getSymbol()?.getName()];
    const entry = this.loaded.find((e) => names.includes(e.config.typeName));
    return entry ? this.ref(entry) : null;
  }
  /** Развёрнутый компилятором union литералов: совпадение с enum или крупное подмножество. */
  matchLiterals(values) {
    for (const entry of this.loaded) {
      const subset = values.every((v) => entry.valueSet.has(v));
      if (!subset) continue;
      if (values.length === entry.values.length || values.length > SHARED_ENUM_SUBSET_THRESHOLD) {
        return this.ref(entry);
      }
    }
    return null;
  }
  /** Допускает ли общий тип по ссылке null. */
  refAllowsNull(ref) {
    return this.loaded.some((e) => e.config.nullable && ref === `../shared/${e.config.fileName}#`);
  }
  trackUsage(typeName, file, elementType) {
    file = path4.relative(this.rootDir, file).replace(/\\/g, "/");
    const key = `${file}#${typeName}`;
    const rec = this.usage.get(key) ?? { type: typeName, file, usedIn: /* @__PURE__ */ new Set() };
    rec.usedIn.add(elementType);
    this.usage.set(key, rec);
  }
  candidates() {
    const sharedNames = new Set(this.loaded.map((e) => e.config.typeName));
    return [...this.usage.values()].filter((r) => r.usedIn.size >= 2 && !sharedNames.has(r.type)).map((r) => ({ type: r.type, file: r.file, usedIn: [...r.usedIn].sort() })).sort((a, b) => b.usedIn.length - a.usedIn.length || a.type.localeCompare(b.type));
  }
  /** Схемы shared-файлов, понадобившихся в прогоне: имя файла → схема. */
  schemas() {
    const out = {};
    for (const entry of this.loaded) {
      if (!this.used.has(entry.config.fileName)) continue;
      const values = [...entry.values];
      if (entry.config.nullable) values.push(null);
      out[entry.config.fileName] = {
        $schema: JSON_SCHEMA_DRAFT,
        $id: `${SCHEMA_ID_BASE}/shared/${entry.config.fileName}`,
        title: entry.config.title,
        type: entry.config.nullable ? ["string", "null"] : "string",
        enum: values
      };
    }
    return out;
  }
};

// docs/schemas/generator/validate.ts
var EXTENSION_KEYWORDS = [
  "x-format-version",
  "x-element-type",
  "x-entity",
  "x-category",
  "x-composition",
  "x-slots",
  "x-deprecated-aliases",
  "x-deprecated",
  "x-replaced-by",
  "x-container",
  "x-base-defaults",
  "x-events",
  "x-methods",
  "x-declared-in",
  "x-kind",
  "x-ts-type"
];
function loadAjv() {
  try {
    const mod = require("ajv");
    return mod.default ?? mod;
  } catch {
    return null;
  }
}
function createValidator(shared, warn) {
  const Ajv = loadAjv();
  if (!Ajv) {
    warn("[WARN] ajv \u043D\u0435 \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D \u2014 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0441\u0445\u0435\u043C \u043F\u0440\u043E\u043F\u0443\u0449\u0435\u043D\u0430");
    return null;
  }
  const ajv = new Ajv({
    strict: true,
    strictTypes: false,
    strictTuples: false,
    strictRequired: false,
    allErrors: true,
    // format (date-time) — подсказка редактору; проверка форматов требует ajv-formats
    validateFormats: false
  });
  ajv.addVocabulary(EXTENSION_KEYWORDS);
  for (const s of Object.values(shared)) ajv.addSchema("required" in s ? { ...s, required: [] } : s);
  const check = (schema, diag) => {
    const defaults = {
      ..."x-base-defaults" in schema ? schema["x-base-defaults"] : {}
    };
    for (const [name, prop] of Object.entries(schema.properties)) {
      if (prop.default !== void 0) defaults[name] = prop.default;
    }
    try {
      const validate = ajv.compile({ ...schema, required: [] });
      if (!validate(defaults)) {
        for (const e of validate.errors ?? []) {
          diag.report("default-invalid", `properties${e.instancePath.replace(/\//g, ".")}`, e.message ?? "");
        }
      }
    } catch (e) {
      diag.report("schema-invalid", "$", e.message);
    } finally {
      ajv.removeSchema(schema.$id);
    }
  };
  const register = (schemas) => {
    for (const s of schemas) ajv.addSchema({ ...s, required: [] });
  };
  return { check, register };
}

// docs/schemas/generator/cli.ts
var BASE_KEY = "$base";
var CATALOG_KEY = "$catalog";
function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const next = argv[i + 1];
    if (next !== void 0 && !next.startsWith("--")) {
      args[a.slice(2)] = next;
      i++;
    } else {
      args[a.slice(2)] = true;
    }
  }
  return args;
}
function normalizeName(raw) {
  return CLI_NAME_ALIASES[raw.toUpperCase()] ?? raw.toLowerCase().replace(/_/g, "-");
}
function findRoot(from) {
  for (let dir = from; ; dir = path5.dirname(dir)) {
    if (fs3.existsSync(path5.join(dir, ROOT_MARKER))) return dir;
    if (path5.dirname(dir) === dir) return null;
  }
}
function main() {
  const args = parseArgs(process.argv.slice(2));
  const warn = (msg) => console.warn(msg);
  const rootDir = typeof args.root === "string" ? path5.resolve(args.root) : findRoot(__dirname);
  if (!rootDir) {
    console.error(`\u041A\u043E\u0440\u0435\u043D\u044C \u0444\u0440\u0435\u0439\u043C\u0432\u043E\u0440\u043A\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D (\u043D\u0435\u0442 ${ROOT_MARKER} \u0432\u044B\u0448\u0435 \u0441\u043A\u0440\u0438\u043F\u0442\u0430) \u2014 \u0443\u043A\u0430\u0436\u0438\u0442\u0435 --root`);
    return 1;
  }
  const pkgDir = path5.resolve(rootDir, PATHS.schemasPackage);
  const outputDir = typeof args.outputDir === "string" ? path5.resolve(args.outputDir) : path5.resolve(pkgDir, PATHS.schemasDir);
  const sharedDir = path5.resolve(outputDir, "..", path5.basename(PATHS.sharedDir));
  const componentsDir = path5.resolve(outputDir, "..", path5.basename(COMPONENT.componentsDir));
  const checkOnly = !!(args.check || args.checkOnly);
  const bundlePath = typeof args.bundle === "string" ? path5.resolve(args.bundle) : null;
  const catalog = readCatalog(rootDir, warn);
  let targets;
  if (args.all) {
    targets = Object.keys(catalog.elements).sort();
  } else if (typeof args.element === "string") {
    targets = [normalizeName(args.element)];
  } else {
    console.error("\u041D\u0443\u0436\u0435\u043D --element <\u0438\u043C\u044F> \u0438\u043B\u0438 --all");
    return 1;
  }
  console.log(`\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u044B \u0442\u0438\u043F\u043E\u0432...`);
  const project = createProgram(rootDir);
  const shared = new SharedRegistry(rootDir, warn);
  const diagnostics = {
    [BASE_KEY]: new Diagnostics(),
    [CATALOG_KEY]: new Diagnostics()
  };
  const base = buildBase(project, rootDir, shared, diagnostics[BASE_KEY]);
  const componentEntries = findComponents(project, rootDir, diagnostics[CATALOG_KEY]);
  const componentByType = new Map(componentEntries.map((c) => [c.elementType, c]));
  const componentTargets = args.all ? componentEntries.map((c) => c.elementType) : targets.filter((t) => componentByType.has(t));
  targets = targets.filter((t) => !componentByType.has(t) || catalog.elements[t]);
  for (const t of targets) {
    if (!catalog.elements[t]) {
      console.error(`\u042D\u043B\u0435\u043C\u0435\u043D\u0442 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D \u043D\u0438 \u0432 \u0441\u043F\u0440\u0430\u0432\u043E\u0447\u043D\u0438\u043A\u0435, \u043D\u0438 \u0441\u0440\u0435\u0434\u0438 \u043A\u043E\u043C\u043F\u043E\u043D\u0435\u043D\u0442\u043E\u0432: ${t}`);
      return 1;
    }
  }
  if (args.all) {
    const known = /* @__PURE__ */ new Set([
      ...Object.keys(catalog.elements),
      ...Object.values(catalog.elements).flatMap((e) => e.deprecatedAliases),
      ...componentByType.keys()
    ]);
    for (const [member2, value] of Object.entries(catalog.enumValues)) {
      if (!known.has(value)) {
        diagnostics[CATALOG_KEY].report("unclassified-type", member2, `${value}: \u043D\u0435 \u044D\u043B\u0435\u043C\u0435\u043D\u0442 \u0438 \u043D\u0435 \u043A\u043E\u043C\u043F\u043E\u043D\u0435\u043D\u0442`);
      }
    }
  }
  const schemas = {};
  for (const elementType of targets) {
    const entry = catalog.elements[elementType];
    const diag = new Diagnostics();
    diagnostics[elementType] = diag;
    try {
      const cls = findClass(project, entry);
      if (!cls) throw new Error(`\u043A\u043B\u0430\u0441\u0441 ${entry.className} \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D \u0432 \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u0435`);
      schemas[elementType] = buildElementSchema({ project, cls, entry, catalog, base, shared }, diag);
    } catch (e) {
      diag.report("element-failed", "$", e.message);
    }
  }
  const sources = componentTargets.length > 0 ? [...elementPropsSources(project, catalog), ...base ? [base] : []] : [];
  const components = {};
  for (const t of componentTargets) {
    const diag = new Diagnostics();
    diagnostics[t] = diag;
    try {
      components[t] = buildComponentSchema({ entry: componentByType.get(t), shared, sources }, diag);
    } catch (e) {
      diag.report("element-failed", "$", e.message);
    }
  }
  const sharedSchemas = { ...shared.schemas() };
  if (base) sharedSchemas[BASE.fileName] = base.schema;
  const validate = createValidator(sharedSchemas, warn);
  if (validate) {
    for (const [t, s] of Object.entries(schemas)) validate.check(s, diagnostics[t]);
    validate.register(Object.values(schemas));
    for (const [t, s] of Object.entries(components)) validate.check(s, diagnostics[t]);
  }
  const report = { summary: {}, elements: {}, sharedCandidates: shared.candidates() };
  for (const t of [BASE_KEY, CATALOG_KEY, ...targets, ...componentTargets]) {
    const items = diagnostics[t].items;
    if (items.length > 0) report.elements[t] = items;
    for (const d of items) report.summary[d.code] = (report.summary[d.code] ?? 0) + 1;
  }
  report.summary = Object.fromEntries(Object.entries(report.summary).sort(([a], [b]) => a.localeCompare(b)));
  const errors = Object.values(report.elements).flat().filter((d) => d.severity === "error").length;
  console.log(
    `\u0413\u043E\u0442\u043E\u0432\u043E: \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u043E\u0432 ${Object.keys(schemas).length}/${targets.length}, \u043A\u043E\u043C\u043F\u043E\u043D\u0435\u043D\u0442\u043E\u0432 ${Object.keys(components).length}/${componentTargets.length}, \u043E\u0448\u0438\u0431\u043E\u043A ${errors}`
  );
  for (const [code, n] of Object.entries(report.summary)) console.log(`  ${code}: ${n}`);
  if (bundlePath) {
    const bundle = {
      "x-format-version": FORMAT_VERSION,
      shared: sharedSchemas,
      elements: schemas,
      components,
      report
    };
    fs3.mkdirSync(path5.dirname(bundlePath), { recursive: true });
    fs3.writeFileSync(bundlePath, serialize(bundle));
    console.log(`\u0411\u0430\u043D\u0434\u043B: ${bundlePath}`);
    return 0;
  }
  const files = [
    ...Object.entries(schemas).map(([t, s]) => ({
      file: path5.join(outputDir, `${t}.schema.json`),
      text: serialize(s)
    })),
    ...Object.entries(components).map(([t, s]) => ({
      file: path5.join(componentsDir, `${t}.schema.json`),
      text: serialize(s)
    })),
    ...Object.entries(sharedSchemas).map(([name, s]) => ({
      file: path5.join(sharedDir, name),
      text: serialize(s)
    }))
  ];
  if (checkOnly) {
    const stale = files.filter((f) => !fs3.existsSync(f.file) || fs3.readFileSync(f.file, "utf-8") !== f.text);
    for (const f of stale) console.error(`\u0420\u0430\u0441\u0445\u043E\u0434\u0438\u0442\u0441\u044F \u0441 \u0433\u0435\u043D\u0435\u0440\u0430\u0442\u043E\u0440\u043E\u043C: ${path5.relative(rootDir, f.file)}`);
    return stale.length > 0 || errors > 0 ? 1 : 0;
  }
  for (const f of files) {
    fs3.mkdirSync(path5.dirname(f.file), { recursive: true });
    fs3.writeFileSync(f.file, f.text);
  }
  const manifestPath = path5.resolve(pkgDir, PATHS.manifest);
  if (fs3.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs3.readFileSync(manifestPath, "utf-8"));
    for (const [t, s] of Object.entries(schemas)) {
      manifest[t] = {
        path: `${PATHS.schemasDir}/${t}.schema.json`,
        title: s.title,
        deprecatedAliases: s["x-deprecated-aliases"]
      };
    }
    for (const [t, s] of Object.entries(components)) {
      manifest[t] = {
        path: `${COMPONENT.componentsDir}/${t}.schema.json`,
        title: s.title,
        deprecatedAliases: []
      };
    }
    fs3.writeFileSync(manifestPath, serialize(manifest));
  } else {
    warn(`[WARN] \u043C\u0430\u043D\u0438\u0444\u0435\u0441\u0442 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D: ${manifestPath}`);
  }
  console.log(`\u0417\u0430\u043F\u0438\u0441\u0430\u043D\u043E \u0444\u0430\u0439\u043B\u043E\u0432: ${files.length}`);
  return errors > 0 ? 1 : 0;
}
process.exitCode = main();
