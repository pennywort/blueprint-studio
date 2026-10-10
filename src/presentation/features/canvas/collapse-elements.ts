import { COLLAPSED_VISIBLE_ELEMENTS, ELEMENTS_COLLAPSE_THRESHOLD } from './canvas-layout';
import type { CanvasElementData } from './graph-flow-adapter';

// Автосжатие списка элементов узла (T-033; Q-14, решение владельца):
// скролл внутри узла не реализуем — при превышении порога видимыми
// остаются первые COLLAPSED_VISIBLE_ELEMENTS карточек плюс все карточки
// с исходящими связями (скрытая карточка унесла бы свой source-handle,
// и react-flow уронил бы ребро). Порог и размер видимой части — константы
// в canvas-layout.ts.
export function collapseElements(
  elements: readonly CanvasElementData[],
  expanded: boolean,
): CanvasElementData[] {
  if (expanded || elements.length <= ELEMENTS_COLLAPSE_THRESHOLD) {
    return [...elements];
  }
  const head = elements.slice(0, COLLAPSED_VISIBLE_ELEMENTS);
  const linkedTail = elements.slice(COLLAPSED_VISIBLE_ELEMENTS).filter((element) => element.hasOutgoingLink);
  return [...head, ...linkedTail];
}

// Нужна ли кнопка раскрытия для данного списка.
export function isCollapsible(elements: readonly CanvasElementData[]): boolean {
  return elements.length > ELEMENTS_COLLAPSE_THRESHOLD;
}
