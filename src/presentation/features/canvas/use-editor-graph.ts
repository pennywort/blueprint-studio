import { useCallback, useMemo, useRef, useState } from 'react';
import type { Connection } from '@xyflow/react';
import type { ServiceGraph } from '@domain/model/service-graph';
import type { FormComponentKind } from '@domain/model/form-components';
import {
  toApplicationFormId,
  toElementId,
  toFormComponentId,
  toFormStepId,
  toPageId,
  toPageLinkId,
  toScenarioId,
  type ApplicationFormId,
  type ElementId,
  type FormStepId,
  type PageEntityId,
  type PageLinkId,
  type ScenarioId,
} from '@domain/model/ids';
import { PageLinkTargetIdSchema, type PageLinkTargetId } from '@domain/model/page-link';
import type { Command } from '@application/commands/command';
import { ConnectElements } from '@application/commands/connect-elements';
import { ReconnectElements } from '@application/commands/reconnect-elements';
import { DisconnectElements } from '@application/commands/disconnect-elements';
import { ReorderInLayer } from '@application/commands/reorder-in-layer';
import { AddHomePage } from '@application/commands/add-home-page';
import { RemoveHomePage } from '@application/commands/remove-home-page';
import { AddScenario } from '@application/commands/add-scenario';
import { RemoveScenario } from '@application/commands/remove-scenario';
import { AddForm } from '@application/commands/add-form';
import { RemoveForm } from '@application/commands/remove-form';
import { RemoveFormStep } from '@application/commands/remove-form-step';
import { AddElement } from '@application/commands/add-element';
import { AddFormComponent } from '@application/commands/add-form-component';
import { findFormById, walkPages } from '@application/commands/graph-lookup';
import { useContainer } from '@presentation/app/App';
import { useEditorNotifications } from '@presentation/features/notifications/editor-notifications';
import type { AddableElementKind, AddableNodeKind } from '@presentation/features/toolbar/editor-toolbar';
import { computeLayout } from './canvas-layout';
import {
  FORM_COMPONENT_KIND_LABELS,
  flowConnectionToLink,
  flowNodesToLayerOrder,
  graphToFlow,
  type CanvasEdge,
  type CanvasNode,
  type CanvasNodeType,
} from './graph-flow-adapter';
import {
  NEW_FORM_TITLE,
  NEW_LIST_ITEM_TITLE,
  NEW_SCENARIO_TITLE,
  createDefaultFormComponent,
} from './default-elements';
import { createSampleGraph } from './sample-graph';

// Варианты меню «+» шага формы: все kind из маппинга подписей адаптера
// (12 форм-компонентов манифеста), порядок — как в маппинге.
const ELEMENT_KIND_OPTIONS = Object.entries(FORM_COMPONENT_KIND_LABELS).map(([kind, label]) => ({
  kind: kind as FormComponentKind,
  label,
}));

// TEMPORARY (до effector — запланирован, но не установлен): ServiceGraph живёт
// в React state страницы редактора. Мутации — ТОЛЬКО через
// commandBus.execute/undo/redo (конституция, железное правило 1); после каждой
// команды узлы/рёбра пересчитываются: computeLayout(graph) → positions →
// graphToFlow(graph, positions). Начальное значение — демо-граф (sample).
// При появлении effector хук заменяется подпиской на стор, публичная
// сигнатура сохраняется.
export function useEditorGraph() {
  const container = useContainer();
  const notifications = useEditorNotifications();
  const commandBus = container.cradle.commandBus;
  const idGenerator = container.cradle.idGenerator;

  const [graph, setGraph] = useState<ServiceGraph>(() => createSampleGraph());
  // Актуальный граф в ref: колбэки react-flow не должны зависеть от замыканий
  // на устаревший state, а мутации идут только через CommandBus.
  const graphRef = useRef(graph);

  const positions = useMemo(() => computeLayout(graph), [graph]);
  const flow = useMemo(() => graphToFlow(graph, positions), [graph, positions]);

  // Выделенный на канвасе узел (клик): цель для меню добавления элементов
  // тулбара (T-034). Schema-driven панель атрибутов появится в T-041+.
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const selectedNodeType: CanvasNodeType | null = useMemo(
    () => flow.nodes.find((node) => node.id === selectedNodeId)?.type ?? null,
    [flow.nodes, selectedNodeId],
  );

  const runCommand = useCallback(
    (command: Command) => {
      try {
        const next = commandBus.execute(graphRef.current, command);
        graphRef.current = next;
        setGraph(next);
      } catch (error) {
        // Отказы команд (несуществующая цель и т.п.) — единый Snackbar
        // страницы (T-023), своих снекбаров у канваса нет.
        notifications.showCommandFailure(error instanceof Error ? error.message : String(error));
      }
    },
    [commandBus, notifications],
  );

  // Создание связи drag'ом (T-032): Connection → поля связи (адаптер),
  // id — от IIdGenerator; слои доводит сама команда (D7, T-036).
  const connect = useCallback(
    (connection: Connection) => {
      const link = flowConnectionToLink(connection);
      if (!link) {
        return; // связь не от элемента (нет sourceHandle) — игнорируем
      }
      runCommand(
        new ConnectElements({
          id: toPageLinkId(idGenerator.next()),
          sourceElementId: link.sourceElementId,
          targetId: link.targetId,
        }),
      );
    },
    [idGenerator, runCommand],
  );

  // Переназначение существующей связи на другой источник/цель (T-032, D7/D13):
  // меняются только переданные концы, id связи стабилен.
  const reconnect = useCallback(
    (oldEdge: CanvasEdge, connection: Connection) => {
      const patch: { sourceElementId?: ElementId; targetId?: PageLinkTargetId } = {};
      if (connection.sourceHandle && connection.sourceHandle !== oldEdge.sourceHandle) {
        patch.sourceElementId = toElementId(connection.sourceHandle);
      }
      if (connection.target && connection.target !== oldEdge.target) {
        patch.targetId = PageLinkTargetIdSchema.parse(connection.target);
      }
      if (patch.sourceElementId === undefined && patch.targetId === undefined) {
        return; // концы не изменились — команда не нужна
      }
      runCommand(new ReconnectElements(toPageLinkId(oldEdge.id), patch));
    },
    [runCommand],
  );

  // Удаление связей (выделенное ребро + Delete/Backspace) — по команде на ребро.
  const disconnect = useCallback(
    (edges: CanvasEdge[]) => {
      for (const edge of edges) {
        runCommand(new DisconnectElements(toPageLinkId(edge.id as PageLinkId)));
      }
    },
    [runCommand],
  );

  // Переупорядочивание внутри слоя (T-036, D13): вертикальный drag узла,
  // порядок после drag — по Y через flowNodesToLayerOrder адаптера. Команда
  // ReorderInLayer вынимает страницу из общей последовательности orderIndex
  // и вставляет на целевую позицию — здесь вычисляем эту позицию так, чтобы
  // перетаскиваемый узел встал на своё место внутри колонки, а относительный
  // порядок остальных страниц не изменился.
  const reorderInLayer = useCallback(
    (draggedNode: CanvasNode, layerNodes: CanvasNode[]) => {
      const desiredLayerOrder = flowNodesToLayerOrder(layerNodes);
      const toSlot = desiredLayerOrder.indexOf(draggedNode.id as PageEntityId);
      if (toSlot < 0) {
        return;
      }

      const pages = [...walkPages(graphRef.current)].sort(
        (left, right) => left.orderIndex - right.orderIndex,
      );
      const layerIds = new Set(desiredLayerOrder as string[]);
      const currentLayerOrder = pages.filter((page) => layerIds.has(page.id)).map((page) => page.id);
      const fromSlot = currentLayerOrder.indexOf(draggedNode.id as PageEntityId);
      if (fromSlot < 0 || fromSlot === toSlot) {
        return; // порядок не изменился — команда не нужна
      }

      // Позиция в общей последовательности без перетаскиваемой страницы:
      // вставка перед страницей, занимающей целевой слот, либо в конец слоя.
      const globalIds = pages.map((page) => page.id as string).filter((id) => id !== draggedNode.id);
      const othersInLayer = currentLayerOrder.filter((id) => id !== draggedNode.id);
      const anchor =
        toSlot >= othersInLayer.length ? othersInLayer[othersInLayer.length - 1] : othersInLayer[toSlot];
      if (anchor === undefined) {
        return; // в колонке один узел
      }
      const anchorIndex = globalIds.indexOf(anchor);
      const targetOrderIndex = toSlot >= othersInLayer.length ? anchorIndex + 1 : anchorIndex;

      runCommand(new ReorderInLayer(draggedNode.id as PageEntityId, targetOrderIndex));
    },
    [runCommand],
  );

  // --- Добавление/удаление (T-034): все мутации — команды через CommandBus,
  // id — от IIdGenerator; после команды раскладка пересчитывается сама. ---

  // Узел из меню тулбара: Главная (только если её нет — пункт меню тогда
  // отключён, дубль здесь отклонит команда), Подсценарий, Форма заявки.
  // Новый узел занимает следующую позицию по порядку создания (orderIndex,
  // D13) — его выдаёт команда; связь к узлу привязывается позже drag'ом.
  const addNode = useCallback(
    (kind: AddableNodeKind) => {
      if (kind === 'home') {
        runCommand(new AddHomePage({ id: toPageId(idGenerator.next()), listItems: [], widgetCards: [] }));
        return;
      }
      if (kind === 'subScenario') {
        runCommand(
          new AddScenario({
            id: toScenarioId(idGenerator.next()),
            type: 'navigation',
            title: NEW_SCENARIO_TITLE,
            listItems: [],
          }),
        );
        return;
      }
      // Форма заявки создаётся с одним пустым шагом: без шагов узлу нечего
      // показывать, а «+» элемента живёт на колонке шага.
      runCommand(
        new AddForm({
          id: toApplicationFormId(idGenerator.next()),
          title: NEW_FORM_TITLE,
          steps: [{ id: toFormStepId(idGenerator.next()), components: [] }],
        }),
      );
    },
    [idGenerator, runCommand],
  );

  // Элемент из меню тулбара — в выделенный узел канваса. Допустимые виды
  // элементов зависят от типа узла (меню их и показывает): Главная —
  // List item/Widget card, Подсценарий — List item, Форма — компоненты
  // формы (в первый шаг; в конкретный шаг степперной формы — через «+» шага).
  const addElement = useCallback(
    (kind: AddableElementKind) => {
      if (!selectedNodeId || !selectedNodeType) {
        notifications.showCommandFailure('Сначала выберите узел на канвасе');
        return;
      }
      if (selectedNodeType === 'form') {
        const form = findFormById(graphRef.current, selectedNodeId);
        const firstStep = form?.steps[0];
        if (!form || !firstStep) {
          notifications.showCommandFailure('У формы нет шага для добавления элемента');
          return;
        }
        runCommand(
          new AddFormComponent(
            form.id,
            firstStep.id,
            createDefaultFormComponent(kind as FormComponentKind, toFormComponentId(idGenerator.next())),
          ),
        );
        return;
      }
      const elementId = toElementId(idGenerator.next());
      if (selectedNodeType === 'home' && kind === 'widgetCard') {
        runCommand(
          new AddElement({ kind: 'homeWidgetCards' }, { id: elementId, title: NEW_LIST_ITEM_TITLE }),
        );
        return;
      }
      if (selectedNodeType === 'home') {
        runCommand(new AddElement({ kind: 'homeListItems' }, { id: elementId, title: NEW_LIST_ITEM_TITLE }));
        return;
      }
      runCommand(
        new AddElement(
          { kind: 'subScenarioListItems', scenarioId: selectedNodeId as ScenarioId },
          { id: elementId, title: NEW_LIST_ITEM_TITLE },
        ),
      );
    },
    [idGenerator, notifications, runCommand, selectedNodeId, selectedNodeType],
  );

  // «+» конкретного шага формы → компонент выбранного kind на этот шаг.
  const addElementToStep = useCallback(
    (formId: ApplicationFormId, stepId: FormStepId, kind: FormComponentKind) => {
      runCommand(
        new AddFormComponent(
          formId,
          stepId,
          createDefaultFormComponent(kind, toFormComponentId(idGenerator.next())),
        ),
      );
    },
    [idGenerator, runCommand],
  );

  // Корзина в заголовке узла: удаление страницы с каскадом связей
  // (RemoveHomePage/RemoveScenario/RemoveForm). Если удалённый узел был
  // выделен — выделение сбрасывается.
  const removeNode = useCallback(
    (node: CanvasNode) => {
      if (node.type === 'home') {
        runCommand(new RemoveHomePage());
      } else if (node.type === 'form') {
        runCommand(new RemoveForm(node.id as ApplicationFormId));
      } else {
        runCommand(new RemoveScenario(node.id as ScenarioId));
      }
      setSelectedNodeId((current) => (current === node.id ? null : current));
    },
    [runCommand],
  );

  const removeStep = useCallback(
    (formId: ApplicationFormId, stepId: FormStepId) => {
      runCommand(new RemoveFormStep(formId, stepId));
    },
    [runCommand],
  );

  // Интерактивные поля узлов (onDeleteNode, меню «+» шага и т.п.) адаптер
  // не строит — он чистый; внедряем здесь, поверх graphToFlow.
  const nodes = useMemo<CanvasNode[]>(
    () =>
      flow.nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          onDeleteNode: () => removeNode(node),
          ...(node.type === 'form'
            ? {
                elementKindOptions: ELEMENT_KIND_OPTIONS,
                onAddElementToStep: (stepId: string, kind: FormComponentKind) =>
                  addElementToStep(node.id as ApplicationFormId, stepId as FormStepId, kind),
                onDeleteStep: (stepId: string) =>
                  removeStep(node.id as ApplicationFormId, stepId as FormStepId),
              }
            : null),
        },
      })),
    [flow.nodes, removeNode, addElementToStep, removeStep],
  );

  const undo = useCallback(() => {
    const previous = commandBus.undo(graphRef.current);
    if (previous) {
      graphRef.current = previous;
      setGraph(previous);
    }
  }, [commandBus]);

  const redo = useCallback(() => {
    const next = commandBus.redo(graphRef.current);
    if (next) {
      graphRef.current = next;
      setGraph(next);
    }
  }, [commandBus]);

  return {
    nodes,
    edges: flow.edges,
    hasNodes: nodes.length > 0,
    hasHome: graph.homePage !== undefined,
    selectedNodeType,
    onSelectedNodeChange: setSelectedNodeId,
    connect,
    reconnect,
    disconnect,
    reorderInLayer,
    addNode,
    addElement,
    undo,
    redo,
    canUndo: commandBus.canUndo(),
    canRedo: commandBus.canRedo(),
  };
}
