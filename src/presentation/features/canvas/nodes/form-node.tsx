import { memo, useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { Handle, Position, useConnection, useUpdateNodeInternals, type NodeProps } from '@xyflow/react';
import {
  Button,
  Card,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  makeStyles,
} from '@blueprint-vendor/flamingo-core';
import { Add, Delete, ExpandLess, ExpandMore } from '@blueprint-vendor/flamingo-icons';
import type { CanvasElementKind } from '@domain/model/canvas-element';
import type { EditorTheme } from '@presentation/theme/editor-theme';
import { ViolationBadge } from './violation-badge';
import { CANVAS_LAYOUT } from '../canvas-layout';
import { collapseElements, isCollapsible } from '../collapse-elements';
import { stepTargetHandleId, type CanvasFormStepData, type CanvasNode } from '../graph-flow-adapter';
import { isDragLeavingZone, type DropAnchorPosition, type ElementDragPayload } from '../element-dnd';
import {
  effectiveStepAnchor,
  isStepDragOfForm,
  readStepDrag,
  readStepDragId,
  stepAnchorFromPoint,
  writeStepDrag,
  type StepAnchorPosition,
} from '../step-dnd';
import {
  buildLayerColumns,
  nearestLayerColumn,
  resolveLayerDrop,
  type LayerColumn,
  type LayerDropDecision,
} from '../layers/layer-columns';
import { FORM_STEPS_LAYER_POLICY } from '../layers/layer-policy';
import { LayerDropHighlight } from '../layers/layer-drop-highlight';
import { useCanvasActions, useCanvasInteraction } from '../canvas-interaction';
import { FormStepLayers } from './form-step-layers';

const useStyles = makeStyles<EditorTheme>((theme) => ({
  card: {
    // Не обрезать target-handle узла на левой границе (N7/N11).
    overflow: 'visible',
    borderRadius: 16,
    backgroundColor: theme.palette.background.paper,
    padding: theme.spacing(2),
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1.5),
  },
  // Нарушение инвариантов узла или его элементов (T-043): кольцо цвета
  // ошибки (T-043).
  invalid: {
    // Одна рамка: та же внутренняя (inset), что у выделения, цветом ошибки;
    // выделение важнее — его селектор специфичнее (T-043, [owner 2026-10-14]).
    boxShadow: `${theme.shadows[1]}, inset 0 0 0 2px ${theme.palette.error.main}`,
  },
  dropTarget: {
    backgroundColor: theme.editor.canvas.nodeHoverBackground,
    outline: `2px solid ${theme.editor.canvas.nodeHoverBorder}`,
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing(1),
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  neutralChip: {
    backgroundColor: theme.editor.canvas.controlsBackground,
    color: theme.palette.text.secondary,
  },
  iconButton: {
    backgroundColor: theme.editor.canvas.controlsBackground,
    '&:hover': {
      backgroundColor: theme.editor.canvas.controlsHoverBackground,
    },
  },
  // Шаги формы — колонки по уровням внутри узла (D1, макет
  // «добавление-шагов-формы-и-элементов-в-шаги»); шаги одного уровня —
  // друг под другом, как узлы колонки канваса [owner 2026-10-14].
  // position — для подсветки колонки-цели dnd.
  stepsRow: {
    position: 'relative',
    display: 'flex',
    alignItems: 'flex-start',
    gap: CANVAS_LAYOUT.formStepGap,
  },
  // Колонка уровня: ширина — по самому широкому шагу уровня.
  stepLevel: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: CANVAS_LAYOUT.formStepGap,
    flexShrink: 0,
  },
  // Шаг растёт вправо по колонкам своего слоя [owner 2026-10-13]; ширина
  // пустого шага — formStepWidth.
  stepColumn: {
    // Target-handle перехода позиционируется относительно шага ([owner 2026-10-14]).
    position: 'relative',
    minWidth: CANVAS_LAYOUT.formStepWidth,
    flexShrink: 0,
    borderRadius: 12,
    backgroundColor: theme.palette.background.default,
    padding: theme.spacing(1.5),
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1.5),
  },
  // Выделенный шаг (S10): рамка цвета выделения внутри шага (inset-тень) —
  // размер не меняется, рёбра у границы не перекрываются [owner 2026-10-14].
  stepSelected: {
    boxShadow: `inset 0 0 0 2px ${theme.editor.canvas.edge}`,
  },
  // «+ Добавить шаг» (N3): новый шаг на следующий уровень — колонкой справа.
  addStepColumn: {
    width: CANVAS_LAYOUT.formStepWidth,
    flexShrink: 0,
    minHeight: 96,
    borderRadius: 12,
    border: `2px dashed ${theme.editor.canvas.elementBorder}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing(0.5),
    color: theme.palette.text.secondary,
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: theme.editor.canvas.nodeHoverBackground,
      borderColor: theme.editor.canvas.nodeHoverBorder,
    },
  },
  // Заголовок шага — ручка dnd шага [owner 2026-10-14].
  stepGrip: {
    flex: 1,
    minWidth: 0,
    cursor: 'grab',
  },
  // Индикатор вставки шага — горизонтальная линия посередине зазора между
  // шагами уровня; абсолютный — раскладка формы при drag не меняется (как ADR-16).
  stepDropIndicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 1,
    backgroundColor: theme.editor.canvas.edge,
    pointerEvents: 'none',
  },
  stepDropBefore: {
    top: -CANVAS_LAYOUT.formStepGap / 2 - 1,
  },
  stepDropAfter: {
    bottom: -CANVAS_LAYOUT.formStepGap / 2 - 1,
  },
  stepHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing(1),
  },
  stepActions: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
  },
  expandButton: {
    alignSelf: 'center',
    textTransform: 'none',
  },
}));

// Узел «Форма заявки» (T-031, D1): заголовок «Форма заявки» + название,
// чип «Одностраничная»/«Степперная», корзина; шаги — колонки по уровням
// (шаги уровня — друг под другом), у каждого шага заголовок, корзина и «+». Обработчики добавления/удаления
// (T-034) и dnd (N2) — из контекста действий канваса, выделение, цель
// связи и нарушения — подпиской на стор (ревью A4, R2), не из data.
// Элементы каждого шага сжимаются независимо при >6 (T-033).
function FormNodeView({ id, data }: NodeProps<CanvasNode>) {
  const classes = useStyles();
  const actions = useCanvasActions();
  const isDropTarget = useConnection((connection) => connection.inProgress && connection.toNode?.id === id);
  const connectTarget = useCanvasInteraction((state) => state.connectionTargets?.pages.has(id) ?? false);
  const violations = useCanvasInteraction((state) => state.violations.nodes.get(id));
  const reveal = useCanvasInteraction((state) => (state.reveal?.nodeId === id ? state.reveal : null));

  // Меню «+» шага: якорь + шаг, в который добавляем. Варианты kind приходят
  // из контекста действий (elementKindOptions) — узел не знает о провайдере схем.
  const [stepMenu, setStepMenu] = useState<{ anchor: HTMLElement; stepId: string } | null>(null);

  // Сжатие элементов каждого шага независимо (T-033); при смене — пересчёт
  // handles, чтобы рёбра позиционировались в обоих состояниях.
  const [expandedSteps, setExpandedSteps] = useState<Readonly<Record<string, boolean>>>({});
  const updateNodeInternals = useUpdateNodeInternals();
  const toggleStep = useCallback(
    (stepId: string) => {
      setExpandedSteps((current) => ({ ...current, [stepId]: !current[stepId] }));
      updateNodeInternals(id);
    },
    [id, updateNodeInternals],
  );
  // Поиск нашёл элемент в сжатом шаге (T-050) — развернуть этот шаг.
  useEffect(() => {
    const step = reveal
      ? data.steps.find((candidate) => candidate.elements.some((element) => element.id === reveal.elementId))
      : undefined;
    if (step) {
      setExpandedSteps((current) => ({ ...current, [step.id]: true }));
      updateNodeInternals(id);
    }
    // data.steps намеренно вне зависимостей: реагируем только на новый запрос поиска.
  }, [reveal, id, updateNodeInternals]);

  // Handles при смене данных узла пересчитывает канвас (editor-canvas,
  // только узлы с новым data — ревью P4, R2).

  const pickKind = (kind: CanvasElementKind) => {
    if (stepMenu) {
      actions?.addElementToStep(id, stepMenu.stepId, kind);
    }
    setStepMenu(null);
  };
  const openAddMenu = useCallback(
    (anchor: HTMLElement, stepId: string) => setStepMenu({ anchor, stepId }),
    [],
  );

  // Колонки уровней шагов: шаги уровня — в порядке массива (как orderIndex
  // узлов колонки канваса).
  const stepLevels = useMemo(() => {
    const byDepth = new Map<number, CanvasFormStepData[]>();
    for (const step of data.steps) {
      byDepth.set(step.depth, [...(byDepth.get(step.depth) ?? []), step]);
    }
    return [...byDepth.entries()]
      .sort(([left], [right]) => left - right)
      .map(([depth, steps]) => ({ depth, steps }));
  }, [data.steps]);

  // Dnd шагов внутри формы [owner 2026-10-14] — как dnd узлов канваса, общим
  // ядром слоёв (layers/): колонка-кандидат — ближайшая по X (справа — пустой
  // слот нового уровня на месте «Добавить шаг»); своя колонка — порядок по Y,
  // другая — перенос на уровень с подсветкой колонки (LayerDropHighlight).
  // Индикатор вставки — только там, где порядок изменится.
  const stepsRowRef = useRef<HTMLDivElement>(null);
  const [stepDrop, setStepDrop] = useState<StepDropState | null>(null);
  const stepDragActive = stepDrop !== null;
  useEffect(() => {
    if (!stepDragActive) {
      return;
    }
    // Жест закончился вне ряда или отменён (Esc) — dragleave мог не дойти.
    const reset = () => setStepDrop(null);
    window.addEventListener('dragend', reset);
    window.addEventListener('drop', reset);
    return () => {
      window.removeEventListener('dragend', reset);
      window.removeEventListener('drop', reset);
    };
  }, [stepDragActive]);
  // Координаты — локальные координаты ряда: узел внутри zoom react-flow,
  // масштаб снимается по отношению экранной ширины к собственной.
  const locateStepDrop = (event: DragEvent<HTMLElement>): StepDropState | null => {
    const zone = stepsRowRef.current;
    const draggedId = readStepDragId(event.dataTransfer.types);
    if (!zone || !draggedId) {
      return null;
    }
    const zoneRect = zone.getBoundingClientRect();
    const scale = zone.offsetWidth > 0 ? zoneRect.width / zone.offsetWidth : 1;
    const levelElements = Array.from(zone.querySelectorAll<HTMLElement>('[data-step-level]'));
    const column = nearestLayerColumn(
      buildLayerColumns(
        levelElements.map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            depth: Number(element.dataset.stepLevel),
            x: (rect.left - zoneRect.left) / scale,
            width: rect.width / scale,
          };
        }),
        FORM_STEPS_LAYER_POLICY,
      ),
      (event.clientX - zoneRect.left) / scale,
    );
    const own = data.steps.find((step) => step.id.toLowerCase() === draggedId);
    const decision = resolveLayerDrop(own ? own.depth : null, column, true);
    const level = column ? stepLevels.find((candidate) => candidate.depth === column.depth) : undefined;
    const anchor = effectiveStepAnchor(
      level?.steps.map((step) => step.id) ?? [],
      draggedId,
      stepAnchorFromPoint(
        levelElements.find((element) => Number(element.dataset.stepLevel) === column?.depth) ?? null,
        event.clientY,
      ),
    );
    return { column, decision, anchor };
  };
  const handleStepDragOver = (event: DragEvent<HTMLElement>) => {
    if (!isStepDragOfForm(event.dataTransfer.types, id)) {
      return; // карточка элемента или шаг другой формы — не наша зона
    }
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
    setStepDrop(locateStepDrop(event));
  };
  const handleStepDragLeave = (event: DragEvent<HTMLElement>) => {
    if (isDragLeavingZone(event.currentTarget, event.clientX, event.clientY)) {
      setStepDrop(null);
    }
  };
  const handleStepDrop = (event: DragEvent<HTMLElement>) => {
    if (!isStepDragOfForm(event.dataTransfer.types, id)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const state = locateStepDrop(event);
    const dragged = readStepDrag(event.dataTransfer);
    setStepDrop(null);
    if (!state || !dragged) {
      return;
    }
    if (state.decision.kind === 'moveToLayer') {
      actions?.moveStep(id, dragged.stepId, state.anchor, state.decision.depth);
    } else if (state.anchor) {
      actions?.moveStep(id, dragged.stepId, state.anchor);
    }
  };
  const dropAnchor = stepDrop?.anchor ?? null;

  return (
    <Card
      className={[
        classes.card,
        violations ? classes.invalid : '',
        isDropTarget ? classes.dropTarget : '',
      ].join(' ')}
      data-testid={`canvas-node-${id}`}
    >
      {/* Форма — цель связей на общих основаниях (D12): точка входа на краю блока (D9). */}
      {/* Принимающий handle невидим и накрывает блок: принимает связь, только пока блок — допустимая цель. */}
      <Handle
        type="target"
        position={Position.Left}
        className={connectTarget ? 'editor-target editor-target-available' : 'editor-target'}
      />
      <div className={classes.header}>
        <div>
          <div className={classes.titleRow}>
            <Typography variant="subtitle1">Форма заявки</Typography>
            {data.title !== 'Форма заявки' ? (
              <Typography variant="subtitle1" color="textSecondary">
                · {data.title}
              </Typography>
            ) : null}
            {data.formKindLabel ? (
              <Chip className={classes.neutralChip} size="small" label={data.formKindLabel} />
            ) : null}
          </div>
          <Typography variant="body2" color="textSecondary">
            {data.subtitle}
          </Typography>
        </div>
        {violations ? <ViolationBadge messages={violations} inHeader /> : null}
        <IconButton
          className={`${classes.iconButton} nodrag`}
          size="small"
          aria-label="Удалить форму"
          onClick={() => actions?.removeNode(id, 'form')}
        >
          <Delete fontSize="small" />
        </IconButton>
      </div>
      <div
        ref={stepsRowRef}
        className={classes.stepsRow}
        data-testid="form-steps-row"
        onDragOver={handleStepDragOver}
        onDragLeave={handleStepDragLeave}
        onDrop={handleStepDrop}
      >
        {stepDrop?.decision.kind === 'moveToLayer' && stepDrop.column ? (
          <LayerDropHighlight
            left={stepDrop.column.x}
            width={stepDrop.column.width}
            style={{ borderRadius: 12, zIndex: 0 }}
          />
        ) : null}
        {stepLevels.map((level) => (
          <div
            key={level.depth}
            className={classes.stepLevel}
            data-step-level={level.depth}
            data-testid={`form-step-level-${level.depth}`}
          >
            {level.steps.map((step) => (
              <FormStepColumn
                key={step.id}
                formId={id}
                step={step}
                dropPlacement={dropAnchor?.stepId === step.id ? dropAnchor.placement : null}
                expanded={expandedSteps[step.id] === true}
                onToggleExpanded={toggleStep}
                onOpenAddMenu={openAddMenu}
              />
            ))}
          </div>
        ))}
        {/* «+ Добавить шаг» (N3): новый шаг на следующий уровень; при dnd
            шага — место пустого слота нового уровня. */}
        <div
          className={`${classes.addStepColumn} nodrag`}
          data-testid="add-form-step"
          onClick={() => actions?.addFormStep(id)}
        >
          <Add fontSize="small" />
          <Typography variant="body2">Добавить шаг</Typography>
        </div>
      </div>

      {/* Меню выбора типа элемента для «+» шага (T-034). */}
      <Menu anchorEl={stepMenu?.anchor ?? null} open={stepMenu !== null} onClose={() => setStepMenu(null)}>
        {(actions?.elementKindOptions ?? []).map((option) => (
          <MenuItem key={option.kind} onClick={() => pickKind(option.kind)}>
            {option.label}
          </MenuItem>
        ))}
      </Menu>
    </Card>
  );
}

// Узел перерисовывается только при смене своих данных (data сохраняет
// идентичность, ревью P1/P3, R2): смена позиции, выделение чужой карточки и
// прочие пропсы react-flow на содержимое узла не влияют.
export const FormNode = memo(
  FormNodeView,
  (previous, next) => previous.id === next.id && previous.data === next.data,
);

// Состояние dnd шага: колонка-кандидат, решение и якорь в колонке.
type StepDropState = {
  column: LayerColumn | null;
  decision: LayerDropDecision;
  anchor: StepAnchorPosition | null;
};

type FormStepColumnProps = {
  formId: string;
  step: CanvasFormStepData;
  /** Индикатор вставки перетаскиваемого шага у этого шага (dnd шагов). */
  dropPlacement: 'before' | 'after' | null;
  expanded: boolean;
  onToggleExpanded: (stepId: string) => void;
  onOpenAddMenu: (anchor: HTMLElement, stepId: string) => void;
};

// Колонка одного шага формы: заголовок, корзина (RemoveFormStep), «+»
// (меню типов элементов → AddFormComponent) и слой элементов с колонками
// по правилам «Сложной логики» (FormStepLayers — там же зона приёма dnd).
const FormStepColumn = memo(function FormStepColumn({
  formId,
  step,
  dropPlacement,
  expanded,
  onToggleExpanded,
  onOpenAddMenu,
}: FormStepColumnProps) {
  const classes = useStyles();
  const actions = useCanvasActions();
  // Выделенный шаг (S10): форма выделена целиком, элемент — нет.
  const selected = useCanvasInteraction(
    (state) =>
      state.selectedElementId === null && state.selectedNodeId === formId && state.selectedStepId === step.id,
  );
  // Шаг — допустимая цель протягиваемого перехода [owner 2026-10-14].
  const connectTarget = useCanvasInteraction((state) => state.connectionTargets?.steps.has(step.id) ?? false);
  const onDropElement = useCallback(
    (dragged: ElementDragPayload, anchor: DropAnchorPosition | null, layerDepth?: number) =>
      actions?.moveElement(formId, 'form', step.id, dragged, anchor, layerDepth),
    [actions, formId, step.id],
  );
  // Сжатие T-033 временно выключено (ELEMENTS_COLLAPSE_ENABLED) — список полный.
  const visibleElements = collapseElements(step.elements, expanded);

  return (
    <div
      className={selected ? `${classes.stepColumn} ${classes.stepSelected}` : classes.stepColumn}
      data-testid={`form-step-${step.id}`}
      data-form-step-id={step.id}
      data-step-selected={selected || undefined}
    >
      {/* Цель перехода между шагами [owner 2026-10-14]: невидимый handle во весь
          шаг, принимает связь, только пока шаг — допустимая цель (шаг следующих
          уровней той же формы). */}
      <Handle
        type="target"
        position={Position.Left}
        id={stepTargetHandleId(step.id)}
        className={connectTarget ? 'editor-target editor-target-available' : 'editor-target'}
      />
      {dropPlacement ? (
        <div
          className={`${classes.stepDropIndicator} ${
            dropPlacement === 'before' ? classes.stepDropBefore : classes.stepDropAfter
          }`}
          data-testid="step-drop-indicator"
        />
      ) : null}
      <div className={classes.stepHeader}>
        {/* Ручка dnd шага [owner 2026-10-14]: nodrag — нажатие не тащит узел
            react-flow; кнопки шага — вне ручки, их нажатие dnd не начинает. */}
        <div
          className={`${classes.stepGrip} nodrag`}
          data-testid={`form-step-grip-${step.id}`}
          draggable
          onDragStart={(event) => {
            event.stopPropagation();
            writeStepDrag(event.dataTransfer, { formId, stepId: step.id });
          }}
        >
          <Typography variant="subtitle2">{step.title}</Typography>
        </div>
        <div className={classes.stepActions}>
          <IconButton
            className={`${classes.iconButton} nodrag`}
            size="small"
            aria-label="Удалить шаг"
            onClick={() => actions?.removeStep(formId, step.id)}
          >
            <Delete fontSize="small" />
          </IconButton>
          <IconButton
            className={`${classes.iconButton} nodrag`}
            size="small"
            aria-label="Добавить элемент в шаг"
            onClick={(event) => onOpenAddMenu(event.currentTarget, step.id)}
          >
            <Add fontSize="small" />
          </IconButton>
        </div>
      </div>
      <FormStepLayers elements={visibleElements} onDropElement={onDropElement} />
      {isCollapsible(step.elements) ? (
        <Button
          className={`${classes.expandButton} nodrag`}
          size="small"
          onClick={() => onToggleExpanded(step.id)}
          endIcon={expanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
        >
          {expanded ? 'Свернуть' : `Показать все (${step.elements.length})`}
        </Button>
      ) : null}
    </div>
  );
});
