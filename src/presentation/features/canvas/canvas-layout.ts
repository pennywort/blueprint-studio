import type { XYPosition } from '@xyflow/react';
import type { ServiceGraph } from '@domain/model/service-graph';
import type { FormStep } from '@domain/model/scenario';
import { computeGraphDepths } from '@domain/graph-depths';
import { walkSubScenarios } from '@domain/graph-walk';
import { computeStepElementDepths } from '@domain/step-element-depths';
import { computeFormStepDepths } from '@domain/form-step-depths';

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
  /** Ширина колонки шагов внутри узла формы (колонка — уровень шагов, [owner 2026-10-14]). */
  formStepWidth: 280,
  /** Зазор между колонками шагов и между шагами одного уровня в узле формы. */
  formStepGap: 16,
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

// Раскладка элементов внутри шага формы [owner 2026-10-13; макеты
// «layouting …»]: тот же слоёный принцип, что у страниц (колонка = уровень
// по правилам «Сложной логики»), но карточки и зазоры заметно меньше.
// Цель правила стоит напротив своего варианта-источника; шаг растёт по
// содержимому, скролла нет.
export const FORM_STEP_LAYOUT = {
  /** Ширина колонки (карточки элемента/варианта) внутри шага. */
  elementWidth: 240,
  /** Горизонтальный зазор между колонками шага. */
  columnGap: 40,
  /** Вертикальный зазор между карточками в колонке. */
  rowGap: 12,
  /** Внутреннее поле шага вокруг колонок. */
  stepPadding: 12,
  /** Оценка высоты карточки элемента — только для первого рендера (N12). */
  elementHeight: 104,
  /** Оценка высоты карточки варианта Select'а. */
  optionHeight: 64,
  /**
   * Высота точки входа/выхода ребра правила от верха карточки [owner 2026-10-13]:
   * source-handle варианта и якорь цели на одной высоте — цель стоит верхом
   * вровень с вариантом, ребро идёт прямой горизонталью без «ступеньки».
   */
  logicHandleTop: 36,
} as const;

// Оценка ширины/высоты узла по содержимому графа — нужна для стека колонки.
function estimateScenarioNodeHeight(elementCount: number): number {
  const L = CANVAS_LAYOUT;
  return L.nodeHeaderHeight + elementCount * L.elementRowHeight + L.nodePadding * 2;
}

// Высота шага по раскладке FormStepLayers [owner 2026-10-13]: деревья
// корней друг под другом; строка варианта — по большему из карточки
// варианта и стопки зависящих от него элементов (цель напротив варианта).
function estimateStepHeight(step: FormStep, logicRules: ServiceGraph['logicRules']): number {
  const S = FORM_STEP_LAYOUT;
  const ids = new Set<string>(step.elements.map((component) => component.id));
  const dependents = new Map<string, string[]>();
  const hasParent = new Set<string>();
  for (const rule of logicRules) {
    if (rule.condition.kind !== 'optionSelected' || hasParent.has(rule.targetElementId)) {
      continue;
    }
    if (!ids.has(rule.sourceElementId) || !ids.has(rule.targetElementId)) {
      continue;
    }
    const key = `${rule.sourceElementId}:${rule.condition.optionId}`;
    dependents.set(key, [...(dependents.get(key) ?? []), rule.targetElementId]);
    hasParent.add(rule.targetElementId);
  }
  const byId = new Map(step.elements.map((component) => [component.id as string, component]));
  const stack = (list: readonly string[], seen: ReadonlySet<string>): number =>
    list.reduce((sum, id, index) => sum + (index > 0 ? S.rowGap : 0) + tree(id, seen), 0);
  const tree = (id: string, seen: ReadonlySet<string>): number => {
    const component = byId.get(id);
    if (!component || seen.has(id)) {
      return 0;
    }
    const inner = new Set(seen).add(id);
    let height = S.elementHeight;
    // Варианты Select'а в шаге — карточки всегда (переходы на шаги, [owner 2026-10-14]).
    if (component.kind === 'selectList') {
      for (const option of component.options) {
        const children = dependents.get(`${id}:${option.value}`) ?? [];
        height += S.rowGap + Math.max(S.optionHeight, stack(children, inner));
      }
    }
    return height;
  };
  return stack(
    step.elements.map((component) => component.id as string).filter((id) => !hasParent.has(id)),
    new Set(),
  );
}

function estimateFormSize(
  form: ServiceGraph['applicationForms'][number],
  graph: Pick<ServiceGraph, 'logicRules' | 'stepTransitions'>,
): {
  width: number;
  height: number;
} {
  const L = CANVAS_LAYOUT;
  const S = FORM_STEP_LAYOUT;
  // Шаги — колонки по уровням (form-step-depths), шаги одного уровня — друг
  // под другом [owner 2026-10-14]; шаг — колонки по уровням элементов, высота —
  // по дереву строк (estimateStepHeight). Только первый рендер: дальше
  // раскладка берёт измеренные размеры (N12).
  const steps: FormStep[] = form.steps.length > 0 ? form.steps : [{ id: '' as FormStep['id'], elements: [] }];
  const stepDepths = computeFormStepDepths({ steps }, graph.stepTransitions);
  const columns = new Map<number, { width: number; height: number }>();
  for (const step of steps) {
    const depths = computeStepElementDepths(step, graph.logicRules);
    const elementColumns = Math.max(1, ...[...depths.values()].map((depth) => depth + 1));
    const stepWidth = Math.max(L.formStepWidth, elementColumns * (S.elementWidth + S.columnGap));
    const stepHeight = L.formStepHeaderHeight + estimateStepHeight(step, graph.logicRules);
    const depth = stepDepths.get(step.id) ?? 0;
    const column = columns.get(depth);
    columns.set(
      depth,
      column
        ? { width: Math.max(column.width, stepWidth), height: column.height + L.formStepGap + stepHeight }
        : { width: stepWidth, height: stepHeight },
    );
  }
  let width = L.nodePadding * 2;
  let height = 0;
  for (const column of columns.values()) {
    width += column.width + L.formStepGap;
    height = Math.max(height, column.height);
  }
  return {
    width,
    height: L.formHeaderHeight + height + L.nodePadding * 2,
  };
}

type LayoutNode = {
  id: string;
  orderIndex: number;
  width: number;
  height: number;
};

/** Фактические размеры узлов, измеренные react-flow после рендера. */
export type MeasuredNodeSizes = Readonly<Record<string, { width: number; height: number }>>;

// Позиции узлов для graphToFlow (параметр positions): колонка = глубина,
// Y внутри колонки — стек по orderIndex (D13). Каждый несвязанный подграф
// раскладывается от своего корня (глубина 0, D8) — подграфы встают в одну
// колонку друг под другом, отдельного «островного» раскладщика нет.
// measured — фактические размеры узлов (N12): оценка не учитывает реальную
// высоту строк, из-за чего зазоры в колонке «плыли»;
// оценка остаётся только для ещё не измеренных узлов (первый рендер).
export function computeLayout(graph: ServiceGraph, measured?: MeasuredNodeSizes): Record<string, XYPosition> {
  const depths = computeGraphDepths(graph);

  const nodes: LayoutNode[] = [];
  if (graph.homePage) {
    const home = graph.homePage;
    nodes.push({
      id: home.id,
      orderIndex: home.orderIndex,
      width: CANVAS_LAYOUT.nodeWidth,
      height: estimateScenarioNodeHeight(home.elements.length),
    });
  }
  for (const scenario of walkSubScenarios(graph.subScenarios)) {
    nodes.push({
      id: scenario.id,
      orderIndex: scenario.orderIndex,
      width: CANVAS_LAYOUT.nodeWidth,
      height: estimateScenarioNodeHeight(scenario.elements.length),
    });
  }
  for (const form of graph.applicationForms) {
    const size = estimateFormSize(form, graph);
    nodes.push({ id: form.id, orderIndex: form.orderIndex, width: size.width, height: size.height });
  }

  for (const node of nodes) {
    const size = measured?.[node.id];
    if (size) {
      node.width = size.width;
      node.height = size.height;
    }
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
