// Dnd карточек элементов канваса (замечание приёмки N2): нативный HTML5
// drag-and-drop — без новых зависимостей. Карточка (ElementCard) ставит
// draggable и кладёт payload в dataTransfer; зоны приёма (узел страницы,
// колонка шага формы) в dragover видят только типы данных, поэтому сам
// перетаскиваемый элемент берут из модульного состояния текущего drag
// (ревью A9, R4) — раньше id и вид элемента кодировались в MIME-типах,
// которые браузер приводит к нижнему регистру. Вид элемента зону приёма
// не интересует: любой элемент переносится в любой блок (ADR-17).

/** MIME-тип drag карточки элемента: в данных — JSON payload (id элемента). */
export const ELEMENT_DND_MIME = 'application/x-blueprint-element';

export type ElementDragPayload = {
  elementId: string;
};

// Текущий drag карточки в этом документе. Сбрасывается по dragend карточки;
// если карточка размонтировалась до конца жеста, устаревшее значение не
// мешает: оно читается только при наличии нашего MIME-типа в событии.
let currentDrag: ElementDragPayload | null = null;

export function writeElementDrag(dataTransfer: DataTransfer, payload: ElementDragPayload): void {
  dataTransfer.setData(ELEMENT_DND_MIME, JSON.stringify(payload));
  dataTransfer.effectAllowed = 'move';
  currentDrag = payload;
}

export function endElementDrag(): void {
  currentDrag = null;
}

// Перетаскиваемая карточка во время dragover; null — это не drag карточки
// элемента (файл, текст, drag из другого окна).
export function draggedElement(dataTransfer: DataTransfer): ElementDragPayload | null {
  return Array.from(dataTransfer.types).includes(ELEMENT_DND_MIME) ? currentDrag : null;
}

// Payload на drop — из данных события (они доступны только в drop).
export function readElementDrag(dataTransfer: DataTransfer): ElementDragPayload | null {
  const raw = dataTransfer.getData(ELEMENT_DND_MIME);
  if (!raw) {
    return null;
  }
  try {
    const { elementId } = JSON.parse(raw) as { elementId?: string };
    return elementId ? { elementId } : null;
  } catch {
    return null;
  }
}

// Drag действительно ушёл из зоны приёма (доводка dnd, ADR-16/17): Chromium
// присылает dragleave при переходе на дочерний элемент зоны, и relatedTarget
// у него часто null — сверяем координаты курсора с прямоугольником зоны.
export function isDragLeavingZone(zone: HTMLElement, clientX: number, clientY: number): boolean {
  const rect = zone.getBoundingClientRect();
  return clientX <= rect.left || clientX >= rect.right || clientY <= rect.top || clientY >= rect.bottom;
}

/** Якорь вставки: до/после карточки. */
export type DropAnchorPosition = {
  elementId: string;
  placement: 'before' | 'after';
};

// Карточка-якорь под курсором внутри зоны приёма: ближайший предок с
// data-element-card; сторона — по вертикальной середине карточки.
// selector сужает кандидатов (шаг формы — карточки одной колонки).
export function anchorFromPoint(
  zone: HTMLElement,
  clientY: number,
  selector = '[data-element-card]',
): DropAnchorPosition | null {
  const cards = zone.querySelectorAll<HTMLElement>(selector);
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
