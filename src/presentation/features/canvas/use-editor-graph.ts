import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Connection } from '@xyflow/react';
import type { ServiceGraph } from '@domain/model/service-graph';
import type { FormComponent } from '@domain/model/form-components';
import type { FormComponentKind } from '@domain/model/form-components';
import {
  toApplicationFormId,
  toElementId,
  toFormComponentId,
  toFormStepId,
  toLogicRuleId,
  toOptionId,
  toPageId,
  toPageLinkId,
  toScenarioId,
  type ApplicationFormId,
  type ElementId,
  type FormComponentId,
  type FormStepId,
  type LogicRuleId,
  type PageEntityId,
  type PageLinkId,
  type ScenarioId,
} from '@domain/model/ids';
import { PageLinkTargetIdSchema, type PageLinkTargetId } from '@domain/model/page-link';
import { computeGraphDepths } from '@domain/graph-depths';
import { validateGraph } from '@domain/invariants';
import type { Command } from '@application/commands/command';
import { InvariantViolationError } from '@application/commands/errors';
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
import { RemoveElement } from '@application/commands/remove-element';
import { MoveElement, type MoveElementTarget } from '@application/commands/move-element';
import { AddFormStep } from '@application/commands/add-form-step';
import { SetPageLayerDepth } from '@application/commands/set-page-layer-depth';
import { UpdateElementProps, type ElementPropsPatch } from '@application/commands/update-element-props';
import { EnableComplexLogic } from '@application/commands/enable-complex-logic';
import { DisableComplexLogic } from '@application/commands/disable-complex-logic';
import { AddLogicRule } from '@application/commands/add-logic-rule';
import { RemoveLogicRule } from '@application/commands/remove-logic-rule';
import {
  findElementLocation,
  findFormById,
  findFormComponent,
  walkPages,
} from '@application/commands/graph-lookup';
import { useContainer } from '@presentation/app/App';
import { useEditorNotifications } from '@presentation/features/notifications/editor-notifications';
import type { AddableElementKind, AddableNodeKind } from '@presentation/features/toolbar/editor-toolbar';
import type { CanvasSearchResult } from '@presentation/features/top-bar/editor-top-bar';
import type { DropAnchorPosition, ElementDragPayload } from './element-dnd';
import { computeLayout, type MeasuredNodeSizes } from './canvas-layout';
import {
  FORM_COMPONENT_KIND_LABELS,
  LOGIC_SOURCE_HANDLE_PREFIX,
  flowConnectionToLink,
  flowNodesToLayerOrder,
  graphToFlow,
  parseLogicSourceHandle,
  parseLogicTargetHandle,
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
import { mapViolationsToCanvas } from './violation-markers';
import { connectableTargets, type ConnectableTargets, type ConnectionSource } from '@domain/connection-rules';

// Варианты меню «+» шага формы: все kind из маппинга подписей адаптера
// (12 форм-компонентов манифеста), порядок — как в маппинге.
const ELEMENT_KIND_OPTIONS = Object.entries(FORM_COMPONENT_KIND_LABELS).map(([kind, label]) => ({
  kind: kind as FormComponentKind,
  label,
}));

// Источник связи по id source-handle: option Select'а — правило логики,
// иначе — навигационная связь от элемента (id handle = id элемента, D9).
function parseConnectionSource(handleId: string | null | undefined): ConnectionSource | null {
  if (!handleId) {
    return null;
  }
  if (handleId.startsWith(LOGIC_SOURCE_HANDLE_PREFIX)) {
    const logic = parseLogicSourceHandle(handleId);
    return logic ? { kind: 'logic', elementId: logic.elementId, optionId: logic.optionId } : null;
  }
  return { kind: 'navigation', elementId: handleId };
}

// Данные инспектора для выделенного элемента: сам компонент формы + его
// правила видимости, где он — цель (T-067).
export type SelectedElementInfo = {
  component: FormComponent;
  incomingRules: { ruleId: LogicRuleId; sourceLabel: string; optionLabel: string | null }[];
};

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
  const graphRepository = container.cradle.graphRepository;

  const [graph, setGraph] = useState<ServiceGraph>(() => createSampleGraph());
  // Актуальный граф в ref: колбэки react-flow не должны зависеть от замыканий
  // на устаревший state, а мутации идут только через CommandBus.
  const graphRef = useRef(graph);

  // Загрузка сохранённой карты при открытии редактора (T-053). Пока её нет
  // в хранилище — демо-граф. Если пользователь успел выполнить команду до
  // окончания загрузки, загруженное не затирает его правки.
  useEffect(() => {
    const initial = graphRef.current;
    let cancelled = false;
    graphRepository
      .load(initial.id)
      .then((loaded) => {
        if (cancelled || !loaded || graphRef.current !== initial) {
          return;
        }
        commandBus.reset();
        graphRef.current = loaded;
        setGraph(loaded);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          notifications.showSaveError(error instanceof Error ? error.message : String(error));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [graphRepository, commandBus, notifications]);

  // «Сохранить» (T-053): текущий граф → IGraphRepository; результат — единый
  // Snackbar страницы (T-023).
  const save = useCallback(() => {
    graphRepository
      .save(graphRef.current)
      .then(() => notifications.showSaveSuccess())
      .catch((error: unknown) =>
        notifications.showSaveError(
          `Не удалось сохранить: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
  }, [graphRepository, notifications]);

  // Фактические размеры узлов от react-flow (N12): стек колонки строится по
  // ним, чтобы зазор между узлами был ровно rowGap. Обновляется только при
  // реальном изменении (> 1px) — иначе пересчёт раскладки зациклился бы.
  const [measuredSizes, setMeasuredSizes] = useState<MeasuredNodeSizes>({});
  const reportNodeSizes = useCallback((sizes: MeasuredNodeSizes) => {
    setMeasuredSizes((current) => {
      let changed = false;
      const next = { ...current };
      for (const [id, size] of Object.entries(sizes)) {
        const previous = current[id];
        if (
          !previous ||
          Math.abs(previous.width - size.width) > 1 ||
          Math.abs(previous.height - size.height) > 1
        ) {
          next[id] = size;
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, []);

  const positions = useMemo(() => computeLayout(graph, measuredSizes), [graph, measuredSizes]);
  const flow = useMemo(() => graphToFlow(graph, positions), [graph, positions]);
  // Поиск по канвасу (T-050): узлы и элементы по вхождению подстроки без
  // учёта регистра; выбор результата = выделение + центрирование вьюпорта
  // (focus) + раскрытие сжатого узла (reveal в data узла).
  const searchCanvas = useCallback(
    (query: string): CanvasSearchResult[] => {
      const needle = query.toLocaleLowerCase();
      const matches = (text: string) => text.toLocaleLowerCase().includes(needle);
      const results: CanvasSearchResult[] = [];
      for (const node of flow.nodes) {
        if (matches(node.data.title)) {
          results.push({
            key: node.id,
            nodeId: node.id,
            elementId: null,
            title: node.data.title,
            context: node.data.subtitle,
          });
        }
        const elements = [...node.data.elements, ...node.data.steps.flatMap((step) => step.elements)];
        for (const element of elements) {
          if (matches(element.title)) {
            results.push({
              key: `${node.id}/${element.id}`,
              nodeId: node.id,
              elementId: element.id,
              title: element.title,
              context: `${element.kindLabel} · ${node.data.title}`,
            });
          }
        }
      }
      return results.slice(0, 20);
    },
    [flow.nodes],
  );
  const [focus, setFocus] = useState<{ nodeId: string; elementId: string | null; nonce: number } | null>(
    null,
  );

  // Нарушения инвариантов после каждой команды (T-043): подсветка узлов и
  // карточек. Команды отклоняют невалидные изменения, поэтому в обычной
  // работе список пуст; подсветка нужна для графов извне (загрузка, T-053).
  const violationMarkers = useMemo(() => mapViolationsToCanvas(graph, validateGraph(graph)), [graph]);

  // Выделенный на канвасе узел (клик): цель для меню добавления элементов
  // тулбара (T-034). Schema-driven панель атрибутов появится в T-041+.
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  // Выделенный элемент внутри узла (клик по карточке): Delete/Backspace
  // удаляет именно его (единое правило проекта: выделение + Delete).
  // Выделение узла и элемента взаимоисключающи — последний клик побеждает.
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const selectedNodeType: CanvasNodeType | null = useMemo(
    () => flow.nodes.find((node) => node.id === selectedNodeId)?.type ?? null,
    [flow.nodes, selectedNodeId],
  );
  // Выделение узлов — только явным кликом по узлу (onNodeClick канваса);
  // собственное выделение react-flow игнорируется. Раньше источником был
  // onSelectionChange, и он ловил промежуточное состояние канваса до
  // синхронизации с пропсами → выделение «качалось» между узлом и
  // элементом до Maximum update depth (N6, повторная приёмка).
  const handleNodeSelection = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
    if (nodeId !== null) {
      setSelectedElementId(null);
    }
  }, []);
  const selectElement = useCallback((elementId: string | null) => {
    setSelectedElementId(elementId);
    if (elementId !== null) {
      setSelectedNodeId(null);
    }
  }, []);
  // Выбор результата поиска (T-050): выделение по единому правилу (ADR-12)
  // + запрос центрирования/раскрытия (nonce — повторный выбор того же).
  const selectSearchResult = useCallback(
    (result: CanvasSearchResult) => {
      if (result.elementId !== null) {
        selectElement(result.elementId);
      } else {
        handleNodeSelection(result.nodeId);
      }
      setFocus((current) => ({
        nodeId: result.nodeId,
        elementId: result.elementId,
        nonce: (current?.nonce ?? 0) + 1,
      }));
    },
    [selectElement, handleNodeSelection],
  );
  // Клик по пустому полю канваса: снимает выделение со всего (единое
  // правило: выделение держится на сущности, пока не выбрана другая).
  const clearSelection = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedElementId(null);
  }, []);

  // Выделенный компонент формы + его правила видимости (цель) — данные
  // инспектора (T-067). Только компоненты форм: схемы element-schemas
  // покрывают form-kind'и (ADR-07), карточки страниц — в следующих сессиях.
  const selectedElement = useMemo<SelectedElementInfo | null>(() => {
    if (!selectedElementId) {
      return null;
    }
    const found = findFormComponent(graph, selectedElementId);
    if (!found) {
      return null;
    }
    const incomingRules = graph.logicRules
      .filter((rule) => rule.targetElementId === selectedElementId)
      .map((rule) => {
        const source = findFormComponent(graph, rule.sourceElementId)?.component;
        const sourceLabel = source && 'label' in source ? source.label : (source?.kind ?? 'Элемент');
        let optionLabel: string | null = null;
        if (rule.condition.kind === 'optionSelected' && source?.kind === 'selectList') {
          optionLabel =
            source.options.find((option) => option.value === rule.condition.optionId)?.label ?? null;
        }
        return { ruleId: rule.id, sourceLabel, optionLabel };
      });
    return { component: found.component, incomingRules };
  }, [graph, selectedElementId]);

  const runCommand = useCallback(
    (command: Command) => {
      try {
        const next = commandBus.execute(graphRef.current, command);
        graphRef.current = next;
        setGraph(next);
      } catch (error) {
        // Отказы команд (несуществующая цель и т.п.) — единый Snackbar
        // страницы (T-023), своих снекбаров у канваса нет.
        // Нарушение инвариантов — только человекочитаемые сообщения, без
        // технических rule/path.
        const message =
          error instanceof InvariantViolationError
            ? [...new Set(error.violations.map((violation) => violation.message))].join('; ')
            : error instanceof Error
              ? error.message
              : String(error);
        notifications.showCommandFailure(message);
      }
    },
    [commandBus, notifications],
  );

  // Создание связи drag'ом (T-032): Connection → поля связи (адаптер),
  // id — от IIdGenerator; слои доводит сама команда (D7, T-036).
  // Source-handle option'а (T-037) маршрутизируется в AddLogicRule —
  // это правило видимости, а не навигационная связь.
  const connect = useCallback(
    (connection: Connection) => {
      const sourceHandle = connection.sourceHandle ?? '';
      if (sourceHandle.startsWith(LOGIC_SOURCE_HANDLE_PREFIX)) {
        const source = parseLogicSourceHandle(sourceHandle);
        const targetElementId = connection.targetHandle
          ? parseLogicTargetHandle(connection.targetHandle)
          : null;
        if (!source || targetElementId === null) {
          return;
        }
        runCommand(
          new AddLogicRule({
            id: toLogicRuleId(idGenerator.next()),
            sourceElementId: toElementId(source.elementId),
            condition: { kind: 'optionSelected', optionId: toOptionId(source.optionId) },
            targetElementId: toElementId(targetElementId),
          }),
        );
        return;
      }
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
  // меняются только переданные концы, id связи стабилен. Рёбра правил
  // «Сложной логики» не переназначаются (адаптер помечает их
  // reconnectable: false, здесь — защита от обхода).
  const reconnect = useCallback(
    (oldEdge: CanvasEdge, connection: Connection) => {
      if (oldEdge.data?.kind === 'logic') {
        return;
      }
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

  // Удаление связей (выделенное ребро + Delete/Backspace) — по команде на
  // ребро; ребро правила видимости = удаление правила (T-037, L7).
  const disconnect = useCallback(
    (edges: CanvasEdge[]) => {
      for (const edge of edges) {
        if (edge.data?.kind === 'logic') {
          runCommand(new RemoveLogicRule(edge.id as LogicRuleId));
        } else {
          runCommand(new DisconnectElements(toPageLinkId(edge.id as PageLinkId)));
        }
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
      // Колонка нового узла — следующий уровень навигации за самой глубокой
      // страницей (замечание владельца: несвязанный узел не должен падать
      // в нулевую колонку); дальше узел переносится dnd между уровнями.
      const depths = computeGraphDepths(graphRef.current);
      const nextDepth = depths.size === 0 ? 0 : Math.max(...depths.values()) + 1;
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
            layerDepth: nextDepth,
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
          layerDepth: nextDepth,
        }),
      );
    },
    [idGenerator, runCommand],
  );

  // Перенос узла в другую колонку (уровень навигации) dnd'ом: явный
  // layerDepth; вертикальный порядок внутри новой колонки — по orderIndex.
  const moveNodeToDepth = useCallback(
    (nodeId: string, depth: number) => {
      runCommand(new SetPageLayerDepth(nodeId as PageEntityId, depth));
    },
    [runCommand],
  );

  // Удаление выделенного элемента по Delete/Backspace (единое правило
  // проекта: выделение + Delete). Возвращает true, если нажатие обработано,
  // — канвас тогда гасит событие, чтобы react-flow не удалил узел.
  const deleteSelectedElement = useCallback((): boolean => {
    if (!selectedElementId) {
      return false;
    }
    const elementId = selectedElementId;
    setSelectedElementId(null);
    runCommand(new RemoveElement(elementId as ElementId));
    return true;
  }, [runCommand, selectedElementId]);

  // Панель атрибутов (T-041): любое изменение поля — команда UpdateElementProps
  // (undo/redo из коробки, валидация — внутри команды).
  const updateElementProps = useCallback(
    (elementId: ElementId | FormComponentId, props: ElementPropsPatch) => {
      runCommand(new UpdateElementProps(elementId, props));
    },
    [runCommand],
  );

  // Удаление правила видимости из секции «Видимость» инспектора (T-067).
  const removeLogicRule = useCallback(
    (ruleId: LogicRuleId) => {
      runCommand(new RemoveLogicRule(ruleId));
    },
    [runCommand],
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

  // «+ Добавить шаг» на узле формы (N3): пустая колонка в конец формы.
  const addFormStep = useCallback(
    (formId: ApplicationFormId) => {
      runCommand(new AddFormStep(formId, { id: toFormStepId(idGenerator.next()), components: [] }));
    },
    [idGenerator, runCommand],
  );

  // Drop карточки элемента (N2): цель зависит от вида узла-приёмника
  // (доменные ограничения видов списков — полная проверка в команде
  // MoveElement, здесь только выбор приёмника). Якорь — позиция вставки.
  const moveElement = useCallback(
    (
      nodeId: string,
      nodeType: CanvasNodeType,
      targetStepId: string | null,
      dragged: ElementDragPayload,
      anchor: DropAnchorPosition | null,
    ) => {
      let target: MoveElementTarget;
      if (nodeType === 'home') {
        target = dragged.kind === 'widgetCard' ? { kind: 'homeWidgetCards' } : { kind: 'homeListItems' };
      } else if (nodeType === 'subScenario') {
        target = { kind: 'subScenarioListItems', scenarioId: nodeId as ScenarioId };
      } else {
        if (!targetStepId) {
          notifications.showCommandFailure('Переносите компонент в конкретный шаг формы');
          return;
        }
        target = {
          kind: 'formStep',
          formId: nodeId as ApplicationFormId,
          stepId: targetStepId as FormStepId,
        };
      }
      runCommand(
        new MoveElement(
          dragged.elementId as ElementId,
          target,
          anchor ? { elementId: anchor.elementId as ElementId, placement: anchor.placement } : undefined,
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
      const location = findElementLocation(graphRef.current, elementId);
      const component = location?.kind === 'formComponent' ? location.list[location.index] : null;
      if (!component || component.kind !== 'selectList') {
        return;
      }
      const componentId = component.id as FormComponentId;
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
        runCommand(new EnableComplexLogic(componentId));
      }
    },
    [runCommand],
  );

  // Интерактивные поля узлов (onDeleteNode, меню «+» шага и т.п.) адаптер
  // не строит — он чистый; внедряем здесь, поверх graphToFlow. Карточкам
  // элементов внедряются выделение (selected/onSelect — Delete удаляет
  // выделенный элемент) и переключатель «Сложной логики» (T-037).
  // Признак «можно соединить» (повторная приёмка, ADR-14): пока тянется
  // связь, допустимые цели — по доменному правилу connectableTargets —
  // получают connectTarget — их target-handle (невидимый, во всю сущность)
  // принимает drop/клик курсора; в покое
  // принимающих handles нет. Тот же расчёт проверяет связь (isConnectionAllowed).
  const [connectionTargets, setConnectionTargets] = useState<ConnectableTargets | null>(null);
  const startConnection = useCallback((handleId: string | null | undefined) => {
    const source = parseConnectionSource(handleId);
    setConnectionTargets(source ? connectableTargets(graphRef.current, source) : null);
  }, []);
  const endConnection = useCallback(() => setConnectionTargets(null), []);
  const isConnectionAllowed = useCallback((connection: Connection | CanvasEdge): boolean => {
    const source = parseConnectionSource(connection.sourceHandle);
    if (!source) {
      return false;
    }
    const targets = connectableTargets(graphRef.current, source);
    if (source.kind === 'logic') {
      const targetElementId = connection.targetHandle
        ? parseLogicTargetHandle(connection.targetHandle)
        : null;
      return targetElementId !== null && targets.elements.has(targetElementId);
    }
    // Навигационная связь приходит в target-handle блока, не в logic-handle элемента.
    if (connection.targetHandle && parseLogicTargetHandle(connection.targetHandle) !== null) {
      return false;
    }
    return targets.pages.has(connection.target);
  }, []);

  // Узлы для канваса: интерактивные поля (обработчики, мета) внедряются
  // поверх чистого адаптера. Производительность выделения (повторная
  // приёмка: «лаг» при перекликивании): узел пересоздаётся, только если
  // изменилось ЕГО состояние (выделение, цель связи, поиск) — остальные
  // объекты сохраняют идентичность, и react-flow их не перерисовывает.
  const nodeCacheRef = useRef(new Map<string, { base: CanvasNode; key: string; result: CanvasNode }>());
  const nodeHandlers = useMemo(
    () => ({
      removeNode,
      addElementToStep,
      removeStep,
      addFormStep,
      moveElement,
      toggleComplexLogic,
      selectElement,
    }),
    [removeNode, addElementToStep, removeStep, addFormStep, moveElement, toggleComplexLogic, selectElement],
  );
  const nodeHandlersRef = useRef(nodeHandlers);
  const nodes = useMemo<CanvasNode[]>(() => {
    if (nodeHandlersRef.current !== nodeHandlers) {
      nodeHandlersRef.current = nodeHandlers;
      nodeCacheRef.current.clear();
    }
    const cache = nodeCacheRef.current;
    const next = new Map<string, { base: CanvasNode; key: string; result: CanvasNode }>();
    const result = flow.nodes.map((node) => {
      const elementIds = [...node.data.elements, ...node.data.steps.flatMap((step) => step.elements)].map(
        (element) => element.id,
      );
      const selected = selectedElementId === null && node.id === selectedNodeId;
      const key = [
        selected,
        selectedElementId !== null && elementIds.includes(selectedElementId) ? selectedElementId : '',
        focus?.nodeId === node.id ? focus.nonce : '',
        connectionTargets?.pages.has(node.id) ?? false,
        elementIds.filter((id) => connectionTargets?.elements.has(id)).join(','),
      ].join('|');
      const cached = cache.get(node.id);
      if (cached && cached.base === node && cached.key === key) {
        next.set(node.id, cached);
        return cached.result;
      }
      const injectElement = (element: CanvasNode['data']['elements'][number]) => ({
        ...element,
        selected: element.id === selectedElementId,
        connectTarget: connectionTargets?.elements.has(element.id) ?? false,
        violations: violationMarkers.elements.get(element.id),
        onSelect: () => nodeHandlers.selectElement(element.id),
        ...(element.complexLogic
          ? { onToggleComplexLogic: () => nodeHandlers.toggleComplexLogic(element.id) }
          : null),
      });
      const built: CanvasNode = {
        ...node,
        // Выделение узла управляется отсюда (N6); взаимоисключение с элементом (F5).
        selected,
        data: {
          ...node.data,
          onDeleteNode: () => nodeHandlers.removeNode(node),
          connectTarget: connectionTargets?.pages.has(node.id) ?? false,
          violations: violationMarkers.nodes.get(node.id),
          ...(focus?.nodeId === node.id && focus.elementId !== null
            ? { reveal: { elementId: focus.elementId, nonce: focus.nonce } }
            : null),
          elements: node.data.elements.map(injectElement),
          steps: node.data.steps.map((step) => ({
            ...step,
            elements: step.elements.map(injectElement),
          })),
          ...(node.type === 'form'
            ? {
                elementKindOptions: ELEMENT_KIND_OPTIONS,
                onAddElementToStep: (stepId: string, kind: FormComponentKind) =>
                  nodeHandlers.addElementToStep(node.id as ApplicationFormId, stepId as FormStepId, kind),
                onDeleteStep: (stepId: string) =>
                  nodeHandlers.removeStep(node.id as ApplicationFormId, stepId as FormStepId),
                onAddStep: () => nodeHandlers.addFormStep(node.id as ApplicationFormId),
              }
            : null),
          onDropElement: (
            targetStepId: string | null,
            dragged: ElementDragPayload,
            anchor: DropAnchorPosition | null,
          ) => nodeHandlers.moveElement(node.id, node.type, targetStepId, dragged, anchor),
        },
      };
      next.set(node.id, { base: node, key, result: built });
      return built;
    });
    nodeCacheRef.current = next;
    return result;
  }, [
    flow.nodes,
    nodeHandlers,
    selectedElementId,
    selectedNodeId,
    violationMarkers,
    focus,
    connectionTargets,
  ]);

  // Удаление выделенных узлов по Delete/Backspace: react-flow присылает их
  // в onNodesDelete, каждый уходит своей командой с каскадом связей (T-034).
  const removeNodes = useCallback(
    (deleted: CanvasNode[]) => {
      for (const node of deleted) {
        removeNode(node);
      }
    },
    [removeNode],
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
    onSelectedNodeChange: handleNodeSelection,
    reportNodeSizes,
    clearSelection,
    selectedElement,
    updateElementProps,
    removeLogicRule,
    toggleComplexLogic,
    connect,
    reconnect,
    disconnect,
    reorderInLayer,
    moveNodeToDepth,
    removeNodes,
    deleteSelectedElement,
    addNode,
    addElement,
    undo,
    redo,
    save,
    startConnection,
    endConnection,
    isConnectionAllowed,
    connecting: connectionTargets !== null,
    searchCanvas,
    selectSearchResult,
    focus,
    canUndo: commandBus.canUndo(),
    canRedo: commandBus.canRedo(),
  };
}
