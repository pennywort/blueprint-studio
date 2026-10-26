import type { ComponentType } from 'react';
import type { ElementAttribute, ElementAttributeType } from '@application/ports/element-schema-provider';

// Реестр редакторов свойств (T-040): маппинг «тип атрибута → React-компонент
// редактора». Расширение — регистрацией нового редактора, без правки панели
// атрибутов (декомпозиция, D-правило 1: никакого switch по именам элементов).
// Встроенные маппинги: text → TextField, stringList → многострочное поле,
// bool → Switch, number → числовое поле, radio → RadioGroup, select → Select,
// optionList → список вариантов, icon → поиск + сетка иконок.

export type PropertyEditorProps = {
  /** Текущее значение свойства элемента (тип зависит от типа атрибута). */
  value: unknown;
  /** Изменение значения → панель упакует в UpdateElementProps. */
  onChange: (value: unknown) => void;
  /** Описание атрибута (схема + политика): подпись, подсказки, варианты, обязательность. */
  attribute: ElementAttribute;
};

export type PropertyEditor = ComponentType<PropertyEditorProps>;

const editors = new Map<ElementAttributeType, PropertyEditor>();

export function registerPropertyEditor(type: ElementAttributeType, editor: PropertyEditor): void {
  editors.set(type, editor);
}

// Редактор по типу атрибута; null — редактор не зарегистрирован: панель
// показывает поле как read-only строку, чтобы схема не «молчала» (T-041).
export function resolvePropertyEditor(type: ElementAttributeType): PropertyEditor | null {
  return editors.get(type) ?? null;
}

export function resetPropertyEditorRegistry(): void {
  editors.clear();
}
