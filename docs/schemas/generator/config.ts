/**
 * Настройки генератора — только данные. Поведение скрипта меняется правкой этих таблиц,
 * а не кода (одно правило — одно значение).
 */

import type { Category, PropSchema } from './format';

/**
 * Признак корня монорепозитория: корень ищется вверх от каталога генератора
 * (работает и для папки generator/, и для собранного одного файла). Флаг --root — явный путь.
 */
export const ROOT_MARKER = 'packages/lib/tsconfig.json';

/** Пути относительно корня монорепозитория. */
export const PATHS = {
  elementsDir: 'packages/lib/src/dom/elements',
  elementsMap: 'packages/lib/src/dom/elements/ElementsMap.ts',
  elementsMapVariable: 'ElementsMap',
  constants: 'packages/constants/src/index.ts',
  elementsTypesEnum: 'ElementsTypes',
  libPackage: 'packages/lib',
  schemasPackage: 'packages/element-schemas',
  /** Относительно schemasPackage. */
  schemasDir: 'src/schemas',
  sharedDir: 'src/shared',
  manifest: 'src/index.json',
  baseElementSchema: 'src/shared/base-element.schema.json',
  baseEventsSchema: 'src/shared/base-events.schema.json',
} as const;

export const SCHEMA_ID_BASE = 'https://framework.internal';

/** Устаревшие имена для CLI: --element TEXT → text-field. */
export const CLI_NAME_ALIASES: Record<string, string> = {
  TEXT: 'text-field',
  VIEW: 'container',
  SCROLL_VIEW: 'container',
  LABEL: 'typography',
  SUGGEST: 'autocomplete',
  DATE_PICKER: 'date-field',
  MENU_BUTTON: 'dropdown',
  DIALOG: 'modal',
};

/** Категория элемента. Не попавшие в таблицу — 'basic'. */
export const CATEGORY_BY_ELEMENT: Record<string, Category> = {
  'pop-up': 'overlay',
  modal: 'overlay',
  dialog: 'overlay',
  popover: 'overlay',
  drawer: 'overlay',
  tooltip: 'overlay',
  container: 'layout',
  view: 'layout',
  grid: 'layout',
  'scroll-view': 'layout',
  'flex-container': 'layout',
  'text-field': 'form',
  select: 'form',
  checkbox: 'form',
  'radio-group': 'form',
  switch: 'form',
  'date-field': 'form',
  'search-field': 'form',
  autocomplete: 'form',
  'mask-input': 'form',
  'step-input': 'form',
  range: 'form',
  rating: 'form',
  'color-card': 'form',
  counter: 'form',
};

/**
 * Служебные props верхнего уровня: в схему не попадают.
 * Имена с ведущим `_` отсекаются всегда.
 */
export const EXCLUDED_PROPS: readonly string[] = [
  'type',
  'clientId',
  'parentId',
  'slotType',
  'isComponentChild',
];

/**
 * Enum'ы типов элементов. Вложенное поле `type` с таким типом — ссылка движка на узел,
 * а не данные пропса: во вложенных объектах отбрасывается. Любой другой `type`
 * (дискриминатор атома, вид action-элемента) остаётся в схеме.
 */
export const ELEMENT_TYPE_ENUMS: readonly string[] = ['ElementsTypes', 'InternalComponentTypes'];

/**
 * Внешние типы (lib.d.ts и т.п.) с известным JSON-представлением.
 * Остальные внешние типы получают x-ts-type и запись в отчёте.
 */
export const KNOWN_EXTERNAL_TYPES: Readonly<Record<string, PropSchema>> = {
  Date: { type: 'string', format: 'date-time' },
};

/** Базовый класс-контейнер: наследники (на любой глубине) — контейнеры. */
export const CONTAINER_BASE_CLASSES: readonly string[] = ['ContainerImpl'];

/** Геттеры класса, перечисляющие допустимые дочерние типы. */
export const CHILDREN_GETTERS: readonly string[] = ['allowedTypes', 'childrenTypes'];

/** Декораторы, помечающие публичные методы. */
export const PUBLIC_METHOD_DECORATORS: readonly string[] = ['PublicApiMethod', 'PublicApiField'];

/**
 * Общие типы: выносятся в shared и подключаются через $ref.
 * Сейчас только enum'ы. Кандидаты на добавление — в отчёте (sharedCandidates).
 */
export interface SharedEnumConfig {
  /** Имя TS-типа (enum или alias), по которому тип узнаётся. */
  typeName: string;
  /** Файл, где объявлен enum, относительно корня монорепозитория. */
  sourceFile: string;
  enumName: string;
  /** Имя файла в shared. */
  fileName: string;
  title: string;
  /** Допускает ли общий тип null (тогда `T | null` не требует обёртки). */
  nullable: boolean;
}

export const SHARED_ENUMS: readonly SharedEnumConfig[] = [
  {
    typeName: 'Icon',
    sourceFile: 'packages/lib/src/dom/elements/PropertyConstants.ts',
    enumName: 'Icon',
    fileName: 'icon.schema.json',
    title: 'Icon',
    nullable: true,
  },
];

/**
 * Развёрнутый компилятором union литералов признаётся общим enum, если совпадает с ним
 * или является подмножеством размером больше порога.
 */
export const SHARED_ENUM_SUBSET_THRESHOLD = 50;
