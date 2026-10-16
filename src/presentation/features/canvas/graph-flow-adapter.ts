import type { Connection, Edge, Node, XYPosition } from '@xyflow/react';
import type { ServiceGraph } from '@domain/model/service-graph';
import type { ListItem, WidgetCard } from '@domain/model/scenario';
import type { FormComponent } from '@domain/model/form-components';
import { DEFAULT_COMMENT_AUDIENCE, type CanvasElement } from '@domain/model/canvas-element';
import { PageLinkTargetIdSchema, type PageLinkTargetId } from '@domain/model/page-link';
import { toElementId, toPageEntityId, type ElementId, type PageEntityId } from '@domain/model/ids';
import { computeGraphDepths } from '@domain/graph-depths';
import { walkSubScenarios } from '@domain/graph-walk';
import { computeStepElementDepths } from '@domain/step-element-depths';
import { computeFormStepDepths } from '@domain/form-step-depths';
import { evaluateVisibility } from '@domain/logic-visibility';
import { canBeLogicSource, isCommentElement, isPageElement, kindRules } from '@domain/element-kinds';
import { containerCapabilities, type ContainerCapabilities } from '@domain/container-capabilities';
import {
  ELEMENT_KIND_LABELS,
  NODE_KIND_LABELS,
  NODE_SUBTITLES,
  formStepLabel,
  navigationLevelLabel,
} from '@presentation/labels/editor-labels';
import { EDITOR_EDGE_TYPE } from './canvas-edges';

// Адаптер graph ↔ flow (Epic 002, T-030) — граница domain ↔ react-flow
// (архитектурный принцип 4 декомпозиции): домен не знает о react-flow,
// react-flow не знает о домене; мапперы — единственная точка контакта.
// Чистые функции без состояния; типы @xyflow/react допустимы здесь
// (presentation-слой), но не в domain/application.

// Типы узлов — ключи реестра nodeTypes кастомных узлов (T-031).
export type CanvasNodeType = 'home' | 'subScenario' | 'form';

// Handles «Сложной логики» (T-037/T-066): source-handle на строке option'а
// Select'а-источника, target-handle на левом краю карточки элемента-цели.
// Id кодируют элемент (и option), чтобы onConnect восстановил поля правила
// без поиска по DOM. ElementId двоеточий не содержит — разделитель безопасен.
export const LOGIC_SOURCE_HANDLE_PREFIX = 'logic-src:';
export const LOGIC_TARGET_HANDLE_PREFIX = 'logic-tgt:';
// Якорь входа ребра правила в цель: только для отрисовки (не принимает
// связь) — на высоте logicHandleTop, напротив source-handle варианта.
export const LOGIC_ANCHOR_HANDLE_PREFIX = 'logic-anchor:';

export const logicSourceHandleId = (elementId: string, optionId: string): string =>
  `${LOGIC_SOURCE_HANDLE_PREFIX}${elementId}:${optionId}`;

export const logicTargetHandleId = (elementId: string): string => `${LOGIC_TARGET_HANDLE_PREFIX}${elementId}`;

export const logicAnchorHandleId = (elementId: string): string => `${LOGIC_ANCHOR_HANDLE_PREFIX}${elementId}`;

// Переход между шагами формы [owner 2026-10-14]: target-handle во весь шаг
// (принимает связь, пока шаг — допустимая цель). Источник перехода —
// source-handle элемента (id = id элемента, D9) или варианта Select'а
// (logicSourceHandleId): тот же жест, цель задаёт смысл связи.
export const STEP_TARGET_HANDLE_PREFIX = 'step-tgt:';

export const stepTargetHandleId = (stepId: string): string => `${STEP_TARGET_HANDLE_PREFIX}${stepId}`;

export function parseStepTargetHandle(handle: string): string | null {
  return handle.startsWith(STEP_TARGET_HANDLE_PREFIX) ? handle.slice(STEP_TARGET_HANDLE_PREFIX.length) : null;
}

export function parseLogicSourceHandle(handle: string): { elementId: string; optionId: string } | null {
  if (!handle.startsWith(LOGIC_SOURCE_HANDLE_PREFIX)) {
    return null;
  }
  const rest = handle.slice(LOGIC_SOURCE_HANDLE_PREFIX.length);
  const separator = rest.indexOf(':');
  if (separator < 0) {
    return null;
  }
  return { elementId: rest.slice(0, separator), optionId: rest.slice(separator + 1) };
}

export function parseLogicTargetHandle(handle: string): string | null {
  return handle.startsWith(LOGIC_TARGET_HANDLE_PREFIX)
    ? handle.slice(LOGIC_TARGET_HANDLE_PREFIX.length)
    : null;
}

// Строка-элемент внутри узла (ElementCard, T-031): id — одновременно
// source-handle связи (D9).
export type CanvasElementData = {
  id: string;
  /** Основной текст карточки. */
  title: string;
  /** Дополнительный текст (вторая строка). */
  secondaryText?: string;
  /** Подпись чипа типа («List item», «Text field»…). */
  kindLabel: string;
  /**
   * «Сложная логика» (T-037): поле присутствует у Select'а — потенциального
   * источника правил (L5). enabled — режим включён (варианты — источники
   * правил); options — строки option'ов для рендера с handle-id: в шаге
   * формы есть всегда — вариант — источник перехода на шаг [owner 2026-10-14].
   */
  complexLogic?: {
    enabled: boolean;
    options: ReadonlyArray<{ handleId: string; label: string; value: string; isDefault: boolean }>;
  };
  /**
   * Колонка элемента внутри шага формы (step-element-depths, [owner
   * 2026-10-13]); у элементов страниц не задаётся.
   */
  layerDepth?: number;
  /**
   * Option-handle варианта-источника правила, от которого зависит элемент:
   * раскладка шага ставит элемент напротив этого варианта (L-I7 — источник один).
   */
  logicParentHandleId?: string;
  /** На элемент есть входящие правила видимости — индикатор зависимости (L-Q1). */
  hasIncomingLogic?: boolean;
  /**
   * Элемент скрыт в предпросмотре по правилам видимости при пустом состоянии
   * формы (evaluateVisibility, T-062): цель с правилами скрыта по умолчанию
   * (L3). Бейдж на карточке — демонстрация семантики до появления /preview.
   */
  hiddenByLogic?: boolean;
  /**
   * Карточка может быть целью правил «Сложной логики» — target-handle на
   * левом краю. Только элементы шагов форм (источник — Select того же шага,
   * L-I5), любого вида [owner 2026-10-13]; у элементов страниц handle не
   * рисуется — соединить его доменно невозможно, лишняя точка путает (N5).
   */
  logicTarget: boolean;
  /**
   * Комментарий-часть элемента (поле `comment`, US-05): показывается
   * голубым блоком под карточкой с бейджем адресата [owner 2026-10-15].
   */
  note?: { text: string; audience: string };
  /**
   * Карточка — комментарий-элемент (kind 'comment'): голубая карточка с
   * текстом (title) и бейджем адресата, без чипов, связей и логики.
   */
  commentAudience?: string;
  // Выделение, цель связи, нарушения и обработчики — не в data (ревью A4,
  // R2): карточка читает их из canvas-interaction (стор + контекст действий).
};

// Шаг внутри узла формы: колонки — уровни шагов (form-step-depths), шаги
// одного уровня — друг под другом [owner 2026-10-14].
export type CanvasFormStepData = {
  id: string;
  /** Подпись шага: своё название или «Шаг N» по уровню (formStepLabel). */
  title: string;
  /** Уровень шага в форме — колонка узла формы и группировка при dnd. */
  depth: number;
  elements: CanvasElementData[];
};

// Данные узла для рендера карточек (T-031) и порядка в слое (T-036).
// type-alias, а не interface — иначе тип не удовлетворит ограничению
// Record<string, unknown> в дженерике Node.
export type CanvasNodeData = {
  title: string;
  orderIndex: number;
  /** Колонка слоя (глубина от корня) — подпись уровня и группировка при drag. */
  depth: number;
  /** Подпись под заголовком («Первый уровень навигации» и т.п.). */
  subtitle: string;
  /** Элементы узла Главной/Подсценария; у формы — пустой массив. */
  elements: CanvasElementData[];
  /** Шаги формы (D1); у узлов-сценариев — пустой массив. */
  steps: CanvasFormStepData[];
  /** Чип типа формы («Одностраничная»/«Степперная»); у не-форм — null. */
  formKindLabel: string | null;
  // Интерактивное (обработчики T-034, выделение, цель связи, нарушения,
  // reveal поиска) — НЕ в data: data содержит только данные графа и
  // сохраняет идентичность между пересчётами (ревью A4/P1, R2).
};

export type CanvasNode = Node<CanvasNodeData, CanvasNodeType>;
export type CanvasEdge = Edge;

/**
 * Стрелка на конце ребра (дизайн): два закруглённых отрезка под углом.
 * SVG-маркер объявлен в EdgeArrowMarkerDefs (editor-canvas.tsx).
 */
export const EDGE_ARROW_MARKER_ID = 'editor-edge-arrow';

export type FlowGraph = {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
};

// Контекст маппинга элементов: связи и правила графа.
type ElementMapContext = {
  logicTargets: ReadonlySet<string>;
  logicHidden: ReadonlySet<string>;
};

// Любой элемент — в любом блоке [owner 2026-10-13]: вид карточки задаёт
// kind элемента, а логику и переходы — возможности блока (R-CFG-2,
// container-capabilities; сейчас обе — только у шага формы).
function elementToElementData(
  element: CanvasElement,
  context: ElementMapContext,
  capabilities: ContainerCapabilities,
): CanvasElementData {
  if (isCommentElement(element)) {
    // Комментарий-элемент — вне связей и «Сложной логики» в любом блоке.
    return {
      id: element.id,
      title: element.text,
      kindLabel: ELEMENT_KIND_LABELS.comment,
      commentAudience: element.audience,
      logicTarget: false,
    };
  }
  const data = isPageElement(element)
    ? listItemToElementData(element)
    : formComponentToElementData(element, context.logicTargets, context.logicHidden);
  if (element.comment) {
    data.note = { text: element.comment, audience: DEFAULT_COMMENT_AUDIENCE };
  }
  if (capabilities.logic) {
    data.logicTarget = kindRules(element.kind).logicTarget;
    data.hasIncomingLogic = context.logicTargets.has(element.id);
    data.hiddenByLogic = context.logicHidden.has(element.id);
    return data;
  }
  // В блоке без логики правил нет: ни цели, ни отметок видимости.
  data.logicTarget = false;
  delete data.hasIncomingLogic;
  delete data.hiddenByLogic;
  if (!capabilities.stepTransitions) {
    // Варианты Select'а — источники и правил, и переходов: без обеих
    // возможностей у него нет ни option-handle'ов, ни переключателя режима.
    delete data.complexLogic;
  }
  return data;
}

function listItemToElementData(item: ListItem | WidgetCard): CanvasElementData {
  const element: CanvasElementData = {
    id: item.id,
    title: item.title,
    kindLabel: ELEMENT_KIND_LABELS[item.kind],
    logicTarget: false,
  };
  if (item.secondaryText) {
    element.secondaryText = item.secondaryText;
  }
  return element;
}

function formComponentToElementData(
  component: FormComponent,
  logicTargets: ReadonlySet<string>,
  logicHidden: ReadonlySet<string>,
): CanvasElementData {
  const element: CanvasElementData = {
    id: component.id,
    title: 'label' in component ? component.label : component.kind,
    kindLabel: ELEMENT_KIND_LABELS[component.kind],
    hasIncomingLogic: logicTargets.has(component.id),
    hiddenByLogic: logicHidden.has(component.id),
    logicTarget: true,
  };
  if (canBeLogicSource(component)) {
    // Select — потенциальный источник «Сложной логики» (L5) и, вариантами,
    // переходов между шагами [owner 2026-10-14]: option-handle'ы есть всегда,
    // правило видимости из них — только при включённом режиме (L4).
    element.complexLogic = {
      enabled: component.hasComplexLogic === true,
      options: component.options.map((option) => ({
        handleId: logicSourceHandleId(component.id, option.value),
        label: option.label,
        value: option.value,
        isDefault: option.isDefault === true,
      })),
    };
  }
  if ('placeholder' in component && component.placeholder) {
    element.secondaryText = component.placeholder;
  }
  return element;
}

// Прямой маппинг: ServiceGraph → узлы и рёбра react-flow.
//
// Узлы: Главная (необязательна, D8) + подсценарии (включая вложенные
// children — вложенность не ограничена, БТ 7) + формы заявок (D12).
// Рёбра: из links; source — узел, владеющий элементом-источником, а сам
// элемент указывается sourceHandle (D9: handle на правом краю карточки
// элемента); target — узел страницы-цели.
//
// Координаты не персистентны (D2) и здесь НЕ вычисляются: позиции даёт
// computeLayout (T-036) и передаёт параметром positions; без него узлы
// встают в (0, 0). Глубины для подписей уровня и drag-группировки
// вычисляются здесь же (computeGraphDepths — чистая доменная функция).
//
// previous — результат прошлого вызова (ревью P1, R2): неизменённые узлы,
// их data, карточки элементов и рёбра сохраняют идентичность объектов, а
// смена позиции не пересоздаёт data. Так react-flow и memo-компоненты
// перерисовывают только то, что действительно изменилось.
export function graphToFlow(
  graph: ServiceGraph,
  positions?: Readonly<Record<string, XYPosition>>,
  previous?: FlowGraph,
): FlowGraph {
  const next = buildFlow(graph, positions);
  return previous ? shareFlow(next, previous) : next;
}

function buildFlow(graph: ServiceGraph, positions?: Readonly<Record<string, XYPosition>>): FlowGraph {
  const positionOf = (id: string): XYPosition => positions?.[id] ?? { x: 0, y: 0 };
  const depths = computeGraphDepths(graph);
  // Цели правил видимости — индикатор зависимости на карточке (T-037, L-Q1).
  const logicTargets = new Set<string>(graph.logicRules.map((rule) => rule.targetElementId));
  // Скрытые по умолчанию цели (L3): оценка при пустом состоянии формы —
  // демонстрация семантики видимости до появления /preview (T-062).
  const visibleTargets = evaluateVisibility(graph.logicRules, new Map());
  const logicHidden = new Set<string>(
    [...logicTargets].filter((elementId) => !visibleTargets.has(toElementId(elementId))),
  );

  // Цель правила → option-handle варианта-источника (L-I7: источник один;
  // при битых данных берётся первое правило).
  const logicParents = new Map<string, string>();
  for (const rule of graph.logicRules) {
    if (rule.condition.kind === 'optionSelected' && !logicParents.has(rule.targetElementId)) {
      logicParents.set(
        rule.targetElementId,
        logicSourceHandleId(rule.sourceElementId, rule.condition.optionId),
      );
    }
  }

  const elementContext: ElementMapContext = { logicTargets, logicHidden };

  const nodes: CanvasNode[] = [];
  // Владелец элемента → id узла: нужен, чтобы ребро вышло из узла страницы,
  // а его sourceHandle указывал на карточку элемента внутри (D9).
  const elementOwnerNodeId = new Map<string, string>();

  if (graph.homePage) {
    const homePage = graph.homePage;
    nodes.push({
      id: homePage.id,
      type: 'home',
      position: positionOf(homePage.id),
      data: {
        title: NODE_KIND_LABELS.home,
        orderIndex: homePage.orderIndex,
        depth: depths.get(homePage.id) ?? 0,
        subtitle: NODE_SUBTITLES.home,
        elements: homePage.elements.map((element) =>
          elementToElementData(element, elementContext, containerCapabilities('page')),
        ),
        steps: [],
        formKindLabel: null,
      },
    });
    for (const element of homePage.elements) {
      elementOwnerNodeId.set(element.id, homePage.id);
    }
  }

  // Уровень навигации подсценария считается от видимых страниц: с Главной
  // первый её подсценарий — «Первый уровень»; без Главной (D8) первый
  // уровень — корневые страницы (глубина 0).
  const levelOffset = graph.homePage ? 0 : 1;
  for (const scenario of walkSubScenarios(graph.subScenarios)) {
    const depth = depths.get(scenario.id) ?? 0;
    nodes.push({
      id: scenario.id,
      type: 'subScenario',
      position: positionOf(scenario.id),
      data: {
        title: scenario.title,
        orderIndex: scenario.orderIndex,
        depth,
        subtitle: navigationLevelLabel(depth + levelOffset || 1),
        elements: scenario.elements.map((element) =>
          elementToElementData(element, elementContext, containerCapabilities('page')),
        ),
        steps: [],
        formKindLabel: null,
      },
    });
    for (const element of scenario.elements) {
      elementOwnerNodeId.set(element.id, scenario.id);
    }
  }

  for (const form of graph.applicationForms) {
    // Уровни шагов формы; номер в подписи — номер занятой колонки (пустые
    // уровни после удаления шага не дают пропусков в нумерации).
    const formStepDepths = computeFormStepDepths(form, graph.stepTransitions);
    const stepLevels = [...new Set(formStepDepths.values())].sort((left, right) => left - right);
    nodes.push({
      id: form.id,
      type: 'form',
      position: positionOf(form.id),
      data: {
        title: form.title,
        orderIndex: form.orderIndex,
        depth: depths.get(form.id) ?? 0,
        subtitle: NODE_SUBTITLES.form,
        elements: [],
        steps: form.steps.map((step) => {
          const depth = formStepDepths.get(step.id) ?? 0;
          // Колонки элементов шага и варианты-источники для раскладки
          // «цель напротив варианта» [owner 2026-10-13].
          const stepDepths = computeStepElementDepths(step, graph.logicRules);
          return {
            id: step.id,
            title: step.title ?? formStepLabel(stepLevels.indexOf(depth) + 1),
            depth,
            elements: step.elements.map((component) => ({
              ...elementToElementData(component, elementContext, containerCapabilities('formStep')),
              layerDepth: stepDepths.get(component.id) ?? 0,
              ...(logicParents.has(component.id)
                ? { logicParentHandleId: logicParents.get(component.id)! }
                : null),
            })),
          };
        }),
        formKindLabel: form.steps.length > 1 ? 'Степперная' : 'Одностраничная',
      },
    });
    for (const step of form.steps) {
      for (const component of step.elements) {
        elementOwnerNodeId.set(component.id, form.id);
      }
    }
  }

  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges: CanvasEdge[] = [];
  for (const link of graph.links) {
    const sourceNodeId = elementOwnerNodeId.get(link.sourceElementId);
    // Битая ссылка (элемент или цель удалены вне каскада) не должна ронять
    // рендер канваса — такое ребро пропускается; консистентность графа
    // обеспечивают команды (T-035), адаптер лишь отражает данные.
    if (!sourceNodeId || !nodeIds.has(link.targetId)) {
      continue;
    }
    edges.push({
      id: link.id,
      source: sourceNodeId,
      sourceHandle: link.sourceElementId,
      target: link.targetId,
      // Ортогональные рёбра с закруглёнными углами (замечание владельца) —
      // ребро редактора (canvas-edges, путь smoothstep).
      type: EDITOR_EDGE_TYPE,
      markerEnd: EDGE_ARROW_MARKER_ID,
    });
  }

  // Проекция правил «Сложной логики» в рёбра (T-037/T-065, L7): ребро =
  // правило. Источник — option-handle Select'а-источника, цель — якорь
  // карточки элемента на высоте варианта (прямая горизонталь); оба конца живут внутри одного узла формы (L-I5), поэтому
  // это штатное ребро react-flow внутри FormNode (решение владельца по Q-9).
  // Стиль — как у навигационных рёбер (решение владельца по N1: отличие
  // предложит дизайнер); reconnect правил не поддерживаем.
  for (const rule of graph.logicRules) {
    if (rule.condition.kind !== 'optionSelected') {
      continue;
    }
    const ruleSourceNodeId = elementOwnerNodeId.get(rule.sourceElementId);
    const ruleTargetNodeId = elementOwnerNodeId.get(rule.targetElementId);
    // Битая ссылка (элемент удалён вне каскада) не роняет рендер — инварианты
    // фиксируют нарушение, адаптер пропускает ребро.
    if (!ruleSourceNodeId || !ruleTargetNodeId) {
      continue;
    }
    edges.push({
      id: rule.id,
      source: ruleSourceNodeId,
      sourceHandle: logicSourceHandleId(rule.sourceElementId, rule.condition.optionId),
      target: ruleTargetNodeId,
      targetHandle: logicAnchorHandleId(rule.targetElementId),
      type: EDITOR_EDGE_TYPE,
      markerEnd: EDGE_ARROW_MARKER_ID,
      reconnectable: false,
      data: { kind: 'logic' },
    });
  }

  // Проекция переходов между шагами [owner 2026-10-14]: источник — handle
  // элемента (D9) или его варианта, цель — target-handle шага; оба конца в
  // одном узле формы. Переназначение не поддерживаем — как у правил.
  const stepOwnerNodeId = new Map<string, string>();
  for (const form of graph.applicationForms) {
    for (const step of form.steps) {
      stepOwnerNodeId.set(step.id, form.id);
    }
  }
  for (const transition of graph.stepTransitions) {
    const sourceNodeId = elementOwnerNodeId.get(transition.sourceElementId);
    const targetNodeId = stepOwnerNodeId.get(transition.targetStepId);
    // Битая ссылка не роняет рендер — каскады команд и инвариант её не допускают.
    if (!sourceNodeId || !targetNodeId) {
      continue;
    }
    edges.push({
      id: transition.id,
      source: sourceNodeId,
      sourceHandle:
        transition.optionId !== undefined
          ? logicSourceHandleId(transition.sourceElementId, transition.optionId)
          : transition.sourceElementId,
      target: targetNodeId,
      targetHandle: stepTargetHandleId(transition.targetStepId),
      type: EDITOR_EDGE_TYPE,
      markerEnd: EDGE_ARROW_MARKER_ID,
      reconnectable: false,
      data: { kind: 'stepTransition' },
    });
  }

  return { nodes, edges };
}

// Структурное разделение: значение, равное прошлому по содержимому,
// заменяется прошлым объектом (вложенные — рекурсивно). Элементы массивов
// с полем id сопоставляются по id — вставка в начало списка не «сдвигает»
// идентичность остальных карточек.
function share<T>(next: T, prev: unknown): T {
  if (Object.is(next, prev) || typeof next !== 'object' || next === null) {
    return next;
  }
  if (typeof prev !== 'object' || prev === null) {
    return next;
  }
  if (Array.isArray(next)) {
    if (!Array.isArray(prev)) {
      return next;
    }
    const prevById = new Map<unknown, unknown>();
    for (const item of prev as unknown[]) {
      if (typeof item === 'object' && item !== null && 'id' in item) {
        prevById.set(item.id, item);
      }
    }
    let same = next.length === prev.length;
    const result = next.map((item: unknown, index) => {
      const candidate =
        typeof item === 'object' && item !== null && 'id' in item ? prevById.get(item.id) : prev[index];
      const shared = share(item, candidate);
      if (shared !== prev[index]) {
        same = false;
      }
      return shared;
    });
    return (same ? prev : result) as T;
  }
  if (Array.isArray(prev)) {
    return next;
  }
  const prevRecord = prev as Record<string, unknown>;
  const keys = Object.keys(next);
  let same = keys.length === Object.keys(prevRecord).length;
  const result: Record<string, unknown> = {};
  for (const key of keys) {
    const shared = share((next as Record<string, unknown>)[key], prevRecord[key]);
    result[key] = shared;
    if (shared !== prevRecord[key]) {
      same = false;
    }
  }
  return (same ? prev : result) as T;
}

function shareFlow(next: FlowGraph, previous: FlowGraph): FlowGraph {
  const nodes = share(next.nodes, previous.nodes);
  const edges = share(next.edges, previous.edges);
  return nodes === previous.nodes && edges === previous.edges ? previous : { nodes, edges };
}

// Обратный маппинг связей: Connection react-flow (события onConnect /
// onReconnect) → поля доменной связи для команд ConnectElements /
// ReconnectElements (T-035). Id новой связи генерирует вызывающая сторона
// через IIdGenerator. Без sourceHandle связь не исходит от элемента (D9) —
// такой Connection не маппится.
export function flowConnectionToLink(
  connection: Connection,
): { sourceElementId: ElementId; targetId: PageLinkTargetId } | null {
  if (!connection.sourceHandle) {
    return null;
  }
  return {
    sourceElementId: toElementId(connection.sourceHandle),
    targetId: PageLinkTargetIdSchema.parse(connection.target),
  };
}

// Обратный маппинг порядка внутри слоя: после вертикального drag узла UI
// передаёт узлы этой колонки; желаемый порядок — по координате Y. Результат —
// вход для ReorderInLayer (T-035).
export function flowNodesToLayerOrder(nodes: CanvasNode[]): PageEntityId[] {
  return [...nodes]
    .sort((left, right) => left.position.y - right.position.y)
    .map((node) => toPageEntityId(node.id));
}
