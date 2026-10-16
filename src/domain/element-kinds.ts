import type {
  CanvasElement,
  CanvasElementKind,
  CommentElement,
  ListItem,
  PageElementKind,
  WidgetCard,
} from './model/canvas-element';
import type { FormComponentKind, SelectList } from './model/form-components';

// Реестр видов элементов (R-CFG-1, F01/F02/F13, [owner 2026-10-16]): что умеет
// вид элемента — данные, а не ветвления `kind === 'selectList' / 'comment'`.
// Изменить возможность вида = поправить строку таблицы; новый вид — новая
// строка, проверки не меняются. Сейчас это stub конфига редактора (R-CFG-9).

/** Семейство вида: карточка страницы, компонент формы или комментарий-элемент. */
export type ElementKindFamily = 'page' | 'form' | 'comment';

export interface ElementKindRules {
  /** Семейство (F13): от него зависят вид id и фабрика по умолчанию. */
  readonly family: ElementKindFamily;
  /** Источник и цель связей навигации и правил (F02). */
  readonly connectable: boolean;
  /** Может включить «Сложную логику» — источник правил видимости (F01, L5). */
  readonly logicSource: boolean;
  /** Может быть целью правила видимости в шаге формы (F02). */
  readonly logicTarget: boolean;
  /** Есть в меню добавления элементов (тулбар, «+» шага); до R-CFG-7. */
  readonly inAddMenu: boolean;
}

const PAGE: ElementKindRules = {
  family: 'page',
  connectable: true,
  logicSource: false,
  logicTarget: true,
  inAddMenu: true,
};
const FORM: ElementKindRules = { ...PAGE, family: 'form' };

// Значения = сегодняшнее поведение. Источник логики — только Select (L5);
// комментарий — вне связей, логики и меню (кнопка тулбара) [owner 2026-10-15].
export const ELEMENT_KIND_RULES: Readonly<Record<CanvasElementKind, ElementKindRules>> = {
  listItem: PAGE,
  widgetCard: PAGE,
  comment: {
    family: 'comment',
    connectable: false,
    logicSource: false,
    logicTarget: false,
    inAddMenu: false,
  },
  textField: FORM,
  infoBlock: FORM,
  datePeriod: FORM,
  attachment: FORM,
  checkbox: FORM,
  configurationItemPicker: FORM,
  employeeSearch: FORM,
  selectList: { ...FORM, logicSource: true },
  typography: FORM,
  button: FORM,
  addressPicker: FORM,
  employeeLoginField: FORM,
};

export function kindRules(kind: CanvasElementKind): ElementKindRules {
  return ELEMENT_KIND_RULES[kind];
}

// Тонкие обёртки над таблицей (F13). Сужение типа держится на том, что
// семейство в таблице совпадает с видом схемы (canvas-element.ts).

export function isPageElementKind(kind: CanvasElementKind): kind is PageElementKind {
  return kindRules(kind).family === 'page';
}

export function isCommentKind(kind: CanvasElementKind): kind is 'comment' {
  return kindRules(kind).family === 'comment';
}

export function isFormComponentKind(kind: CanvasElementKind): kind is FormComponentKind {
  return kindRules(kind).family === 'form';
}

export function isPageElement(element: CanvasElement): element is ListItem | WidgetCard {
  return isPageElementKind(element.kind);
}

export function isCommentElement(element: CanvasElement): element is CommentElement {
  return isCommentKind(element.kind);
}

/** Элемент, который может включить «Сложную логику»; у источника есть варианты (options). */
export type LogicSourceElement = SelectList;

export function canBeLogicSource(element: CanvasElement): element is LogicSourceElement {
  return kindRules(element.kind).logicSource && 'options' in element;
}
