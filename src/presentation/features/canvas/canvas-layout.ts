import type { XYPosition } from '@xyflow/react';
import type { ServiceGraph } from '@domain/model/service-graph';
import { computeGraphDepths } from '@domain/graph-depths';

// Слоистый layout-движок (Epic 002, T-036; D2/D7/D12/D13): координаты не
// персистентны, колонка узла = глубина от корня (computeGraphDepths),
// вертикальный порядок внутри колонки = персистентный orderIndex.
//
// Размеры и отступы — константы, снятые с макетов docs/design-mockups
// (масштаб 100%): карточка узла 320px, колонки разнесены, внутри колонки
// узлы идут вертикальным стеком. Высота узла заранее неизвестна (зависит от
// числа элементов), поэтому стек считается по оценке высоты — те же
// константы используют компоненты узлов (nodes/*), чтобы оценка не
// расходилась с рендером.

export const CANVAS_LAYOUT = {
  /** Ширина узла Главной/Подсценария. */
  nodeWidth: 320,
  /** Ширина колонки шага внутри узла формы (D1: шаги — горизонтальные колонки). */
  formStepWidth: 280,
  /** Горизонтальный зазор между колонками канваса. */
  columnGap: 160,
  /** Вертикальный зазор между узлами внутри колонки. */
  rowGap: 56,
  /** Внутренние отступы узла. */
  nodePadding: 16,
  /** Высота шапки узла (заголовок + подпись). */
  nodeHeaderHeight: 88,
  /** Высота строки-элемента с зазором под ней. */
  elementRowHeight: 112,
  /** Высота шапки узла формы (заголовок + чип + подпись). */
  formHeaderHeight: 96,
  /** Высота шапки колонки шага (заголовок, корзина, «+»). */
  formStepHeaderHeight: 56,
} as const;

// Оценка ширины/высоты узла по содержимому графа — нужна для стека колонки.
function estimateScenarioNodeHeight(elementCount: number): number {
  const L = CANVAS_LAYOUT;
  return L.nodeHeaderHeight + elementCount * L.elementRowHeight + L.nodePadding * 2;
}

function estimateFormSize(form: ServiceGraph['applicationForms'][number]): {
  width: number;
  height: number;
} {
  const L = CANVAS_LAYOUT;
  const stepCount = Math.max(form.steps.length, 1);
  const maxStepElements = Math.max(0, ...form.steps.map((step) => step.components.length));
  return {
    width: stepCount * L.formStepWidth + (stepCount - 1) * L.nodePadding + L.nodePadding * 2,
    height:
      L.formHeaderHeight + L.formStepHeaderHeight + maxStepElements * L.elementRowHeight + L.nodePadding * 2,
  };
}

type LayoutNode = {
  id: string;
  orderIndex: number;
  width: number;
  height: number;
};

// Позиции узлов для graphToFlow (параметр positions): колонка = глубина,
// Y внутри колонки — стек по orderIndex (D13). Каждый несвязанный подграф
// раскладывается от своего корня (глубина 0, D8) — подграфы встают в одну
// колонку друг под другом, отдельного «островного» раскладщика нет.
export function computeLayout(graph: ServiceGraph): Record<string, XYPosition> {
  const depths = computeGraphDepths(graph);

  const nodes: LayoutNode[] = [];
  if (graph.homePage) {
    const home = graph.homePage;
    nodes.push({
      id: home.id,
      orderIndex: home.orderIndex,
      width: CANVAS_LAYOUT.nodeWidth,
      height: estimateScenarioNodeHeight(home.listItems.length + home.widgetCards.length),
    });
  }
  const collectScenarios = (subScenarios: ServiceGraph['subScenarios']): void => {
    for (const scenario of subScenarios) {
      nodes.push({
        id: scenario.id,
        orderIndex: scenario.orderIndex,
        width: CANVAS_LAYOUT.nodeWidth,
        height: estimateScenarioNodeHeight(scenario.listItems.length),
      });
      if (scenario.children) {
        collectScenarios(scenario.children);
      }
    }
  };
  collectScenarios(graph.subScenarios);
  for (const form of graph.applicationForms) {
    const size = estimateFormSize(form);
    nodes.push({ id: form.id, orderIndex: form.orderIndex, width: size.width, height: size.height });
  }

  // Группировка по колонкам (глубинам), порядок внутри — по orderIndex.
  const columns = new Map<number, LayoutNode[]>();
  for (const node of nodes) {
    const depth = depths.get(node.id) ?? 0;
    const column = columns.get(depth) ?? [];
    column.push(node);
    columns.set(depth, column);
  }

  const positions: Record<string, XYPosition> = {};
  let x = 0;
  const sortedDepths = [...columns.keys()].sort((left, right) => left - right);
  for (const depth of sortedDepths) {
    const column = columns.get(depth)!;
    column.sort((left, right) => left.orderIndex - right.orderIndex);
    let y = 0;
    for (const node of column) {
      positions[node.id] = { x, y };
      y += node.height + CANVAS_LAYOUT.rowGap;
    }
    const columnWidth = Math.max(...column.map((node) => node.width));
    x += columnWidth + CANVAS_LAYOUT.columnGap;
  }

  return positions;
}
