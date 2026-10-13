import type { Connection, Edge, Node, XYPosition } from '@xyflow/react';
import type { ServiceGraph } from '@domain/model/service-graph';
import type { ListItem, WidgetCard } from '@domain/model/scenario';
import type { FormComponent, FormComponentKind } from '@domain/model/form-components';
import { PageLinkTargetIdSchema, type PageLinkTargetId } from '@domain/model/page-link';
import { toElementId, type ElementId, type PageEntityId } from '@domain/model/ids';
import { computeGraphDepths } from '@domain/graph-depths';
import { evaluateVisibility } from '@domain/logic-visibility';
import type { DropAnchorPosition, ElementDragPayload } from './element-dnd';

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

export const logicSourceHandleId = (elementId: string, optionId: string): string =>
  `${LOGIC_SOURCE_HANDLE_PREFIX}${elementId}:${optionId}`;

export const logicTargetHandleId = (elementId: string): string => `${LOGIC_TARGET_HANDLE_PREFIX}${elementId}`;

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
   * Из элемента исходит связь. В сжатом состоянии (T-033) такие карточки
   * остаются видимыми: скрытая карточка унесла бы свой source-handle,
   * и react-flow уронил бы ребро.
   */
  hasOutgoingLink: boolean;
  /**
   * «Сложная логика» (T-037): поле присутствует у Select'а — потенциального
   * источника правил (L5). enabled — режим включён, у option'ов есть
   * source-handle'ы; options — строки option'ов для рендера с handle-id.
   */
  complexLogic?: {
    enabled: boolean;
    options: ReadonlyArray<{ handleId: string; label: string }>;
  };
  /** На элемент есть входящие правила видимости — индикатор зависимости (L-Q1). */
  hasIncomingLogic?: boolean;
  /**
   * Элемент скрыт в предпросмотре по правилам видимости при пустом состоянии
   * формы (evaluateVisibility, T-062): цель с правилами скрыта по умолчанию
   * (L3). Бейдж на карточке — демонстрация семантики до появления /preview.
   */
  hiddenByLogic?: boolean;
  /** Карточка выделена (клик) — чёрная рамка, Delete удаляет элемент (T-034). */
  selected?: boolean;
  /**
   * Элемент — допустимая цель протягиваемой связи (правило логики):
   * рисуется полый target-handle. Вне протягивания принимающих handles нет.
   */
  connectTarget?: boolean;
  /** Нарушения инвариантов, указывающие на элемент (T-043; внедряется хранилищем). */
  violations?: readonly string[];
  /**
   * Карточка может быть целью правил «Сложной логики» — target-handle на
   * левом краю. Только компоненты форм (источник — Select той же формы,
   * L-I5); у List item/Widget card handle не рисуется — соединить его
   * доменно невозможно, лишняя точка-коннектор путает (N5).
   */
  logicTarget: boolean;
  /** Класс элемента для dnd: допустимые зоны приёма зависят от вида (N2). */
  dndKind: 'listItem' | 'widgetCard' | 'formComponent';
  /** Клик по карточке — выделение элемента (внедряется хранилищем). */
  onSelect?: () => void;
  /** Чип «Сложная логика» — переключатель режима (внедряется хранилищем, T-066). */
  onToggleComplexLogic?: () => void;
};

// Колонка шага внутри узла формы (D1: шаги — горизонтальные колонки).
export type CanvasFormStepData = {
  id: string;
  /** Заголовок шага; пустой — компонент подставит «Шаг N». */
  title: string;
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
  // --- Интерактивные поля (T-034): НЕ строятся адаптером (он чистый),
  // внедряются хранилищем состояния (useEditorGraph) после graphToFlow. ---
  /** Корзина в заголовке узла → RemoveHomePage/RemoveScenario/RemoveForm. */
  onDeleteNode?: () => void;
  /**
   * Поиск (T-050): элемент, который надо показать, — сжатый узел (T-033)
   * разворачивается. nonce различает повторные запросы того же элемента.
   */
  reveal?: { elementId: string; nonce: number };
  /** Блок — допустимая цель протягиваемой навигационной связи (полый target-handle). */
  connectTarget?: boolean;
  /** Нарушения инвариантов узла и его элементов (T-043) — рамка + тултип. */
  violations?: readonly string[];
  /** Варианты меню «+» шага формы (kind + человекочитаемая подпись). */
  elementKindOptions?: ReadonlyArray<{ kind: FormComponentKind; label: string }>;
  /** «+» конкретного шага формы → AddFormComponent. */
  onAddElementToStep?: (stepId: string, kind: FormComponentKind) => void;
  /** Корзина шага формы → RemoveFormStep. */
  onDeleteStep?: (stepId: string) => void;
  /**
   * «+» шага формы на узле (N3) → AddFormStep: новая пустая колонка шага
   * в конец формы. Только у узлов-форм.
   */
  onAddStep?: () => void;
  /**
   * Dnd карточек элементов (N2): drop в списке узла или колонке шага.
   * targetStepId — шаг-цель у форм; null — общий список узла страницы.
   * Якорь (карточка + сторона) даёт позицию вставки; null — в конец.
   */
  onDropElement?: (
    targetStepId: string | null,
    dragged: ElementDragPayload,
    anchor: DropAnchorPosition | null,
  ) => void;
};

export type CanvasNode = Node<CanvasNodeData, CanvasNodeType>;
export type CanvasEdge = Edge;

export type FlowGraph = {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
};

// У Главной нет собственного заголовка в доменной модели — имя фиксировано
// макетами редактора.
const HOME_NODE_TITLE = 'Главная';
const HOME_NODE_SUBTITLE = 'Стартовая страница сервиса';
const FORM_NODE_SUBTITLE = 'Поля для заполнения пользователем';

// Подписи чипов типов элементов (макеты: «List item», «Text field», «FAQ»…).
// Манифест схем хранит только machine-kind; человекочитаемые названия
// появятся, когда их начнёт отдавать провайдер схем (T-034+).
// Экспортируется: те же подписи нужны меню добавления элементов (T-034).
export const FORM_COMPONENT_KIND_LABELS: Record<FormComponentKind, string> = {
  textField: 'Text field',
  infoBlock: 'Info block',
  datePeriod: 'Date period',
  attachment: 'Attachment',
  checkbox: 'Checkbox',
  configurationItemPicker: 'CI picker',
  employeeSearch: 'Search user',
  selectList: 'Select list',
  typography: 'Typography',
  button: 'Button',
  addressPicker: 'Address',
  employeeLoginField: 'Login',
};

// Порядковые номера уровней навигации для подписи подсценария (макеты:
// «Первый уровень навигации», «Второй уровень навигации»).
const NAVIGATION_LEVEL_ORDINALS = ['Первый', 'Второй', 'Третий', 'Четвёртый', 'Пятый'];

function navigationLevelLabel(level: number): string {
  const ordinal = NAVIGATION_LEVEL_ORDINALS[level - 1];
  return ordinal ? `${ordinal} уровень навигации` : `Уровень навигации ${level}`;
}

function listItemToElementData(
  item: ListItem | WidgetCard,
  kindLabel: string,
  linkSources: ReadonlySet<string>,
  dndKind: 'listItem' | 'widgetCard',
): CanvasElementData {
  const element: CanvasElementData = {
    id: item.id,
    title: item.title,
    kindLabel,
    hasOutgoingLink: linkSources.has(item.id),
    logicTarget: false,
    dndKind,
  };
  if (item.secondaryText) {
    element.secondaryText = item.secondaryText;
  }
  return element;
}

function formComponentToElementData(
  component: FormComponent,
  linkSources: ReadonlySet<string>,
  logicTargets: ReadonlySet<string>,
  logicHidden: ReadonlySet<string>,
): CanvasElementData {
  const element: CanvasElementData = {
    id: component.id,
    title: 'label' in component ? component.label : component.kind,
    kindLabel: FORM_COMPONENT_KIND_LABELS[component.kind],
    hasOutgoingLink: linkSources.has(component.id),
    hasIncomingLogic: logicTargets.has(component.id),
    hiddenByLogic: logicHidden.has(component.id),
    logicTarget: true,
    dndKind: 'formComponent',
  };
  if (component.kind === 'selectList') {
    // Select — потенциальный источник «Сложной логики» (L5); option-handle'ы
    // рисуются только при включённом режиме (L4).
    const enabled = component.hasComplexLogic === true;
    element.complexLogic = {
      enabled,
      options: enabled
        ? component.options.map((option) => ({
            handleId: logicSourceHandleId(component.id, option.value),
            label: option.label,
          }))
        : [],
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
export function graphToFlow(
  graph: ServiceGraph,
  positions?: Readonly<Record<string, XYPosition>>,
): FlowGraph {
  const positionOf = (id: string): XYPosition => positions?.[id] ?? { x: 0, y: 0 };
  const depths = computeGraphDepths(graph);
  // Источники связей — для флага hasOutgoingLink (сжатие T-033 не прячет
  // карточки, от которых исходит ребро).
  const linkSources = new Set<string>(graph.links.map((link) => link.sourceElementId));
  // Цели правил видимости — индикатор зависимости на карточке (T-037, L-Q1).
  const logicTargets = new Set<string>(graph.logicRules.map((rule) => rule.targetElementId));
  // Скрытые по умолчанию цели (L3): оценка при пустом состоянии формы —
  // демонстрация семантики видимости до появления /preview (T-062).
  const visibleTargets = evaluateVisibility(graph.logicRules, new Map());
  const logicHidden = new Set<string>(
    [...logicTargets].filter((elementId) => !visibleTargets.has(elementId as ElementId)),
  );

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
        title: HOME_NODE_TITLE,
        orderIndex: homePage.orderIndex,
        depth: depths.get(homePage.id) ?? 0,
        subtitle: HOME_NODE_SUBTITLE,
        elements: [
          ...homePage.listItems.map((item) =>
            listItemToElementData(item, 'List item', linkSources, 'listItem'),
          ),
          ...homePage.widgetCards.map((card) =>
            listItemToElementData(card, 'Widget card', linkSources, 'widgetCard'),
          ),
        ],
        steps: [],
        formKindLabel: null,
      },
    });
    for (const item of homePage.listItems) {
      elementOwnerNodeId.set(item.id, homePage.id);
    }
    for (const card of homePage.widgetCards) {
      elementOwnerNodeId.set(card.id, homePage.id);
    }
  }

  // Уровень навигации подсценария считается от видимых страниц: с Главной
  // первый её подсценарий — «Первый уровень»; без Главной (D8) первый
  // уровень — корневые страницы (глубина 0).
  const levelOffset = graph.homePage ? 0 : 1;
  collectSubScenarioNodes(
    graph.subScenarios,
    nodes,
    elementOwnerNodeId,
    positionOf,
    depths,
    levelOffset,
    linkSources,
  );

  for (const form of graph.applicationForms) {
    nodes.push({
      id: form.id,
      type: 'form',
      position: positionOf(form.id),
      data: {
        title: form.title,
        orderIndex: form.orderIndex,
        depth: depths.get(form.id) ?? 0,
        subtitle: FORM_NODE_SUBTITLE,
        elements: [],
        steps: form.steps.map((step) => ({
          id: step.id,
          title: step.title ?? '',
          elements: step.components.map((component) =>
            formComponentToElementData(component, linkSources, logicTargets, logicHidden),
          ),
        })),
        formKindLabel: form.steps.length > 1 ? 'Степперная' : 'Одностраничная',
      },
    });
    for (const step of form.steps) {
      for (const component of step.components) {
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
      // штатный тип react-flow smoothstep.
      type: 'smoothstep',
    });
  }

  // Проекция правил «Сложной логики» в рёбра (T-037/T-065, L7): ребро =
  // правило. Источник — option-handle Select'а-источника, цель — target-handle
  // карточки элемента; оба конца живут внутри одного узла формы (L-I5), поэтому
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
      targetHandle: logicTargetHandleId(rule.targetElementId),
      type: 'smoothstep',
      reconnectable: false,
      data: { kind: 'logic' },
    });
  }

  return { nodes, edges };
}

function collectSubScenarioNodes(
  subScenarios: ServiceGraph['subScenarios'],
  nodes: CanvasNode[],
  elementOwnerNodeId: Map<string, string>,
  positionOf: (id: string) => XYPosition,
  depths: ReadonlyMap<string, number>,
  levelOffset: number,
  linkSources: ReadonlySet<string>,
): void {
  for (const scenario of subScenarios) {
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
        elements: scenario.listItems.map((item) =>
          listItemToElementData(item, 'List item', linkSources, 'listItem'),
        ),
        steps: [],
        formKindLabel: null,
      },
    });
    for (const item of scenario.listItems) {
      elementOwnerNodeId.set(item.id, scenario.id);
    }
    if (scenario.children) {
      collectSubScenarioNodes(
        scenario.children,
        nodes,
        elementOwnerNodeId,
        positionOf,
        depths,
        levelOffset,
        linkSources,
      );
    }
  }
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
    .map((node) => node.id as PageEntityId);
}
