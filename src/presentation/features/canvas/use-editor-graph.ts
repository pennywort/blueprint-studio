import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Connection } from '@xyflow/react';
import type { ServiceGraph } from '@domain/model/service-graph';
import type { CanvasElement, CanvasElementKind } from '@domain/model/canvas-element';
import {
  toApplicationFormId,
  toElementId,
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
import { AddElement, type CanvasElementTarget } from '@application/commands/add-element';
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
  ELEMENT_KIND_LABELS,
  LOGIC_SOURCE_HANDLE_PREFIX,
  flowConnectionToLink,
  flowNodesToLayerOrder,
  graphToFlow,
  parseLogicSourceHandle,
  parseLogicTargetHandle,
  type CanvasEdge,
  type CanvasNode,
  type CanvasNodeType,
  type FlowGraph,
} from './graph-flow-adapter';
import { NEW_FORM_TITLE, NEW_SCENARIO_TITLE, createDefaultElement } from './default-elements';
import { mapViolationsToCanvas } from './violation-markers';
import { createCanvasInteractionStore, type CanvasActions } from './canvas-interaction';
import { connectableTargets, type ConnectableTargets, type ConnectionSource } from '@domain/connection-rules';

// Варианты меню «+» шага формы: все виды элементов (List item, Widget card,
// 12 форм-компонентов) — любой элемент в любой блок [owner 2026-10-13, ADR-17].
const ELEMENT_KIND_OPTIONS = Object.entries(ELEMENT_KIND_LABELS).map(([kind, label]) => ({
  kind: kind as CanvasElementKind,
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
  component: CanvasElement;
  /** Элемент лежит в шаге формы — только там возможна «Сложная логика» (L-I5). */
  inFormStep: boolean;
  incomingRules: { ruleId: LogicRuleId; sourceLabel: string; optionLabel: string | null }[];
};

// TEMPORARY (до effector — запланирован, но не установлен): ServiceGraph живёт
// в React state страницы редактора. Мутации — ТОЛЬКО через
// commandBus.execute/undo/redo (конституция, железное правило 1); после каждой
// команды узлы/рёбра пересчитываются: computeLayout(graph) → positions →
// graphToFlow(graph, positions). Начальное значение — graphSeed из DI
// (демо-граф или нагрузочный граф стенда stress-demo).
// При появлении effector хук заменяется подпиской на стор, публичная
// сигнатура сохраняется.
export function useEditorGraph() {
  const container = useContainer();
  const notifications = useEditorNotifications();
  const commandBus = container.cradle.commandBus;
  const idGenerator = container.cradle.idGenerator;
  const graphRepository = container.cradle.graphRepository;

  const [graph, setGraph] = useState<ServiceGraph>(() => container.cradle.graphSeed());
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
  // Измерения копятся за кадр и применяются одним проходом раскладки
  // (ревью P2, R2): react-flow присылает размеры пачками, и каждая пачка
  // раньше давала полную раскладку (44 раскладки на загрузке стенда).
  const [measuredSizes, setMeasuredSizes] = useState<MeasuredNodeSizes>({});
  const pendingSizesRef = useRef<Record<string, { width: number; height: number }>>({});
  const sizesFrameRef = useRef<number | null>(null);
  const reportNodeSizes = useCallback((sizes: MeasuredNodeSizes) => {
    Object.assign(pendingSizesRef.current, sizes);
    if (sizesFrameRef.current !== null) {
      return;
    }
    sizesFrameRef.current = requestAnimationFrame(() => {
      sizesFrameRef.current = null;
      const pending = pendingSizesRef.current;
      pendingSizesRef.current = {};
      setMeasuredSizes((current) => {
        let changed = false;
        const next = { ...current };
        for (const [id, size] of Object.entries(pending)) {
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
    });
  }, []);
  useEffect(
    () => () => {
      if (sizesFrameRef.current !== null) {
        cancelAnimationFrame(sizesFrameRef.current);
      }
    },
    [],
  );

  const positions = useMemo(() => computeLayout(graph, measuredSizes), [graph, measuredSizes]);
  // Структурное разделение (ревью P1, R2): прошлый результат передаётся в
  // адаптер — неизменённые узлы, data, карточки и рёбра сохраняют
  // идентичность, смена позиции не пересоздаёт data.
  const previousFlowRef = useRef<FlowGraph | undefined>(undefined);
  const flow = useMemo(() => {
    const next = graphToFlow(graph, positions, previousFlowRef.current);
    previousFlowRef.current = next;
    return next;
  }, [graph, positions]);
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
  // Выделенный шаг формы (S10, §6): нажатие по шагу выделяет форму и шаг —
  // меню элементов тулбара добавляет в него, а не в первый шаг.
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const selectedNodeType: CanvasNodeType | null = useMemo(
    () => flow.nodes.find((node) => node.id === selectedNodeId)?.type ?? null,
    [flow.nodes, selectedNodeId],
  );
  // Выделение узлов — только явным кликом по узлу (onNodeClick канваса);
  // собственное выделение react-flow игнорируется. Раньше источником был
  // onSelectionChange, и он ловил промежуточное состояние канваса до
  // синхронизации с пропсами → выделение «качалось» между узлом и
  // элементом до Maximum update depth (N6, повторная приёмка).
  const handleNodeSelection = useCallback((nodeId: string | null, stepId: string | null = null) => {
    setSelectedNodeId(nodeId);
    setSelectedStepId(nodeId !== null ? stepId : null);
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

  // Выделенный элемент + его правила видимости (цель) — данные панели
  // атрибутов (T-041/T-067). Любой вид элемента (ADR-17): у List item/Widget
  // card — проектные stub-схемы (ADR-07).
  const selectedElement = useMemo<SelectedElementInfo | null>(() => {
    if (!selectedElementId) {
      return null;
    }
    // Компонент формы в любом блоке [owner 2026-10-13]: схема — по kind.
    const location = findElementLocation(graph, selectedElementId);
    const component = location?.list[location.index];
    if (!component) {
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
    return {
      component,
      inFormStep: location!.container.kind === 'formStep',
      incomingRules,
    };
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
        runCommand(new AddHomePage({ id: toPageId(idGenerator.next()), elements: [] }));
        return;
      }
      if (kind === 'subScenario') {
        runCommand(
          new AddScenario({
            id: toScenarioId(idGenerator.next()),
            type: 'navigation',
            title: NEW_SCENARIO_TITLE,
            elements: [],
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
          steps: [{ id: toFormStepId(idGenerator.next()), elements: [] }],
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

  // Элемент из меню тулбара — в выделенный узел канваса; любой вид в любой
  // узел [owner 2026-10-13, ADR-17]. У формы — в выделенный шаг (S10), если
  // выделена форма целиком — в первый.
  const addElement = useCallback(
    (kind: AddableElementKind) => {
      if (!selectedNodeId || !selectedNodeType) {
        notifications.showCommandFailure('Сначала выберите узел на канвасе');
        return;
      }
      let target: CanvasElementTarget;
      if (selectedNodeType === 'form') {
        const form = findFormById(graphRef.current, selectedNodeId);
        const step = form?.steps.find((candidate) => candidate.id === selectedStepId) ?? form?.steps[0];
        if (!form || !step) {
          notifications.showCommandFailure('У формы нет шага для добавления элемента');
          return;
        }
        target = { kind: 'formStep', formId: form.id, stepId: step.id };
      } else if (selectedNodeType === 'home') {
        target = { kind: 'home' };
      } else {
        target = { kind: 'subScenario', scenarioId: selectedNodeId as ScenarioId };
      }
      runCommand(new AddElement(target, createDefaultElement(kind, idGenerator.next())));
    },
    [idGenerator, notifications, runCommand, selectedNodeId, selectedNodeType, selectedStepId],
  );

  // «+» конкретного шага формы → элемент выбранного вида на этот шаг.
  const addElementToStep = useCallback(
    (formId: string, stepId: string, kind: CanvasElementKind) => {
      runCommand(
        new AddElement(
          { kind: 'formStep', formId: formId as ApplicationFormId, stepId: stepId as FormStepId },
          createDefaultElement(kind, idGenerator.next()),
        ),
      );
    },
    [idGenerator, runCommand],
  );

  // Корзина в заголовке узла: удаление страницы с каскадом связей
  // (RemoveHomePage/RemoveScenario/RemoveForm). Если удалённый узел был
  // выделен — выделение сбрасывается.
  const removeNode = useCallback(
    (nodeId: string, nodeType: CanvasNodeType) => {
      if (nodeType === 'home') {
        runCommand(new RemoveHomePage());
      } else if (nodeType === 'form') {
        runCommand(new RemoveForm(nodeId as ApplicationFormId));
      } else {
        runCommand(new RemoveScenario(nodeId as ScenarioId));
      }
      setSelectedNodeId((current) => (current === nodeId ? null : current));
    },
    [runCommand],
  );

  const removeStep = useCallback(
    (formId: string, stepId: string) => {
      runCommand(new RemoveFormStep(formId as ApplicationFormId, stepId as FormStepId));
    },
    [runCommand],
  );

  // «+ Добавить шаг» на узле формы (N3): пустая колонка в конец формы.
  const addFormStep = useCallback(
    (formId: string) => {
      runCommand(
        new AddFormStep(formId as ApplicationFormId, { id: toFormStepId(idGenerator.next()), elements: [] }),
      );
    },
    [idGenerator, runCommand],
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
        target = { kind: 'subScenario', scenarioId: nodeId as ScenarioId };
      } else {
        if (!targetStepId) {
          notifications.showCommandFailure('Переносите элемент в конкретный шаг формы');
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
      // Режим логики — только у Select'а в шаге формы (L-I5).
      const component = findFormComponent(graphRef.current, elementId)?.component;
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

  // Признак «можно соединить» (повторная приёмка, ADR-14): пока тянется
  // связь, допустимые цели — по доменному правилу connectableTargets — их
  // target-handle (невидимый, во всю сущность) принимает drop/клик курсора;
  // в покое принимающих handles нет. Тот же расчёт проверяет связь
  // (isConnectionAllowed).
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

  // Состояние взаимодействия — во внешний стор канваса, не в data узлов
  // (ревью A4/P3, R2): узлы и карточки подписаны селектором и перерисовываются
  // только при смене своего значения. Синхронизация до отрисовки кадра.
  const [interactionStore] = useState(createCanvasInteractionStore);
  const reveal = useMemo(
    () =>
      focus && focus.elementId !== null
        ? { nodeId: focus.nodeId, elementId: focus.elementId, nonce: focus.nonce }
        : null,
    [focus],
  );
  useLayoutEffect(() => {
    interactionStore.setState({
      selectedNodeId,
      selectedElementId,
      selectedStepId,
      connectionTargets,
      violations: violationMarkers,
      reveal,
    });
  }, [
    interactionStore,
    selectedNodeId,
    selectedElementId,
    selectedStepId,
    connectionTargets,
    violationMarkers,
    reveal,
  ]);

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
      moveElement,
      elementKindOptions: ELEMENT_KIND_OPTIONS,
    }),
    [selectElement, toggleComplexLogic, removeNode, addElementToStep, removeStep, addFormStep, moveElement],
  );

  // Выделение узла управляется отсюда (N6; взаимоисключение с элементом,
  // F5): новый объект — только у выделенного узла, data общая.
  const nodes = useMemo<CanvasNode[]>(() => {
    const selectedId = selectedElementId === null ? selectedNodeId : null;
    if (selectedId === null) {
      return flow.nodes;
    }
    return flow.nodes.map((node) => (node.id === selectedId ? { ...node, selected: true } : node));
  }, [flow.nodes, selectedNodeId, selectedElementId]);

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
    interactionStore,
    canvasActions,
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
