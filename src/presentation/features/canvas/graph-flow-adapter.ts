import type { Connection, Edge, Node, XYPosition } from '@xyflow/react';
import type { ServiceGraph } from '@domain/model/service-graph';
import type { ListItem, WidgetCard } from '@domain/model/scenario';
import type { FormComponent, FormComponentKind } from '@domain/model/form-components';
import { PageLinkTargetIdSchema, type PageLinkTargetId } from '@domain/model/page-link';
import { toElementId, type ElementId, type PageEntityId } from '@domain/model/ids';
import { computeGraphDepths } from '@domain/graph-depths';

// Адаптер graph ↔ flow (Epic 002, T-030) — граница domain ↔ react-flow
// (архитектурный принцип 4 декомпозиции): домен не знает о react-flow,
// react-flow не знает о домене; мапперы — единственная точка контакта.
// Чистые функции без состояния; типы @xyflow/react допустимы здесь
// (presentation-слой), но не в domain/application.

// Типы узлов — ключи реестра nodeTypes кастомных узлов (T-031).
export type CanvasNodeType = 'home' | 'subScenario' | 'form';

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
const FORM_COMPONENT_KIND_LABELS: Record<FormComponentKind, string> = {
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

function listItemToElementData(item: ListItem | WidgetCard, kindLabel: string): CanvasElementData {
  const element: CanvasElementData = { id: item.id, title: item.title, kindLabel };
  if (item.secondaryText) {
    element.secondaryText = item.secondaryText;
  }
  return element;
}

function formComponentToElementData(component: FormComponent): CanvasElementData {
  const element: CanvasElementData = {
    id: component.id,
    title: 'label' in component ? component.label : component.kind,
    kindLabel: FORM_COMPONENT_KIND_LABELS[component.kind],
  };
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
          ...homePage.listItems.map((item) => listItemToElementData(item, 'List item')),
          ...homePage.widgetCards.map((card) => listItemToElementData(card, 'Widget card')),
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
  collectSubScenarioNodes(graph.subScenarios, nodes, elementOwnerNodeId, positionOf, depths, levelOffset);

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
          elements: step.components.map(formComponentToElementData),
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
        elements: scenario.listItems.map((item) => listItemToElementData(item, 'List item')),
        steps: [],
        formKindLabel: null,
      },
    });
    for (const item of scenario.listItems) {
      elementOwnerNodeId.set(item.id, scenario.id);
    }
    if (scenario.children) {
      collectSubScenarioNodes(scenario.children, nodes, elementOwnerNodeId, positionOf, depths, levelOffset);
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
