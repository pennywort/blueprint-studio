import type { CanvasElementKind } from '@domain/model/canvas-element';

// Порт описаний элементов (конституция, железное правило 2; этап 3
// docs/schemas/PLAN.md). Описание собирается из JSON-схемы элемента
// (фреймворка или проекта) и политики редактора: схема задаёт тип значения,
// политика только сужает — состав элементов, видимые атрибуты,
// обязательность, порядок, подписи. UI строит форму атрибутов только по
// описанию, без ветвлений по kind (§4b AGENTS.md).

// Редактор атрибута выводится из типа значения в схеме, не задаётся
// политикой: text — string, number — number/integer, bool — boolean,
// select/radio — string с enum (radio — вид, выбранный политикой),
// stringList — массив строк, optionList — массив объектов с id и подписью,
// icon — string с enum из общей схемы иконок фреймворка (shared/icon.schema.json).
export type ElementAttributeType =
  'bool' | 'text' | 'number' | 'select' | 'radio' | 'stringList' | 'optionList' | 'icon';

export type AttributeOption = {
  value: string;
  label: string;
};

/** Форма элемента списка optionList: ключи id и подписи, шаблон нового элемента. */
export type OptionListItemShape = {
  idKey: string;
  labelKey: string;
  /** Значения обязательных полей нового элемента (по схеме элемента массива). */
  template: Readonly<Record<string, unknown>>;
};

/** Условная видимость: атрибут показывается, когда другой атрибут равен значению. */
export type AttributeVisibilityRule = {
  key: string;
  equals: unknown;
};

export type ElementAttribute = {
  key: string;
  type: ElementAttributeType;
  required: boolean;
  label: string;
  placeholder?: string;
  helperText?: string;
  multiline?: boolean;
  /** Секция панели («Настройки»); без секции поле идёт в общий поток. */
  section?: string;
  /** Варианты select/radio: подмножество enum схемы с подписями политики. */
  options?: readonly AttributeOption[];
  /** Форма элемента для optionList. */
  item?: OptionListItemShape;
  visibleWhen?: AttributeVisibilityRule;
};

/** Ключи props, которые карточка канваса показывает текстом и бейджем. */
export type ElementCardFields = {
  title?: string;
  subtitle?: string;
  badge?: string;
};

// Описание элемента для редактора: подписи вида, атрибуты в порядке
// политики, props нового элемента.
export type ElementSchema = {
  kind: CanvasElementKind;
  /** Источник схемы: пакет фреймворка или схемы проекта (компоненты, комментарий). */
  source: 'framework' | 'project';
  /** Подпись вида: чип карточки, меню добавления, заголовок панели. */
  label: string;
  /** Категория под заголовком панели («Сценарий», «Форма»). */
  category: string;
  description?: string;
  card: ElementCardFields;
  /** Значения props нового элемента. */
  defaults: Readonly<Record<string, unknown>>;
  attributes: readonly ElementAttribute[];
};

export class SchemaNotFoundError extends Error {
  constructor(public readonly kind: string) {
    super(`Схема элемента не найдена: ${kind}`);
    this.name = 'SchemaNotFoundError';
  }
}

export interface IElementSchemaProvider {
  // Бросает SchemaNotFoundError для kind вне политики редактора.
  getSchema(kind: CanvasElementKind): ElementSchema;
  // Элементы политики в её порядке (порядок меню добавления).
  listSchemas(): readonly ElementSchema[];
}
