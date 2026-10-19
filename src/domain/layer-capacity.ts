// Ёмкость уровней слоёного графа [owner 2026-10-16]: сколько узлов может
// стоять на уровне. Правило — данные, а не ветвления: снять или изменить
// ограничение = поменять таблицу ниже (обратимость решений заказчика).
// Одни и те же функции проверяют граф (инвариант layer-capacity) и
// подсказывают dnd редактора, куда можно бросить (layers/layer-policy).
// Пустой уровень допустим — ёмкость ограничивает только сверху.

/** Уровень → наибольшее число узлов на нём; уровня нет в таблице — без ограничения. */
export type LayerCapacity = Readonly<Record<number, number>>;

/** Канвас страниц: корень карты один — Главная или единственный блок-корень (ADR-15, D8). */
export const PAGE_LAYER_CAPACITY: LayerCapacity = { 0: 1 };

/**
 * Шаги формы заявки: ограничение отключено [owner 2026-10-19]. Включить
 * обратно «первый уровень — один шаг» (как у страниц) — `{ 0: 1 }`.
 */
export const FORM_STEP_LAYER_CAPACITY: LayerCapacity = {};

/** Элементы внутри шага: колонки без ограничения (ADR-17). */
export const STEP_ELEMENT_LAYER_CAPACITY: LayerCapacity = {};

/**
 * Узлы сверх ёмкости своего уровня. orderedIds — порядок старшинства:
 * первые по порядку остаются, лишними считаются последующие.
 */
export function overflowingLayerIds(
  capacity: LayerCapacity,
  orderedIds: readonly string[],
  depths: ReadonlyMap<string, number>,
): string[] {
  const taken = new Map<number, number>();
  const overflow: string[] = [];
  for (const id of orderedIds) {
    const depth = depths.get(id);
    const limit = depth === undefined ? undefined : capacity[depth];
    if (depth === undefined || limit === undefined) {
      continue;
    }
    const count = (taken.get(depth) ?? 0) + 1;
    taken.set(depth, count);
    if (count > limit) {
      overflow.push(id);
    }
  }
  return overflow;
}

/** Есть ли на уровне место для узла movingId (сам он на уровне не считается). */
export function layerHasRoom(
  capacity: LayerCapacity,
  depths: ReadonlyMap<string, number>,
  depth: number,
  movingId: string,
): boolean {
  const limit = capacity[depth];
  if (limit === undefined) {
    return true;
  }
  let count = 0;
  for (const [id, nodeDepth] of depths) {
    if (nodeDepth === depth && id !== movingId) {
      count += 1;
    }
  }
  return count < limit;
}
