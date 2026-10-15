// Укладка полос слоя по рядам [owner 2026-10-13]: полоса — дерево элементов
// шага, занимающее колонки [start, end]. Полоса встаёт в последний ряд, если
// её колонки там свободны, иначе — в новый ряд ниже: независимые соседи идут
// по горизонтали, а не лесенкой вниз. В ряды выше полоса не возвращается
// (раньше — first-fit): порядок на экране = порядок элементов шага, и вставка
// dnd по якорю ложится туда, где полоса-индикатор (N2). Чистая функция, в
// единицах колонок.

export type LayerBand<T> = { start: number; end: number; item: T };

export function packLayerBands<T>(bands: readonly LayerBand<T>[]): LayerBand<T>[][] {
  const rows: LayerBand<T>[][] = [];
  for (const band of bands) {
    const row = rows.at(-1);
    if (row?.every((placed) => band.end < placed.start || band.start > placed.end)) {
      row.push(band);
    } else {
      rows.push([band]);
    }
  }
  // Внутри ряда — слева направо: отступы считаются от предыдущей полосы.
  return rows.map((row) => [...row].sort((left, right) => left.start - right.start));
}
