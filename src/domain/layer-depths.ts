// Общий расчёт уровней (колонок) слоёного графа — единое ядро для двух
// слоёв редактора [owner 2026-10-13]: страницы на канвасе (связи навигации,
// computeGraphDepths) и элементы внутри шага формы (правила «Сложной
// логики», computeStepElementDepths). Различия слоёв — только во входе:
// какие узлы, какие рёбра, какие явные переопределения.
//
// Уровень узла — кратчайший путь от корня; корни — узлы без входящих рёбер.
// Узлы с явным уровнем (layerDepth: перенос dnd, закрепление ADR-15) —
// фиксированные источники: их уровень не пересчитывается, но от них
// распространяется дальше по рёбрам. Чистая функция, без внешних импортов.

export type LayerEdge = { from: string; to: string };

export function computeLayerDepths(
  ids: readonly string[],
  edges: readonly LayerEdge[],
  explicitDepths: ReadonlyMap<string, number>,
): Map<string, number> {
  const idSet = new Set(ids);
  const outgoing = new Map<string, string[]>();
  const hasIncoming = new Set<string>();
  for (const { from, to } of edges) {
    // Битые рёбра (узел удалён) и петли не участвуют в уровнях.
    if (!idSet.has(from) || !idSet.has(to) || from === to) {
      continue;
    }
    const targets = outgoing.get(from) ?? [];
    targets.push(to);
    outgoing.set(from, targets);
    hasIncoming.add(to);
  }

  // BFS с релаксацией: уровень — кратчайший путь от любого корня.
  const depths = new Map<string, number>();
  const queue: string[] = [];
  for (const id of ids) {
    const explicit = explicitDepths.get(id);
    if (explicit !== undefined) {
      depths.set(id, explicit);
      queue.push(id);
    } else if (!hasIncoming.has(id)) {
      depths.set(id, 0);
      queue.push(id);
    }
  }
  while (queue.length > 0) {
    const id = queue.shift()!;
    const depth = depths.get(id)!;
    for (const next of outgoing.get(id) ?? []) {
      if (explicitDepths.has(next)) {
        continue; // явный уровень не переопределяется рёбрами
      }
      const known = depths.get(next);
      if (known === undefined || depth + 1 < known) {
        depths.set(next, depth + 1);
        queue.push(next);
      }
    }
  }

  // Замкнутый цикл без корня недостижим при связях через UI, но битые данные
  // не должны ронять раскладку: оставшиеся узлы встают на нулевой уровень.
  for (const id of ids) {
    if (!depths.has(id)) {
      depths.set(id, 0);
    }
  }
  return depths;
}

// Узлы по уровням 0..max без пропусков [owner 2026-10-16]: пустой уровень
// (например, после удаления первого шага или Главной) — пустой список, его
// место в раскладке сохраняется, и туда можно перенести узел dnd. Порядок
// внутри уровня — порядок items. Пустой вход — пустой результат.
export function groupByLayer<T>(items: readonly T[], depthOf: (item: T) => number): T[][] {
  const levels: T[][] = [];
  for (const item of items) {
    const depth = depthOf(item);
    while (levels.length <= depth) {
      levels.push([]);
    }
    levels[depth]!.push(item);
  }
  return levels;
}
