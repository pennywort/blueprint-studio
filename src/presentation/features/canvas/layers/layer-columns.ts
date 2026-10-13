// Ядро dnd по уровням (колонкам) — общее для слоёв редактора [owner
// 2026-10-13]: канвас страниц (drag узла react-flow) и шаг формы (drag
// карточки элемента). Чистые функции в локальных координатах слоя: откуда
// пришёл жест (react-flow / нативный dnd) и как рисуется подсветка — забота
// адаптера слоя; геометрия и решение «перенос / порядок» — здесь.
// Различия слоёв задаёт LayerPolicy (layer-policy.ts), а не ветвления.

import type { LayerPolicy } from './layer-policy';

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
  const columns = [...byDepth.entries()]
    .sort(([left], [right]) => left - right)
    .map(([depth, column]) => ({ depth, ...column }));
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

/** Решение по drop: перенос на другой уровень или порядок внутри своего. */
export type LayerDropDecision = { kind: 'moveToLayer'; depth: number } | { kind: 'reorder' };

// currentDepth — уровень перетаскиваемого в ЭТОМ слое; null — пришёл извне
// (другой шаг/узел): тогда это всегда перенос в колонку-кандидат.
export function resolveLayerDrop(
  currentDepth: number | null,
  candidate: LayerColumn | null,
  canMoveToLayer: boolean,
): LayerDropDecision {
  if (candidate && canMoveToLayer && candidate.depth !== currentDepth) {
    return { kind: 'moveToLayer', depth: candidate.depth };
  }
  return { kind: 'reorder' };
}
