// Dnd карточек элементов канваса (замечание приёмки N2): нативный HTML5
// drag-and-drop — без новых зависимостей. Карточка (ElementCard) ставит
// draggable и кладёт payload в dataTransfer; зоны приёма (узел страницы,
// колонка шага формы) читают тип во время dragover (данные в dragover
// недоступны — только типы, поэтому вид элемента кодируем в MIME-типе)
// и вычисляют якорь по карточке под курсором.

/** Вид перетаскиваемого элемента — совместимость с зонами приёма. */
export type ElementDndKind = 'listItem' | 'widgetCard' | 'formComponent';

/** Основной MIME-тип: в данных — JSON payload (id элемента). */
export const ELEMENT_DND_MIME = 'application/x-blueprint-element';

/** Маркер вида: читается в dragover через dataTransfer.types. */
export const elementDndKindType = (kind: ElementDndKind): string => `${ELEMENT_DND_MIME}-kind-${kind}`;

export type ElementDragPayload = {
  elementId: string;
  kind: ElementDndKind;
};

export function writeElementDrag(dataTransfer: DataTransfer, { elementId, kind }: ElementDragPayload): void {
  dataTransfer.setData(ELEMENT_DND_MIME, JSON.stringify({ elementId }));
  dataTransfer.setData(elementDndKindType(kind), '');
  dataTransfer.effectAllowed = 'move';
}

// Вид элемента из types drag-события; null — это не drag карточки элемента.
export function readElementDndKind(types: readonly string[] | DOMStringList): ElementDndKind | null {
  for (const kind of ['listItem', 'widgetCard', 'formComponent'] as const) {
    if (Array.from(types).includes(elementDndKindType(kind))) {
      return kind;
    }
  }
  return null;
}

export function readElementDrag(dataTransfer: DataTransfer): ElementDragPayload | null {
  const raw = dataTransfer.getData(ELEMENT_DND_MIME);
  if (!raw) {
    return null;
  }
  const kind = readElementDndKind(dataTransfer.types);
  if (!kind) {
    return null;
  }
  try {
    const { elementId } = JSON.parse(raw) as { elementId?: string };
    return elementId ? { elementId, kind } : null;
  } catch {
    return null;
  }
}

/** Якорь вставки: до/после карточки. */
export type DropAnchorPosition = {
  elementId: string;
  placement: 'before' | 'after';
};

// Карточка-якорь под курсором внутри зоны приёма: ближайший предок с
// data-element-card; сторона — по вертикальной середине карточки.
export function anchorFromPoint(zone: HTMLElement, clientY: number): DropAnchorPosition | null {
  const cards = zone.querySelectorAll<HTMLElement>('[data-element-card]');
  for (const card of cards) {
    const rect = card.getBoundingClientRect();
    if (clientY >= rect.top && clientY <= rect.bottom) {
      return {
        elementId: card.dataset.elementCard!,
        placement: clientY < rect.top + rect.height / 2 ? 'before' : 'after',
      };
    }
  }
  return null;
}
