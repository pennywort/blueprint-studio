import type { ComponentType } from 'react';
import type { CanvasElementKind, ElementProps } from '@domain/model/canvas-element';

// Набросок элемента на карточке канваса [owner 2026-11-05]: не настоящий
// компонент фреймворка, а «черновик», по которому автор карты отличает виды
// элементов. Модель не меняется — только чтение kind + props из ServiceBlueprint (§4b).
export type ElementSketchProps = {
  kind: CanvasElementKind;
  /** props элемента — стабильная ссылка из ServiceBlueprint (memo по ссылке). */
  props: ElementProps;
  /** Основной текст по каталогу (props[card.title] или подпись вида). */
  title: string;
  /** Дополнительный текст по каталогу (props[card.subtitle]). */
  secondaryText?: string;
  /** Иконка по каталогу (props[card.icon]). */
  icon?: string;
  /** У вида есть место иконки (card.icon политики). */
  iconSlot?: boolean;
};

export type ElementSketchComponent = ComponentType<ElementSketchProps>;
