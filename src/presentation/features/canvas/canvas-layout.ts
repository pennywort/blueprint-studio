import type { XYPosition } from '@xyflow/react';
import type { ServiceGraph } from '@domain/model/service-graph';
import type { FormStep } from '@domain/model/scenario';
import { computeGraphDepths } from '@domain/graph-depths';
import { walkSubScenarios } from '@domain/graph-walk';
import { computeStepElementDepths } from '@domain/step-element-depths';
import { computeFormStepDepths } from '@domain/form-step-depths';
import { groupByLayer } from '@domain/layer-depths';
import { elementVariants } from '@domain/element-kinds';
import { logicRulesToAnchorLinks, logicSourceHandleId } from './graph-flow-adapter';
import {
  buildAnchorForest,
  layoutAnchoredRows,
  type AnchorRow,
  type AnchoredRowsLayout,
} from './layers/anchored-rows';

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
  /**
   * Ширина колонки шагов внутри узла формы (колонка — уровень шагов, [owner 2026-10-14]) —
   * внешняя ширина шага в одну колонку: карточка 240 + поле шага 24 с обеих
   * сторон (FORM_STEP_LAYOUT), отступы у краёв равные, как на странице [owner 2026-10-16].
   */
  formStepWidth: 288,
  /** Отступ карточек вариантов Select'а слева — видно, чьи они (страница и шаг формы, [owner 2026-10-16]). */
  optionIndent: 24,
  /**
   * Зазор между колонками шагов и между шагами одного уровня в узле формы;
   * вмещает полосу вставки с точками и отступом (DropBar, [owner 2026-10-15])
   * и вертикальный участок перехода между шагами посередине — не на границе
   * шага (EditorEdge, [owner 2026-10-15]).
   */
  formStepGap: 40,
  /** Горизонтальный зазор между колонками канваса. */
  columnGap: 160,
  /** Вертикальный зазор между узлами внутри колонки. */
  rowGap: 56,
  /** Внутренние отступы узла. */
  nodePadding: 16,
  /** Зазор между шапкой узла и содержимым. */
  nodeContentGap: 12,
  /**
   * Поле вокруг шагов формы (от шапки и краёв узла): полоса вставки у
   * крайнего шага — посередине поля, внутри узла (DropBar, [owner 2026-10-16]).
   */
  formStepsEdge: 24,
  /** Высота пустого уровня шагов — места, куда можно перенести шаг ([owner 2026-10-16]). */
  formEmptyLevelHeight: 96,
  /** Высота шапки узла (заголовок + подпись). */
  nodeHeaderHeight: 88,
  /** Высота строки-элемента с зазором под ней. */
  elementRowHeight: 124,
  /** Высота шапки узла формы (заголовок + чип + подпись). */
  formHeaderHeight: 96,
  /** Высота шапки колонки шага (заголовок, корзина, «+») с зазором до карточек. */
  formStepHeaderHeight: 68,
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
  /**
   * Вертикальный зазор между карточками в колонке и поле шага вокруг колонок:
   * вмещают полосу вставки с точками 12px и отступом от карточек
   * (DropBar, [owner 2026-10-15]).
   */
  rowGap: 24,
  /** Зазор Select → первый вариант и между вариантами (общий для страницы и шага, [owner 2026-10-16]). */
  optionGap: 8,
  stepPadding: 24,
  /** Оценка высоты карточки элемента — только для первого рендера (N12). */
  elementHeight: 104,
  /** Оценка высоты карточки варианта Select'а. */
  optionHeight: 44,
  /**
   * Высота точки входа/выхода ребра правила от верха карточки [owner 2026-10-13]:
   * source-handle варианта и якорь цели на одной высоте — цель стоит верхом
   * вровень с вариантом, ребро идёт прямой горизонталью без «ступеньки».
   * Равна половине высоты однострочного варианта (optionHeight) — handle по
   * центру карточки, когда чипа значения нет [owner 2026-10-16].
   */
  logicHandleTop: 22,
} as const;

// Оценка ширины/высоты узла по содержимому графа — нужна для стека колонки.
function estimateScenarioNodeHeight(elementCount: number): number {
  const L = CANVAS_LAYOUT;
  return L.nodeHeaderHeight + elementCount * L.elementRowHeight + L.nodePadding * 2;
}

// Высота шага по раскладке FormStepLayers [owner 2026-10-13]: деревья
// корней друг под другом; строка варианта — по большему из карточки
// варианта и стопки зависящих от него элементов — общее ядро «цель напротив
// якоря» (layers/anchored-rows, якорь — вариант).
function estimateStepHeight(step: FormStep, logicRules: ServiceGraph['logicRules']): number {
  const S = FORM_STEP_LAYOUT;
  const ids = new Set<string>(step.elements.map((component) => component.id));
  const { childrenOf, parentOf } = buildAnchorForest(logicRulesToAnchorLinks(logicRules), (link) =>
    ids.has(link.targetId),
  );
  const byId = new Map(step.elements.map((component) => [component.id as string, component]));
  const stack = (list: readonly string[], seen: ReadonlySet<string>): number =>
    list.reduce((sum, id, index) => sum + (index > 0 ? S.rowGap : 0) + tree(id, seen), 0);
  const tree = (id: string, seen: ReadonlySet<string>): number => {
    const component = byId.get(id);
    if (!component || seen.has(id)) {
      return 0;
    }
    const inner = new Set(seen).add(id);
    // Строки элемента: карточка, затем варианты элемента выбора — карточки
    // всегда (переходы на шаги, [owner 2026-10-14]).
    const rows: AnchorRow<string>[] = [{ top: 0, height: S.elementHeight, children: [] }];
    for (const variant of elementVariants(component)) {
      const previous = rows.at(-1)!;
      rows.push({
        top: previous.top + previous.height + S.optionGap,
        height: S.optionHeight,
        children: childrenOf.get(logicSourceHandleId(id, variant.id)) ?? [],
      });
    }
    const last = rows.at(-1)!;
    return layoutAnchoredRows(rows, last.top + last.height, (child) => tree(child, inner), S.rowGap).extent;
  };
  return stack(
    step.elements.map((component) => component.id as string).filter((id) => !parentOf.has(id)),
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
  // Уровни 0..max без пропусков — пустой уровень держит место (как в FormNode).
  const columns = groupByLayer(steps, (step) => stepDepths.get(step.id) ?? 0).map((level) => {
    let width: number = L.formStepWidth;
    let height: number = level.length > 0 ? -L.formStepGap : L.formEmptyLevelHeight;
    for (const step of level) {
      const depths = computeStepElementDepths(step, graph.logicRules);
      const elementColumns = Math.max(1, ...[...depths.values()].map((depth) => depth + 1));
      width = Math.max(
        width,
        elementColumns * (S.elementWidth + S.columnGap) - S.columnGap + 2 * S.stepPadding,
      );
      height += L.formStepGap + L.formStepHeaderHeight + estimateStepHeight(step, graph.logicRules);
    }
    return { width, height };
  });
  // Поле ряда шагов (formStepsEdge) слева, сверху и снизу — как в FormNode.
  let width = L.nodePadding + L.formStepsEdge;
  let height = 0;
  for (const column of columns) {
    width += column.width + L.formStepGap;
    height = Math.max(height, column.height);
  }
  return {
    width,
    height: L.formHeaderHeight + height + L.formStepsEdge * 2 - L.nodeContentGap + L.nodePadding,
  };
}

type LayoutNode = {
  id: string;
  orderIndex: number;
  depth: number;
  width: number;
  /** Высота без отступов строк (естественная). */
  height: number;
  /** Элементы-якоря связей (у форм — нет: строк шагов канвас не знает). */
  elementIds: readonly string[];
};

/** Фактические размеры узлов, измеренные react-flow после рендера. */
export type MeasuredNodeSizes = Readonly<Record<string, { width: number; height: number }>>;

/**
 * Строки элементов в узлах страниц, измеренные после рендера: верх (от верха
 * узла) и высота — без отступов строк (rowOffset).
 */
export type MeasuredElementRows = Readonly<Record<string, { top: number; height: number }>>;

/** Результат раскладки канваса: позиции узлов и отступы над строками элементов. */
export type CanvasLayout = {
  positions: Record<string, XYPosition>;
  rowOffsets: Record<string, number>;
};

// Раскладка канваса для graphToFlow: колонка = глубина (D7/D12); блок-цель
// связи стоит верхом вровень со своим элементом-источником, строка элемента
// растёт до стопки его целей — общее ядро с шагом формы (layers/anchored-rows,
// [owner 2026-10-16], макет «логика связей и выравнивание элемента при
// нескольких блоках в соседнем уровне»). Родитель блока — первая связь по
// порядку элементов, только на соседний уровень (дерево без циклов).
// Корни (Главная, несвязанные блоки и подграфы, D8) — по глубине и
// orderIndex (D13), каждый ниже уже занятых колонок своего дерева.
// measured / rows — фактические размеры (N12) без отступов строк;
// оценка — только для ещё не измеренного (первый рендер).
export function computeLayout(
  graph: ServiceGraph,
  measured?: MeasuredNodeSizes,
  rows?: MeasuredElementRows,
): CanvasLayout {
  const L = CANVAS_LAYOUT;
  const depths = computeGraphDepths(graph);
  const depthOf = (id: string): number => depths.get(id) ?? 0;

  const nodes: LayoutNode[] = [];
  const pages = [...(graph.homePage ? [graph.homePage] : []), ...walkSubScenarios(graph.subScenarios)];
  for (const page of pages) {
    nodes.push({
      id: page.id,
      orderIndex: page.orderIndex,
      depth: depthOf(page.id),
      width: L.nodeWidth,
      height: estimateScenarioNodeHeight(page.elements.length),
      elementIds: page.elements.map((element) => element.id),
    });
  }
  for (const form of graph.applicationForms) {
    // Оценка — только для ещё не измеренной формы (R-PERF-5): она обходит
    // шаги и правила логики и была половиной стоимости раскладки на команду.
    const size = measured?.[form.id] ?? estimateFormSize(form, graph);
    nodes.push({
      id: form.id,
      orderIndex: form.orderIndex,
      depth: depthOf(form.id),
      width: size.width,
      height: size.height,
      elementIds: [],
    });
  }
  for (const node of nodes) {
    const size = measured?.[node.id];
    if (size) {
      node.width = size.width;
      node.height = size.height;
    }
  }
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const sorted = [...nodes].sort(
    (left, right) => left.depth - right.depth || left.orderIndex - right.orderIndex,
  );

  // Лес «элемент → блоки-цели»: связи по порядку блоков и их элементов.
  const ownerOf = new Map<string, LayoutNode>();
  for (const node of sorted) {
    for (const elementId of node.elementIds) {
      ownerOf.set(elementId, node);
    }
  }
  const linksByElement = new Map<string, ServiceGraph['links'][number][]>();
  for (const link of graph.links) {
    linksByElement.set(link.sourceElementId, [...(linksByElement.get(link.sourceElementId) ?? []), link]);
  }
  const { childrenOf, parentOf } = buildAnchorForest(
    sorted.flatMap((node) =>
      node.elementIds.flatMap((elementId) =>
        (linksByElement.get(elementId) ?? []).map((link) => ({
          anchorId: elementId,
          targetId: link.targetId,
        })),
      ),
    ),
    (link) => {
      const target = byId.get(link.targetId);
      return target !== undefined && target.depth === ownerOf.get(link.anchorId)!.depth + 1;
    },
  );

  // Строки элементов узла: замер или оценка по константам строки.
  const rowsOf = (node: LayoutNode): AnchorRow<string>[] =>
    node.elementIds.map((elementId, index) => ({
      top: rows?.[elementId]?.top ?? L.nodePadding + L.nodeHeaderHeight + index * L.elementRowHeight,
      height: rows?.[elementId]?.height ?? L.elementRowHeight,
      children: childrenOf.get(elementId) ?? [],
    }));
  const layouts = new Map<string, AnchoredRowsLayout<string>>();
  const layoutOf = (id: string): AnchoredRowsLayout<string> => {
    let result = layouts.get(id);
    if (!result) {
      const node = byId.get(id)!;
      result = layoutAnchoredRows(rowsOf(node), node.height, (child) => layoutOf(child).extent, L.rowGap);
      layouts.set(id, result);
    }
    return result;
  };

  // X колонок — по самой широкой карточке уровня (пустой уровень держит место).
  const columnX: number[] = [];
  let x = 0;
  for (const column of groupByLayer(sorted, (node) => node.depth)) {
    columnX.push(x);
    x += (column.length > 0 ? Math.max(...column.map((node) => node.width)) : L.nodeWidth) + L.columnGap;
  }

  const positions: Record<string, XYPosition> = {};
  const rowOffsets: Record<string, number> = {};
  // Низ занятой части каждой колонки — следующий корень встаёт ниже.
  const columnBottom: number[] = [];
  const place = (id: string, y: number): void => {
    const node = byId.get(id)!;
    const layout = layoutOf(id);
    positions[id] = { x: columnX[node.depth] ?? 0, y };
    columnBottom[node.depth] = Math.max(columnBottom[node.depth] ?? 0, y + layout.height + L.rowGap);
    node.elementIds.forEach((elementId, index) => {
      const offset = layout.shifts[index]! - (layout.shifts[index - 1] ?? 0);
      if (offset > 0) {
        rowOffsets[elementId] = offset;
      }
    });
    for (const [child, top] of layout.childTops) {
      place(child, y + top);
    }
  };
  const subtreeDepths = (id: string): number[] => [
    byId.get(id)!.depth,
    ...byId
      .get(id)!
      .elementIds.flatMap((elementId) => (childrenOf.get(elementId) ?? []).flatMap(subtreeDepths)),
  ];
  for (const root of sorted) {
    if (!parentOf.has(root.id)) {
      place(root.id, Math.max(0, ...subtreeDepths(root.id).map((depth) => columnBottom[depth] ?? 0)));
    }
  }

  return { positions, rowOffsets };
}
