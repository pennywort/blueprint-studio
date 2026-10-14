// Перестановка в упорядоченной последовательности по якорю — общее ядро
// порядка для слоёв редактора [owner 2026-10-14]: страницы в колонке
// канваса (orderIndex, D13: ReorderInLayer, связь в конец колонки) и шаги
// формы заявки (массив шагов, БТ 6.5: перенос dnd, переход на шаг). Позиция
// задаётся соседом и стороной от него (ревью A3, R3): якорь ищется ПОСЛЕ
// изъятия элемента — сдвиг индексов не на вызывающей стороне.
// Чистая функция, без внешних импортов; мутирует переданный массив (черновик
// Immer или его копию).

export type OrderAnchor = {
  /** Сосед-якорь: перемещаемый встаёт до/после него. */
  id: string;
  placement: 'before' | 'after';
};

/** Переносит элемент itemId к якорю; false — элемента или якоря нет (массив не тронут). */
export function moveByAnchor<T extends { id: string }>(
  items: T[],
  itemId: string,
  anchor: OrderAnchor,
): boolean {
  const from = items.findIndex((item) => item.id === itemId);
  if (from < 0 || anchor.id === itemId || !items.some((item) => item.id === anchor.id)) {
    return false;
  }
  const [moved] = items.splice(from, 1);
  const anchorIndex = items.findIndex((item) => item.id === anchor.id);
  items.splice(anchor.placement === 'before' ? anchorIndex : anchorIndex + 1, 0, moved!);
  return true;
}
