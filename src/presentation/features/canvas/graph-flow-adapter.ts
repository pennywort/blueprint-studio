import type { Connection, Edge, Node, XYPosition } from '@xyflow/react';
import type { ServiceGraph } from '@domain/model/service-graph';
import { PageLinkTargetIdSchema, type PageLinkTargetId } from '@domain/model/page-link';
import { toElementId, type ElementId, type PageEntityId } from '@domain/model/ids';

// Адаптер graph ↔ flow (Epic 002, T-030) — граница domain ↔ react-flow
// (архитектурный принцип 4 декомпозиции): домен не знает о react-flow,
// react-flow не знает о домене; мапперы — единственная точка контакта.
// Чистые функции без состояния; типы @xyflow/react допустимы здесь
// (presentation-слой), но не в domain/application.

// Типы узлов — ключи будущего реестра nodeTypes кастомных узлов (T-031).
export type CanvasNodeType = 'home' | 'subScenario' | 'form';

// Данные узла: минимум, который нужен карточке узла (T-031) и порядку в слое
// (T-036). type-alias, а не interface — иначе тип не удовлетворит ограничению
// Record<string, unknown> в дженерике Node.
export type CanvasNodeData = {
  title: string;
  orderIndex: number;
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

// Прямой маппинг: ServiceGraph → узлы и рёбра react-flow.
//
// Узлы: Главная (необязательна, D8) + подсценарии (включая вложенные
// children — вложенность не ограничена, БТ 7) + формы заявок (D12).
// Рёбра: из links; source — узел, владеющий элементом-источником, а сам
// элемент указывается sourceHandle (D9: handle на правом краю карточки
// элемента); target — узел страницы-цели.
//
// Координаты не персистентны (D2) и здесь НЕ вычисляются: позиции даст
// computeLayout (T-036, сессия S9). Точка интеграции — параметр positions:
// позиции узлов по id; до T-036 узлы встают в (0, 0).
export function graphToFlow(
  graph: ServiceGraph,
  positions?: Readonly<Record<string, XYPosition>>,
): FlowGraph {
  const positionOf = (id: string): XYPosition => positions?.[id] ?? { x: 0, y: 0 }; // позиции — T-036

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
      data: { title: HOME_NODE_TITLE, orderIndex: homePage.orderIndex },
    });
    for (const item of homePage.listItems) {
      elementOwnerNodeId.set(item.id, homePage.id);
    }
    for (const card of homePage.widgetCards) {
      elementOwnerNodeId.set(card.id, homePage.id);
    }
  }

  collectSubScenarioNodes(graph.subScenarios, nodes, elementOwnerNodeId, positionOf);

  for (const form of graph.applicationForms) {
    nodes.push({
      id: form.id,
      type: 'form',
      position: positionOf(form.id),
      data: { title: form.title, orderIndex: form.orderIndex },
    });
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
): void {
  for (const scenario of subScenarios) {
    nodes.push({
      id: scenario.id,
      type: 'subScenario',
      position: positionOf(scenario.id),
      data: { title: scenario.title, orderIndex: scenario.orderIndex },
    });
    for (const item of scenario.listItems) {
      elementOwnerNodeId.set(item.id, scenario.id);
    }
    if (scenario.children) {
      collectSubScenarioNodes(scenario.children, nodes, elementOwnerNodeId, positionOf);
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
// вход для ReorderInLayer (T-035). Группировка узлов по колонкам (глубины) —
// забота layout-движка (T-036, S9), адаптер её не дублирует.
export function flowNodesToLayerOrder(nodes: CanvasNode[]): PageEntityId[] {
  return [...nodes]
    .sort((left, right) => left.position.y - right.position.y)
    .map((node) => node.id as PageEntityId);
}
