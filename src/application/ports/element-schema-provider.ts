import type { CanvasElementKind } from '@domain/model/canvas-element';

// Порт описаний элементов (конституция, железное правило 2; этап 3
// docs/schemas/PLAN.md). Описание собирается из JSON-схемы элемента
// (фреймворка или проекта) и политики редактора: схема задаёт тип значения,
// политика только сужает — состав элементов, видимые атрибуты,
// обязательность, порядок, подписи. UI строит форму атрибутов только по
// описанию, без ветвлений по kind (§4b AGENTS.md).

// Редактор атрибута (поле ввода в панели) выводится из типа значения в
// схеме: text — string, number — number/integer, bool — boolean,
// select/radio/chips — string с enum (вид выбирает ключ `editor` политики;
// массив значений enum — select/chips с multiple), stringList — массив строк,
// optionList — массив объектов с id и подписью, icon — string с enum из
// общей схемы иконок фреймворка (shared/icon.schema.json).
// switches — enum взаимоисключающими switch (вложенные поля варианта — под
// его switch); optionFile / optionText — тот же массив вариантов, что
// optionList, из файла CSV или текста через разделитель [owner 2026-11-19].
export type ElementAttributeType =
  | 'bool'
  | 'text'
  | 'number'
  | 'select'
  | 'radio'
  | 'chips'
  | 'switches'
  | 'stringList'
  | 'optionList'
  | 'optionFile'
  | 'optionText'
  | 'icon';

// Где лежит значение атрибута в элементе карты: props — атрибуты элемента
// фреймворка, ext — надстройки проекта над схемой (extensions схем проекта).
export type ElementAttributeStore = 'props' | 'ext';

export type AttributeOption = {
  value: string;
  label: string;
  /** Подсказка варианта (иконка «i» у switches) [owner 2026-11-19]. */
  hint?: string;
};

/**
 * Фиксация значения [owner 2026-11-19]: пока атрибут key равен equals, у
 * поля значение value и оно недоступно; смена key в панели записывает value
 * той же командой — в карте значение согласовано. Сейчас в политике не
 * используется: атрибуты Selection list независимы (ADR-27).
 */
export type AttributeLock = {
  key: string;
  equals: unknown;
  value: unknown;
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
  store: ElementAttributeStore;
  required: boolean;
  label: string;
  placeholder?: string;
  helperText?: string;
  multiline?: boolean;
  /** Секция панели («Настройки»); без секции поле идёт в общий поток. */
  section?: string;
  /**
   * Множественный выбор: значение — массив вариантов (схема: массив enum,
   * в надстройке — `"multiple": true`). Без флага — одно значение-строка.
   * Один признак для панели и генератора UI [owner 2026-10-23].
   */
  multiple?: boolean;
  /** Варианты select/radio/chips: подмножество enum схемы с подписями политики. */
  options?: readonly AttributeOption[];
  /** Форма элемента для optionList. */
  item?: OptionListItemShape;
  visibleWhen?: AttributeVisibilityRule;
  /**
   * Поле под переключателем [owner 2026-11-19]: включён — есть значение или
   * поле раскрыто; выключение снимает значение. Только вид панели — в карте
   * хранится одно значение атрибута, схема и экспорт не меняются.
   */
  toggle?: boolean;
  /**
   * Вид ввода того же значения [owner 2026-11-19]: ключ может встретиться в
   * описании несколько раз с разными view (список, файл, текст) — значение
   * одно, видимость выбирает visibleWhen.
   */
  view?: string;
  /** bool: переключатель показывает отрицание значения. */
  invert?: boolean;
  lockedWhen?: readonly AttributeLock[];
  /** Разделитель значений optionText. */
  delimiter?: string;
};

/**
 * Чип карточки канваса по значению атрибута описания [owner 2026-11-19]:
 * bool — текст label при значении when (по умолчанию true); enum — короткая
 * подпись варианта (labels, иначе подпись варианта атрибута).
 */
export type ElementCardChip = {
  key: string;
  label?: string;
  when?: boolean;
  labels?: Readonly<Record<string, string>>;
  tone?: 'default' | 'error';
};

/** Ключи props, которые карточка канваса показывает текстом, бейджем и иконкой. */
export type ElementCardFields = {
  title?: string;
  subtitle?: string;
  badge?: string;
  /**
   * Атрибут типа icon, чья иконка рисуется на карточке [owner 2026-10-28];
   * без ключа или без значения — плейсхолдер вида.
   */
  icon?: string;
  /** Чипы по атрибутам в порядке политики (card.chips). */
  chips?: readonly ElementCardChip[];
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
  /** Значения надстроек ext нового элемента [owner 2026-11-19]. */
  extDefaults: Readonly<Record<string, unknown>>;
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
