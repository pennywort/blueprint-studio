// Укладка полос слоя по рядам [owner 2026-10-13]: полоса — дерево элементов
// шага, занимающее колонки [start, end]. Полоса встаёт в первый сверху ряд,
// где её колонки свободны (first-fit), — независимые элементы в разных
// колонках идут по горизонтали, а не лесенкой вниз. Порядок полос — порядок
// входа (порядок элементов шага). Чистая функция, в единицах колонок.

export type LayerBand<T> = { start: number; end: number; item: T };

export function packLayerBands<T>(bands: readonly LayerBand<T>[]): LayerBand<T>[][] {
  const rows: LayerBand<T>[][] = [];
  for (const band of bands) {
    const row = rows.find((candidate) =>
      candidate.every((placed) => band.end < placed.start || band.start > placed.end),
    );
    if (row) {
      row.push(band);
    } else {
      rows.push([band]);
    }
  }
  // Внутри ряда — слева направо: отступы считаются от предыдущей полосы.
  return rows.map((row) => [...row].sort((left, right) => left.start - right.start));
}
