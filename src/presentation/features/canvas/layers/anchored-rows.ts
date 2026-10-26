// Раскладка «цель напротив якоря» [owner 2026-10-13, 2026-10-16]: одно ядро
// для шага формы (якорь — вариант Select'а, цели — элементы по правилам
// «Сложной логики», ADR-16) и для канваса страниц (якорь — элемент блока,
// цели — блоки следующего уровня по связям PageLink, D9). Различия —
// параметры: размеры строк, зазор стопки целей, источник связей.
//
// Строка якоря занимает max(свою высоту, стопку целей): цели встают верхом
// вровень с якорем, а следующая строка сдвигается вниз — в контейнере якорей
// образуется вертикальный отступ. Чистые функции, в пикселях.

/** Связь «якорь → цель»; порядок связей = порядок целей в стопке. */
export type AnchorLink = { anchorId: string; targetId: string };

export type AnchorForest = {
  /** Цели якоря в порядке связей. */
  childrenOf: ReadonlyMap<string, readonly string[]>;
  /** Якорь-родитель цели. */
  parentOf: ReadonlyMap<string, string>;
};

// Лес «якорь → цели»: у цели один родитель — первая подходящая связь
// (L-I7 для правил; для страниц — первая связь по порядку элементов).
// accept отсекает связи, которые не образуют дерево (другой шаг, обратная
// связь на уровень выше и т.п.).
export function buildAnchorForest(
  links: Iterable<AnchorLink>,
  accept: (link: AnchorLink) => boolean = () => true,
): AnchorForest {
  const childrenOf = new Map<string, string[]>();
  const parentOf = new Map<string, string>();
  for (const link of links) {
    if (parentOf.has(link.targetId) || !accept(link)) {
      continue;
    }
    parentOf.set(link.targetId, link.anchorId);
    childrenOf.set(link.anchorId, [...(childrenOf.get(link.anchorId) ?? []), link.targetId]);
  }
  return { childrenOf, parentOf };
}

/** Строка якоря в контейнере: естественные (без отступов) верх и высота. */
export type AnchorRow<T> = { top: number; height: number; children: readonly T[] };

export type AnchoredRowsLayout<T> = {
  /** Накопленный сдвиг каждой строки вниз относительно естественного положения. */
  shifts: number[];
  /** Верх каждой цели относительно верха контейнера. */
  childTops: Map<T, number>;
  /** Высота контейнера с отступами. */
  height: number;
  /** Полная высота: контейнер или стопки целей, что ниже. */
  extent: number;
};

// rows — по порядку сверху вниз; naturalHeight — высота контейнера без
// отступов; extentOf — полная высота поддерева цели; childGap — зазор между
// целями в стопке и до целей следующей строки.
export function layoutAnchoredRows<T>(
  rows: readonly AnchorRow<T>[],
  naturalHeight: number,
  extentOf: (child: T) => number,
  childGap: number,
): AnchoredRowsLayout<T> {
  const shifts: number[] = [];
  const childTops = new Map<T, number>();
  let shift = 0;
  let bottom = 0;
  // Ниже этой границы должны начинаться цели следующих строк.
  let stackEnd = Number.NEGATIVE_INFINITY;
  for (const row of rows) {
    // Строка не выше стопки целей предыдущих строк (как строка варианта в
    // шаге формы: flex-строка = max(вариант, стопка)).
    let top = row.top + shift;
    if (top < stackEnd + childGap) {
      shift += stackEnd + childGap - top;
      top = stackEnd + childGap;
    }
    shifts.push(shift);
    let y = top;
    for (const child of row.children) {
      childTops.set(child, y);
      stackEnd = y + extentOf(child);
      y = stackEnd + childGap;
    }
    bottom = Math.max(bottom, top + row.height, stackEnd);
  }
  const height = naturalHeight + shift;
  return { shifts, childTops, height, extent: Math.max(height, bottom) };
}
