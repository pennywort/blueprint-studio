import type { ComponentType } from 'react';
import type { CanvasElementKind, ElementProps } from '@domain/model/canvas-element';

// Набросок элемента на карточке канваса [owner 2026-11-05]: не настоящий
// компонент фреймворка, а «черновик», по которому автор карты отличает виды
// элементов. Набросок сам читает нужные поля из props (списка «отображаемых
// свойств» нет); все props не показывает. Модель не меняется — только чтение
// kind + props из ServiceBlueprint (§4b).
export type ElementSketchProps = {
  kind: CanvasElementKind;
  /** props элемента — стабильная ссылка из ServiceBlueprint (memo по ссылке). */
  props: ElementProps;
  /** Основной текст по каталогу (props[card.title] или подпись вида) — запасной текст. */
  title: string;
  /** Дополнительный текст по каталогу (набросок по умолчанию). */
  secondaryText?: string;
  /** Иконка по каталогу (набросок по умолчанию). */
  icon?: string;
};

export type ElementSketchComponent = ComponentType<ElementSketchProps>;

/** Строковое значение props или undefined (пустая строка — нет значения). */
export function textOf(props: ElementProps, key: string): string | undefined {
  const value = props[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/** Объект props (атом, вложенное описание) или undefined. */
export function objectOf(value: unknown): Readonly<Record<string, unknown>> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

/** Подписи вариантов (options/items): строка или объект с label/title/value. */
export function labelsOf(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const labels: string[] = [];
  for (const item of value) {
    if (typeof item === 'string') {
      labels.push(item);
      continue;
    }
    const entry = objectOf(item);
    const label = entry?.label ?? entry?.title ?? entry?.value;
    if (typeof label === 'string' && label.length > 0) labels.push(label);
  }
  return labels;
}
