import { useCallback, useMemo, useRef } from 'react';
import type { CanvasElement, CanvasElementKind } from '@domain/model/canvas-element';
import { canBeLogicSource, kindRules } from '@domain/element-kinds';
import type { EditorRules } from '@domain/editor-rules';
import { useEditorRules } from '@presentation/features/settings/use-settings';
import {
  toApplicationFormId,
  toElementId,
  toFormStepId,
  toPageEntityId,
  toPageId,
  toScenarioId,
  type ElementId,
} from '@domain/model/ids';
import { ReorderInLayer } from '@application/commands/reorder-in-layer';
import { AddHomePage } from '@application/commands/add-home-page';
import { RemoveHomePage } from '@application/commands/remove-home-page';
import { AddScenario } from '@application/commands/add-scenario';
import { RemoveScenario } from '@application/commands/remove-scenario';
import { AddForm } from '@application/commands/add-form';
import { RemoveForm } from '@application/commands/remove-form';
import { RemoveFormStep } from '@application/commands/remove-form-step';
import { AddElement, type CanvasElementTarget } from '@application/commands/add-element';
import { RemoveElement } from '@application/commands/remove-element';
import { MoveElement, type MoveElementTarget } from '@application/commands/move-element';
import { AddFormStep } from '@application/commands/add-form-step';
import { MoveFormStep } from '@application/commands/move-form-step';
import { SwapFormSteps } from '@application/commands/swap-form-steps';
import { SetPageLayerDepth } from '@application/commands/set-page-layer-depth';
import { UpdateElementProps, type ElementPropsPatch } from '@application/commands/update-element-props';
import { EnableComplexLogic } from '@application/commands/enable-complex-logic';
import { DisableComplexLogic } from '@application/commands/disable-complex-logic';
import { findElementLocation, findFormById } from '@application/commands/graph-lookup';
import { findElementInGraph } from '@domain/element-containers';
import { supportsLogic } from '@domain/connection-matrix';
import { useContainer } from '@presentation/app/App';
import { useEditorNotifications } from '@presentation/features/notifications/editor-notifications';
import type { AddableElementKind, AddableNodeKind } from '@presentation/features/toolbar/editor-toolbar';
import type { DropAnchorPosition, ElementDragPayload } from './element-dnd';
import type { StepAnchorPosition } from './step-dnd';
import {
  useElementCatalog,
  type ElementCatalog,
} from '@presentation/features/element-catalog/element-catalog';
import { flowNodesToLayerOrder, type CanvasNode, type CanvasNodeType } from './graph-flow-adapter';
import {
  NEW_FORM_TITLE,
  NEW_SCENARIO_TITLE,
  cloneElementWithId,
  createDefaultElement,
} from './default-elements';
import type { CanvasActions } from './canvas-interaction';
import { useEditorStore } from './editor-store';
import { useSelection } from './use-selection';
import { useConnection } from './use-connection';
import { searchCanvasNodes, useCanvasSearch } from './use-canvas-search';
import { useCanvasNodes } from './use-canvas-nodes';

export type { SelectedElementInfo } from './use-selection';

// Варианты меню «+» шага формы: все элементы политики редактора — любой
// элемент в любой блок [owner 2026-10-13, ADR-17]. Комментарий-элемент
// добавляется отдельной кнопкой тулбара [owner 2026-10-15].
function elementKindOptions(
  catalog: ElementCatalog,
  rules: EditorRules,
): ReadonlyArray<{ kind: CanvasElementKind; label: string }> {
  return catalog.schemas
    .filter((schema) => kindRules(rules, schema.kind).inAddMenu)
    .map((schema) => ({ kind: schema.kind, label: schema.label }));
}

// Хук страницы редактора — композиция (ревью A3, R3): хранилище графа
// (editor-store), выделение, связи, поиск и узлы канваса — отдельные хуки;
// здесь — маппинг событий канваса и тулбара в команды. Публичный интерфейс
// для EditorPage не изменился. TEMPORARY до effector (см. editor-store.ts).
export function useEditorGraph() {
  const container = useContainer();
  // Правила редактора из настроек (R-ADM) — те же, что у команд.
  const rules = useEditorRules();
  const notifications = useEditorNotifications();
  const idGenerator = container.cradle.idGenerator;
  const catalog = useElementCatalog();
  // props нового элемента — defaults его описания (политика редактора).
  const newElement = useCallback(
    (kind: CanvasElementKind) =>
      createDefaultElement(kind, idGenerator.next(), catalog.schema(kind)?.defaults ?? {}),
    [catalog, idGenerator],
  );

  const { graph, graphRef, runCommand, undo, redo, save, exportJson, canUndo, canRedo } = useEditorStore();
  const {
    selectedNodeId,
    selectedElementId,
    selectedStepId,
    selectedElement,
    selectNode,
    selectElement,
    clearSelection,
    forgetNode,
  } = useSelection(graph);
  const {
    connect,
    reconnect,
    disconnect,
    startConnection,
    endConnection,
    isConnectionAllowed,
    connectionTargets,
  } = useConnection(graphRef, runCommand, idGenerator);

  const { focus, selectSearchResult } = useCanvasSearch(selectNode, selectElement);
  const { nodes, edges, flowNodes, reportNodeSizes, reportElementRows, interactionStore } = useCanvasNodes(
    graph,
    {
      selectedNodeId,
      selectedElementId,
      selectedStepId,
      connectionTargets,
    },
  );
  const searchCanvas = useCallback((query: string) => searchCanvasNodes(flowNodes, query), [flowNodes]);

  const selectedNodeType: CanvasNodeType | null = useMemo(
    () => flowNodes.find((node) => node.id === selectedNodeId)?.type ?? null,
    [flowNodes, selectedNodeId],
  );

  // Перестановка внутри слоя (T-036, D13): вертикальный drag узла, порядок
  // после drag — по Y (flowNodesToLayerOrder адаптера). Команде передаётся
  // якорь — сосед в колонке и сторона (ревью A3, R3); индексы общей
  // последовательности orderIndex считает сама ReorderInLayer.
  const reorderInLayer = useCallback(
    (draggedNode: CanvasNode, layerNodes: CanvasNode[]) => {
      const desired = flowNodesToLayerOrder(layerNodes);
      const current = [...layerNodes]
        .sort((left, right) => left.data.orderIndex - right.data.orderIndex)
        .map((node) => node.id);
      const slot = desired.indexOf(toPageEntityId(draggedNode.id));
      if (slot < 0 || current.indexOf(draggedNode.id) === slot) {
        return; // порядок не изменился — команда не нужна
      }
      const anchor =
        slot > 0
          ? { pageId: desired[slot - 1]!, placement: 'after' as const }
          : { pageId: desired[1]!, placement: 'before' as const };
      runCommand(new ReorderInLayer(toPageEntityId(draggedNode.id), anchor));
    },
    [runCommand],
  );

  // --- Добавление/удаление (T-034): все мутации — команды через CommandBus,
  // id — от IIdGenerator; после команды раскладка пересчитывается сама. ---

  // Узел из меню тулбара: Главная (только если её нет — пункт меню тогда
  // отключён, дубль здесь отклонит команда), Подсценарий, Форма заявки.
  // Порядок (orderIndex, D13) и колонку (следующий уровень за самой глубокой
  // страницей) выдаёт команда (ревью A3, R3); связь — позже drag'ом.
  const addNode = useCallback(
    (kind: AddableNodeKind) => {
      if (kind === 'home') {
        runCommand(new AddHomePage({ id: toPageId(idGenerator.next()), elements: [] }));
        return;
      }
      if (kind === 'subScenario') {
        runCommand(
          new AddScenario({
            id: toScenarioId(idGenerator.next()),
            title: NEW_SCENARIO_TITLE,
            elements: [],
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
          steps: [{ id: toFormStepId(idGenerator.next()), elements: [] }],
        }),
      );
    },
    [idGenerator, runCommand],
  );

  // Перенос узла в другую колонку (уровень навигации) dnd'ом: явный
  // layerDepth; вертикальный порядок внутри новой колонки — по orderIndex.
  const moveNodeToDepth = useCallback(
    (nodeId: string, depth: number) => {
      runCommand(new SetPageLayerDepth(toPageEntityId(nodeId), depth));
    },
    [runCommand],
  );

  // Удаление выделенного элемента по Delete/Backspace (единое правило
  // проекта: выделение + Delete). Возвращает true, если нажатие обработано,
  // — канвас тогда гасит событие, чтобы react-flow не удалил узел.
  // Выделенный шаг формы (S10) удаляется сам, а не вся форма (T-035).
  const deleteSelectedElement = useCallback((): boolean => {
    if (selectedElementId) {
      const elementId = selectedElementId;
      selectElement(null);
      runCommand(new RemoveElement(toElementId(elementId)));
      return true;
    }
    if (selectedNodeType === 'form' && selectedNodeId && selectedStepId) {
      const formId = selectedNodeId;
      const stepId = selectedStepId;
      selectNode(formId);
      runCommand(new RemoveFormStep(toApplicationFormId(formId), toFormStepId(stepId)));
      return true;
    }
    return false;
  }, [
    runCommand,
    selectElement,
    selectNode,
    selectedElementId,
    selectedNodeId,
    selectedNodeType,
    selectedStepId,
  ]);

  // Панель атрибутов (T-041): любое изменение поля — команда UpdateElementProps
  // (undo/redo из коробки, валидация — внутри команды).
  const updateElementProps = useCallback(
    (elementId: ElementId, props: ElementPropsPatch) => {
      runCommand(new UpdateElementProps(elementId, props));
    },
    [runCommand],
  );

  // Элемент из меню тулбара — в выделенный узел канваса; любой вид в любой
  // узел [owner 2026-10-13, ADR-17]. У формы — в выделенный шаг (S10), если
  // выделена форма целиком — в первый.
  // Блок выделенного узла — приёмник нового элемента; null — отказ уже
  // показан пользователю. Общее ядро меню тулбара и вставки из буфера.
  const selectedNodeTarget = useCallback((): CanvasElementTarget | null => {
    if (!selectedNodeId || !selectedNodeType) {
      notifications.showCommandFailure('Сначала выберите узел на канвасе');
      return null;
    }
    if (selectedNodeType === 'form') {
      const form = findFormById(graphRef.current, selectedNodeId);
      const step = form?.steps.find((candidate) => candidate.id === selectedStepId) ?? form?.steps[0];
      if (!form || !step) {
        notifications.showCommandFailure('У формы нет шага для добавления элемента');
        return null;
      }
      return { kind: 'formStep', formId: form.id, stepId: step.id };
    }
    if (selectedNodeType === 'home') {
      return { kind: 'home' };
    }
    return { kind: 'subScenario', scenarioId: toScenarioId(selectedNodeId) };
  }, [graphRef, notifications, selectedNodeId, selectedNodeType, selectedStepId]);

  const addElement = useCallback(
    (kind: AddableElementKind) => {
      const target = selectedNodeTarget();
      if (target) {
        runCommand(new AddElement(target, newElement(kind)));
      }
    },
    [newElement, runCommand, selectedNodeTarget],
  );

  // Буфер обмена элементов (хоткеи Ctrl+C/X/V [owner 2026-10-15]): копия
  // элемента в памяти редактора, системный буфер не трогается. Обработчики
  // возвращают false, если делать нечего, — тогда работает действие браузера.
  const clipboardRef = useRef<CanvasElement | null>(null);

  const copySelectedElement = useCallback((): boolean => {
    const location = selectedElementId ? findElementLocation(graphRef.current, selectedElementId) : null;
    const element = location?.list[location.index];
    if (!element) {
      return false;
    }
    clipboardRef.current = structuredClone(element);
    return true;
  }, [graphRef, selectedElementId]);

  // Вырезать = копировать + штатное удаление выделенного элемента (RemoveElement).
  const cutSelectedElement = useCallback(
    (): boolean => copySelectedElement() && deleteSelectedElement(),
    [copySelectedElement, deleteSelectedElement],
  );

  // Вставка: выделен элемент — в его блок, иначе — в выделенный узел (как
  // меню тулбара). Копия получает новый id и становится выделенной.
  const pasteElement = useCallback((): boolean => {
    const copied = clipboardRef.current;
    if (!copied) {
      return false;
    }
    const location = selectedElementId ? findElementLocation(graphRef.current, selectedElementId) : null;
    let target: CanvasElementTarget | null;
    if (location?.container.kind === 'formStep') {
      target = {
        kind: 'formStep',
        formId: toApplicationFormId(location.container.formId),
        stepId: toFormStepId(location.container.stepId),
      };
    } else if (location) {
      target =
        location.container.pageId === graphRef.current.homePage?.id
          ? { kind: 'home' }
          : { kind: 'subScenario', scenarioId: toScenarioId(location.container.pageId) };
    } else {
      target = selectedNodeTarget();
    }
    if (target) {
      const element = cloneElementWithId(copied, idGenerator.next());
      runCommand(new AddElement(target, element));
      if (findElementLocation(graphRef.current, element.id)) {
        selectElement(element.id);
      }
    }
    return true;
  }, [graphRef, idGenerator, runCommand, selectElement, selectedElementId, selectedNodeTarget]);

  // «+» конкретного шага формы → элемент выбранного вида на этот шаг.
  const addElementToStep = useCallback(
    (formId: string, stepId: string, kind: CanvasElementKind) => {
      runCommand(
        new AddElement(
          { kind: 'formStep', formId: toApplicationFormId(formId), stepId: toFormStepId(stepId) },
          newElement(kind),
        ),
      );
    },
    [newElement, runCommand],
  );

  // Корзина в заголовке узла: удаление страницы с каскадом связей
  // (RemoveHomePage/RemoveScenario/RemoveForm). Если удалённый узел был
  // выделен — выделение сбрасывается.
  const removeNode = useCallback(
    (nodeId: string, nodeType: CanvasNodeType) => {
      if (nodeType === 'home') {
        runCommand(new RemoveHomePage());
      } else if (nodeType === 'form') {
        runCommand(new RemoveForm(toApplicationFormId(nodeId)));
      } else {
        runCommand(new RemoveScenario(toScenarioId(nodeId)));
      }
      forgetNode(nodeId);
    },
    [runCommand, forgetNode],
  );

  const removeStep = useCallback(
    (formId: string, stepId: string) => {
      runCommand(new RemoveFormStep(toApplicationFormId(formId), toFormStepId(stepId)));
    },
    [runCommand],
  );

  // «+ Добавить шаг» на узле формы (N3): пустой шаг на следующий уровень формы.
  const addFormStep = useCallback(
    (formId: string) => {
      runCommand(
        new AddFormStep(toApplicationFormId(formId), { id: toFormStepId(idGenerator.next()), elements: [] }),
      );
    },
    [idGenerator, runCommand],
  );

  // Dnd шага формы за заголовок [owner 2026-10-14]: порядок в своём уровне
  // или перенос на другой уровень (layerDepth) — каскад переходов в команде.
  const moveStep = useCallback(
    (formId: string, stepId: string, anchor: StepAnchorPosition | null, layerDepth?: number) => {
      runCommand(
        new MoveFormStep(
          toApplicationFormId(formId),
          toFormStepId(stepId),
          anchor ? { stepId: toFormStepId(anchor.stepId), placement: anchor.placement } : null,
          layerDepth,
        ),
      );
    },
    [runCommand],
  );

  // Обмен шагов формы местами [owner 2026-10-15]: dnd шага на середину другого.
  const swapSteps = useCallback(
    (formId: string, stepId: string, otherStepId: string) => {
      runCommand(
        new SwapFormSteps(toApplicationFormId(formId), toFormStepId(stepId), toFormStepId(otherStepId)),
      );
    },
    [runCommand],
  );

  // Drop карточки элемента (N2): приёмник — блок узла (у формы — шаг);
  // вид элемента блок не ограничивает [owner 2026-10-13]. Якорь — позиция вставки.
  const moveElement = useCallback(
    (
      nodeId: string,
      nodeType: CanvasNodeType,
      targetStepId: string | null,
      dragged: ElementDragPayload,
      anchor: DropAnchorPosition | null,
      layerDepth?: number,
    ) => {
      let target: MoveElementTarget;
      if (nodeType === 'home') {
        target = { kind: 'home' };
      } else if (nodeType === 'subScenario') {
        target = { kind: 'subScenario', scenarioId: toScenarioId(nodeId) };
      } else {
        if (!targetStepId) {
          notifications.showCommandFailure('Переносите элемент в конкретный шаг формы');
          return;
        }
        target = {
          kind: 'formStep',
          formId: toApplicationFormId(nodeId),
          stepId: toFormStepId(targetStepId),
        };
      }
      runCommand(
        new MoveElement(
          toElementId(dragged.elementId),
          target,
          anchor ? { elementId: toElementId(anchor.elementId), placement: anchor.placement } : undefined,
          target.kind === 'formStep' ? layerDepth : undefined,
        ),
      );
    },
    [notifications, runCommand],
  );

  // Чип «Сложная логика» на карточке Select'а (T-037/T-066, L4): включение
  // открывает option-handle'ы, выключение при наличии правил — с
  // подтверждением и каскадным удалением рёбер (каскад — внутри команды,
  // undo возвращает и флаг, и правила). TEMPORARY до инспектора (T-067):
  // переключатель живёт на чипе, а не в панели атрибутов; подтверждение —
  // нативный confirm до появления диалогов дизайн-системы.
  const toggleComplexLogic = useCallback(
    (elementId: string) => {
      // Режим логики — у источника логики (element-kinds) в блоке с логикой
      // (connection-matrix, R-CFG-2); выключить можно в любом блоке.
      const found = findElementInGraph(graphRef.current, elementId);
      const component = found?.element;
      if (!found || !component || !canBeLogicSource(rules, component)) {
        return;
      }
      if (!component.hasComplexLogic && !supportsLogic(rules, found.container)) {
        return;
      }
      const componentId = component.id;
      if (component.hasComplexLogic) {
        const rulesCount = graphRef.current.logicRules.filter(
          (rule) => rule.sourceElementId === elementId,
        ).length;
        if (
          rulesCount > 0 &&
          !window.confirm(`Выключить сложную логику? Связанные правила будут удалены: ${rulesCount}.`)
        ) {
          return;
        }
        runCommand(new DisableComplexLogic(componentId));
      } else {
        // Вариант с логикой не ведёт на шаг (connection-matrix, [owner 2026-10-16]):
        // его переходы команда удалит каскадом — спрашиваем, как при выключении.
        const transitionsCount = graphRef.current.stepTransitions.filter(
          (transition) => transition.sourceElementId === elementId && transition.optionId !== undefined,
        ).length;
        if (
          transitionsCount > 0 &&
          !window.confirm(
            `Включить сложную логику? Переходы вариантов на шаги будут удалены: ${transitionsCount}.`,
          )
        ) {
          return;
        }
        runCommand(new EnableComplexLogic(componentId));
      }
    },
    [runCommand, rules],
  );

  // Действия узлов и карточек — стабильный объект в контексте канваса
  // (ревью A4): все обработчики стабильны, замыканий в data больше нет.
  const canvasActions = useMemo<CanvasActions>(
    () => ({
      selectElement,
      toggleComplexLogic,
      removeNode,
      addElementToStep,
      removeStep,
      addFormStep,
      moveStep,
      swapSteps,
      moveElement,
      reportElementRows,
      elementKindOptions: elementKindOptions(catalog, rules),
    }),
    [
      catalog,
      rules,
      reportElementRows,
      selectElement,
      toggleComplexLogic,
      removeNode,
      addElementToStep,
      removeStep,
      addFormStep,
      moveStep,
      swapSteps,
      moveElement,
    ],
  );

  // Удаление выделенных узлов по Delete/Backspace: react-flow присылает их
  // в onNodesDelete, каждый уходит своей командой с каскадом связей (T-034).
  const removeNodes = useCallback(
    (deleted: CanvasNode[]) => {
      for (const node of deleted) {
        if (node.type) {
          removeNode(node.id, node.type);
        }
      }
    },
    [removeNode],
  );

  return {
    nodes,
    edges,
    interactionStore,
    canvasActions,
    hasNodes: nodes.length > 0,
    hasHome: graph.homePage !== undefined,
    selectedNodeType,
    onSelectedNodeChange: selectNode,
    reportNodeSizes,
    clearSelection,
    selectedElement,
    updateElementProps,
    toggleComplexLogic,
    connect,
    reconnect,
    disconnect,
    reorderInLayer,
    moveNodeToDepth,
    removeNodes,
    deleteSelectedElement,
    copySelectedElement,
    cutSelectedElement,
    pasteElement,
    addNode,
    addElement,
    undo,
    redo,
    save,
    exportJson,
    startConnection,
    endConnection,
    isConnectionAllowed,
    connecting: connectionTargets !== null,
    searchCanvas,
    selectSearchResult,
    focus,
    canUndo,
    canRedo,
  };
}
