// Ядро dnd по уровням (колонкам) — общее для слоёв редактора [owner
// 2026-10-13]: канвас страниц (drag узла react-flow) и шаг формы (drag
// карточки элемента). Чистые функции в локальных координатах слоя: откуда
// пришёл жест (react-flow / нативный dnd) и как рисуется подсветка — забота
// адаптера слоя; геометрия и решение «перенос / порядок» — здесь.
// Различия слоёв задаёт LayerPolicy (layer-policy.ts), а не ветвления.

import { layerHasRoom } from '@domain/layer-capacity';
import { canMoveToLayer, type LayerPolicy } from './layer-policy';

/** Колонка слоя: уровень и её горизонтальная полоса в координатах слоя. */
export type LayerColumn = { depth: number; x: number; width: number };

/** Занятая колонка: уровень и полоса конкретного узла/карточки. */
export type LayerItemBox = { depth: number; x: number; width: number };

// Колонки слоя по занятым полосам: X — минимальный, ширина — по самому
// широкому. Справа от последней — пустой слот «следующий уровень», если
// политика разрешает новый уровень (F6: на пустой уровень переносится первым).
export function buildLayerColumns(items: readonly LayerItemBox[], policy: LayerPolicy): LayerColumn[] {
  const byDepth = new Map<number, { x: number; width: number }>();
  for (const item of items) {
    const column = byDepth.get(item.depth);
    if (column) {
      column.x = Math.min(column.x, item.x);
      column.width = Math.max(column.width, item.width);
    } else {
      byDepth.set(item.depth, { x: item.x, width: item.width });
    }
  }
  const occupied = [...byDepth.entries()]
    .sort(([left], [right]) => left - right)
    .map(([depth, column]) => ({ depth, ...column }));
  // Пустые уровни между 0 и последним занятым держат место в раскладке
  // (groupByLayer, [owner 2026-10-16]) — это тоже колонки-кандидаты.
  const pitch = policy.columnWidth + policy.columnGap;
  const columns: LayerColumn[] = [];
  for (const column of occupied) {
    const previous = columns[columns.length - 1];
    for (let depth = previous ? previous.depth + 1 : 0; depth < column.depth; depth += 1) {
      const x = previous
        ? columns[columns.length - 1]!.x + columns[columns.length - 1]!.width + policy.columnGap
        : column.x - (column.depth - depth) * pitch;
      columns.push({ depth, x, width: policy.columnWidth });
    }
    columns.push(column);
  }
  const last = columns[columns.length - 1];
  if (policy.allowNewLayer) {
    columns.push(
      last
        ? {
            depth: last.depth + 1,
            x: last.x + last.width + policy.columnGap,
            width: policy.columnWidth,
          }
        : { depth: 0, x: 0, width: policy.columnWidth },
    );
  }
  return columns;
}

// Регулярная сетка колонок (шаг формы): ширина колонки фиксирована, уровень
// d занимает [d * (ширина + зазор), +ширина). maxDepth — самый глубокий
// занятый уровень (-1 — пустой слой).
export function gridLayerColumns(maxDepth: number, policy: LayerPolicy): LayerColumn[] {
  const columns: LayerColumn[] = [];
  const last = policy.allowNewLayer ? maxDepth + 1 : Math.max(maxDepth, 0);
  for (let depth = 0; depth <= last; depth += 1) {
    columns.push({ depth, x: depth * (policy.columnWidth + policy.columnGap), width: policy.columnWidth });
  }
  return columns;
}

/** Ближайшая к X колонка (по центру полосы); null — колонок нет. */
export function nearestLayerColumn(columns: readonly LayerColumn[], x: number): LayerColumn | null {
  let best: LayerColumn | null = null;
  for (const column of columns) {
    const distance = Math.abs(x - (column.x + column.width / 2));
    if (best === null || distance < Math.abs(x - (best.x + best.width / 2))) {
      best = column;
    }
  }
  return best;
}

/**
 * Решение по drop: перенос на другой уровень, порядок внутри своего или
 * запрет — уровень-кандидат заполнен (ёмкость, [owner 2026-10-16]).
 */
export type LayerDropDecision =
  { kind: 'moveToLayer'; depth: number } | { kind: 'reorder' } | { kind: 'blocked' };

/** Перетаскиваемое: id, вид и уровень в ЭТОМ слое (null — пришло извне, другой шаг/узел). */
export type LayerDragSubject = { id: string; kind: string; depth: number | null };

// Решение по жесту — целиком по политике слоя: что переносится между
// уровнями (movableKinds) и сколько узлов вмещает уровень (capacity —
// то же доменное правило, что проверяет граф). depths — текущие уровни слоя.
export function resolveLayerDrop(
  policy: LayerPolicy,
  subject: LayerDragSubject,
  candidate: LayerColumn | null,
  depths: ReadonlyMap<string, number>,
): LayerDropDecision {
  if (!candidate || candidate.depth === subject.depth || !canMoveToLayer(policy, subject.kind)) {
    return { kind: 'reorder' };
  }
  return layerHasRoom(policy.capacity, depths, candidate.depth, subject.id)
    ? { kind: 'moveToLayer', depth: candidate.depth }
    : { kind: 'blocked' };
}
