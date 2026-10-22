import { memo, useCallback, useMemo, useRef, useState, type DragEvent } from 'react';
import type { NodeProps } from '@xyflow/react';
import { Card, Chip, IconButton, Menu, MenuItem, Typography, makeStyles } from '@material-ui/core';
import { Add, Delete } from '@material-ui/icons';
import type { CanvasElementKind } from '@domain/model/canvas-element';
import type { EditorTheme } from '@presentation/theme/editor-theme';
import { NODE_KIND_LABELS } from '@presentation/labels/editor-labels';
import { ViolationBadge } from './violation-badge';
import { groupByLayer } from '@domain/layer-depths';
import { CANVAS_LAYOUT, FORM_STEP_LAYOUT } from '../canvas-layout';
import { stepTargetHandleId, type CanvasFormStepData, type CanvasNode } from '../graph-flow-adapter';
import { setScaledDragPreview } from '../drag-preview';
import { isActionTarget } from '../canvas-events';
import { type DropAnchorPosition, type ElementDragPayload } from '../element-dnd';
import {
  draggedStep,
  effectiveStepAnchor,
  endStepDrag,
  readStepDrag,
  stepAnchorFromPoint,
  stepSwapFromPoint,
  writeStepDrag,
  type StepAnchorPosition,
  type StepDragPayload,
} from '../step-dnd';
import {
  buildLayerColumns,
  nearestLayerColumn,
  resolveLayerDrop,
  type LayerColumn,
  type LayerDropDecision,
} from '../layers/layer-columns';
import { useLayerPolicies } from '../layers/layer-policy';
import { useCanvasActions, useCanvasInteraction } from '../canvas-interaction';
import { FormStepLayers } from './form-step-layers';
import { useHandlesSync } from './use-handles-sync';
import { useNodeStyles } from './node-styles';
import type { HighlightFlags } from '@presentation/theme/highlight-policy';
import { useHighlightStyles } from '../highlight/highlight-styles';
import { useEntityHighlight } from '../highlight/use-entity-highlight';
import { TargetHandle } from './target-handle';

const NO_FLAGS: HighlightFlags = {};
const DROP_TARGET: HighlightFlags = { dropTarget: true };
import { ColumnDropBar, columnBarX, DROP_BAR_INSET, DropBar, useDropZone } from './use-element-drop-zone';

const useStyles = makeStyles<EditorTheme>((theme) => ({
  // Карточка, рамки, заголовок и кнопки — общие стили узлов (ревью A8, R4).
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  neutralChip: {
    backgroundColor: theme.editor.canvas.controlsBackground,
    color: theme.palette.text.secondary,
  },
  // Шаги формы — колонки по уровням внутри узла (D1, макет
  // «добавление-шагов-формы-и-элементов-в-шаги»); шаги одного уровня —
  // друг под другом, как узлы колонки канваса [owner 2026-10-14].
  // position — для подсветки колонки-цели dnd.
  // Поле до шапки и краёв узла добирается до formStepsEdge — полоса вставки
  // у крайнего шага помещается внутри узла ([owner 2026-10-16]).
  stepsRow: {
    position: 'relative',
    display: 'flex',
    alignItems: 'flex-start',
    gap: CANVAS_LAYOUT.formStepGap,
    paddingTop: CANVAS_LAYOUT.formStepsEdge - CANVAS_LAYOUT.nodeContentGap,
    paddingBottom: CANVAS_LAYOUT.formStepsEdge - CANVAS_LAYOUT.nodePadding,
    paddingLeft: CANVAS_LAYOUT.formStepsEdge - CANVAS_LAYOUT.nodePadding,
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
    // formStepWidth — внешняя ширина с полем шага ([owner 2026-10-16]).
    boxSizing: 'border-box',
    flexShrink: 0,
    borderRadius: theme.editor.shape.card,
    backgroundColor: theme.palette.background.default,
    padding: FORM_STEP_LAYOUT.stepPadding,
    display: 'flex',
    flexDirection: 'column',
    // Зазор шапка → карточки = зазор между карточками: полоса вставки перед
    // первой карточкой — посередине, не у шапки (DropBar, [owner 2026-10-15]).
    gap: FORM_STEP_LAYOUT.rowGap,
    // Весь шаг — ручка dnd шага [owner 2026-10-15].
    cursor: 'grab',
  },
  // «+ Добавить шаг» (N3): новый шаг на следующий уровень — колонкой справа.
  // Пустой уровень шагов [owner 2026-10-16]: место сохраняется (groupByLayer),
  // туда переносится шаг; рамка — как у «Добавить шаг», без действия.
  emptyLevel: {
    width: CANVAS_LAYOUT.formStepWidth,
    boxSizing: 'border-box', // ширина — как у шага, с рамкой
    minHeight: CANVAS_LAYOUT.formEmptyLevelHeight,
    borderRadius: theme.editor.shape.card,
    border: `2px dashed ${theme.editor.canvas.elementBorder}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: theme.palette.text.secondary,
  },
  addStepColumn: {
    width: CANVAS_LAYOUT.formStepWidth,
    boxSizing: 'border-box', // ширина — как у шага, с рамкой
    flexShrink: 0,
    minHeight: 96,
    borderRadius: theme.editor.shape.card,
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
  // Заголовок шага; ручка dnd — весь шаг (stepColumn, [owner 2026-10-15]).
  stepGrip: {
    flex: 1,
    minWidth: 0,
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
}));

// Узел «Форма заявки» (T-031, D1): заголовок «Форма заявки» + название,
// чип «Одностраничная»/«Степперная», корзина; шаги — колонки по уровням
// (шаги уровня — друг под другом), у каждого шага заголовок, корзина и «+». Обработчики добавления/удаления
// (T-034) и dnd (N2) — из контекста действий канваса, выделение, цель
// связи и нарушения — подпиской на стор (ревью A4, R2), не из data.
function FormNodeView({ id, data }: NodeProps<CanvasNode>) {
  useHandlesSync(id, data);
  const nodeClasses = useNodeStyles();
  const classes = useStyles();
  const actions = useCanvasActions();
  const stepsLayerPolicy = useLayerPolicies().formSteps;
  const highlightClasses = useHighlightStyles();
  // Подсветка — единый механизм (R-PERF-6).
  const highlight = useEntityHighlight({ entity: 'node', id });
  const violations = useCanvasInteraction((state) => state.violations.nodes.get(id));

  // Меню «+» шага: якорь + шаг, в который добавляем. Варианты kind приходят
  // из контекста действий (elementKindOptions) — узел не знает о провайдере схем.
  const [stepMenu, setStepMenu] = useState<{ anchor: HTMLElement; stepId: string } | null>(null);

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

  // Колонки уровней шагов 0..max без пропусков (groupByLayer): шаги уровня —
  // в порядке массива (как orderIndex узлов колонки канваса); пустой уровень
  // держит место — туда можно перенести шаг [owner 2026-10-16].
  const stepLevels = useMemo(
    () => groupByLayer(data.steps, (step) => step.depth).map((steps, depth) => ({ depth, steps })),
    [data.steps],
  );

  // Dnd шагов внутри формы [owner 2026-10-14] — как dnd узлов канваса, общим
  // ядром слоёв (layers/): колонка-кандидат — ближайшая по X (справа — пустой
  // слот нового уровня на месте «Добавить шаг»); своя колонка — порядок по Y,
  // другая — перенос на уровень: без якоря — вертикальная полоса в зазоре
  // слева от колонки (ColumnDropBar, [owner 2026-10-15]).
  // Индикатор вставки — только там, где порядок изменится.
  const stepsRowRef = useRef<HTMLDivElement>(null);
  // Координаты — локальные координаты ряда: узел внутри zoom react-flow,
  // масштаб снимается по отношению экранной ширины к собственной.
  // Шаг переносится только внутри своей формы — шаг другой формы зона не принимает.
  const locateStepDrop = useCallback(
    (event: DragEvent<HTMLElement>, dragged: StepDragPayload): StepDropState | null => {
      const zone = stepsRowRef.current;
      if (!zone || dragged.formId !== id) {
        return null;
      }
      const draggedId = dragged.stepId;
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
          stepsLayerPolicy,
        ),
        (event.clientX - zoneRect.left) / scale,
      );
      // Середина другого шага — обмен местами [owner 2026-10-15], без вставки.
      const swapStepId = stepSwapFromPoint(zone, draggedId, event.clientX, event.clientY);
      if (swapStepId) {
        return { column, decision: { kind: 'reorder' }, anchor: null, swapStepId };
      }
      // Обмен ёмкость уровней не меняет; перенос — по политике (ёмкость уровня).
      const own = data.steps.find((step) => step.id === draggedId);
      const decision = resolveLayerDrop(
        stepsLayerPolicy,
        { id: draggedId, kind: 'formStep', depth: own ? own.depth : null },
        column,
        new Map(data.steps.map((step) => [step.id, step.depth])),
      );
      const level = column ? stepLevels.find((candidate) => candidate.depth === column.depth) : undefined;
      const anchor = effectiveStepAnchor(
        level?.steps.map((step) => step.id) ?? [],
        draggedId,
        stepAnchorFromPoint(
          levelElements.find((element) => Number(element.dataset.stepLevel) === column?.depth) ?? null,
          event.clientY,
        ),
      );
      return { column, decision, anchor, swapStepId: null };
    },
    [data.steps, id, stepLevels, stepsLayerPolicy],
  );
  const dropStep = useCallback(
    (dragged: StepDragPayload, state: StepDropState) => {
      if (state.swapStepId) {
        actions?.swapSteps(id, dragged.stepId, state.swapStepId);
      } else if (state.decision.kind === 'moveToLayer') {
        actions?.moveStep(id, dragged.stepId, state.anchor, state.decision.depth);
      } else if (state.anchor) {
        actions?.moveStep(id, dragged.stepId, state.anchor);
      }
    },
    [actions, id],
  );
  // Зона приёма — общий хук dnd (ревью A8, R4); шаг — внутренняя зона узла.
  const { state: stepDrop, handlers: stepDropHandlers } = useDropZone({
    dragged: draggedStep,
    read: readStepDrag,
    locate: locateStepDrop,
    onDrop: dropStep,
    isolate: true,
    accepts: acceptsStepDrop,
  });
  const dropBlocked = stepDrop?.decision.kind === 'blocked';
  const dropAnchor = stepDrop?.anchor ?? null;

  return (
    <Card
      className={[nodeClasses.card, highlightClasses.node].join(' ')}
      data-highlight={highlight ?? undefined}
      data-testid={`canvas-node-${id}`}
    >
      {/* Форма — цель связей на общих основаниях (D12): точка входа на краю блока (D9). */}
      {/* Принимающий handle невидим и накрывает блок: принимает связь, только пока блок — допустимая цель. */}
      <TargetHandle entity="node" id={id} />
      <div className={nodeClasses.header}>
        <div>
          <div className={classes.titleRow}>
            <Typography variant="subtitle1">{NODE_KIND_LABELS.form}</Typography>
            {/* Название формы, совпадающее с видом узла, не повторяем (R-CFG-6). */}
            {data.title !== NODE_KIND_LABELS.form ? (
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
          className={`${nodeClasses.iconButton} nodrag`}
          size="small"
          aria-label="Удалить форму"
          onClick={() => actions?.removeNode(id, 'form')}
        >
          <Delete fontSize="small" />
        </IconButton>
      </div>
      <div ref={stepsRowRef} className={classes.stepsRow} data-testid="form-steps-row" {...stepDropHandlers}>
        {stepDrop && stepDrop.decision.kind !== 'reorder' && stepDrop.column && !dropAnchor ? (
          <ColumnDropBar
            x={columnBarX(stepDrop.column, {
              gap: CANVAS_LAYOUT.formStepGap,
              edge: CANVAS_LAYOUT.formStepsEdge,
            })}
            blocked={dropBlocked}
          />
        ) : null}
        {stepLevels.map((level) => (
          <div
            key={level.depth}
            className={classes.stepLevel}
            data-step-level={level.depth}
            data-testid={`form-step-level-${level.depth}`}
          >
            {level.steps.map((step, index) => (
              <FormStepColumn
                key={step.id}
                formId={id}
                step={step}
                dropBar={
                  dropAnchor?.stepId === step.id
                    ? {
                        placement: dropAnchor.placement,
                        atEdge:
                          dropAnchor.placement === 'before' ? index === 0 : index === level.steps.length - 1,
                        blocked: dropBlocked,
                      }
                    : null
                }
                swapTarget={stepDrop?.swapStepId === step.id}
                onOpenAddMenu={openAddMenu}
              />
            ))}
            {level.steps.length === 0 ? (
              <div className={classes.emptyLevel} data-testid={`form-step-level-empty-${level.depth}`}>
                <Typography variant="body2">Пустой уровень</Typography>
              </div>
            ) : null}
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
// Заполненный уровень (ёмкость) показывается запретом, бросить нельзя.
const acceptsStepDrop = (state: StepDropState) => state.decision.kind !== 'blocked';

type StepDropState = {
  column: LayerColumn | null;
  decision: LayerDropDecision;
  anchor: StepAnchorPosition | null;
  /** Шаг, с которым перетаскиваемый поменяется местами; null — вставка. */
  swapStepId: string | null;
};

type FormStepColumnProps = {
  formId: string;
  step: CanvasFormStepData;
  /**
   * Индикатор вставки перетаскиваемого шага у этого шага (dnd шагов): atEdge —
   * у края уровня (до первого / после последнего шага), в поле узла;
   * blocked — уровень заполнен, бросить нельзя. null — индикатора нет.
   */
  dropBar: { placement: 'before' | 'after'; atEdge: boolean; blocked: boolean } | null;
  /** Шаг — цель обмена местами при dnd шага [owner 2026-10-15]. */
  swapTarget: boolean;
  onOpenAddMenu: (anchor: HTMLElement, stepId: string) => void;
};

// Колонка одного шага формы: заголовок, корзина (RemoveFormStep), «+»
// (меню типов элементов → AddFormComponent) и слой элементов с колонками
// по правилам «Сложной логики» (FormStepLayers — там же зона приёма dnd).
const FormStepColumn = memo(function FormStepColumn({
  formId,
  step,
  dropBar,
  swapTarget,
  onOpenAddMenu,
}: FormStepColumnProps) {
  const nodeClasses = useNodeStyles();
  const classes = useStyles();
  const actions = useCanvasActions();
  // Выделенный шаг (S10): форма выделена целиком, элемент — нет.
  const highlightClasses = useHighlightStyles();
  // Подсветка шага — единый механизм (R-PERF-6): выделение (S10) и цель связи —
  // из стора, цель обмена местами при dnd шага — локальный жест формы.
  const highlight = useEntityHighlight(
    { entity: 'step', id: step.id, nodeId: formId },
    swapTarget ? DROP_TARGET : NO_FLAGS,
  );
  // Шаг — допустимая цель протягиваемого перехода [owner 2026-10-14].
  // Нажатие пришлось на кнопку/handle — жест не dnd шага.
  const pressedOnActionRef = useRef(false);
  const onDropElement = useCallback(
    (dragged: ElementDragPayload, anchor: DropAnchorPosition | null, layerDepth?: number) =>
      actions?.moveElement(formId, 'form', step.id, dragged, anchor, layerDepth),
    [actions, formId, step.id],
  );

  return (
    <div
      className={[
        classes.stepColumn,
        // nodrag — нажатие на шаге тащит шаг, а не узел react-flow.
        'nodrag',
        highlightClasses.step,
      ].join(' ')}
      data-highlight={highlight ?? undefined}
      data-testid={`form-step-${step.id}`}
      data-form-step-id={step.id}
      data-step-swap-target={swapTarget || undefined}
      // Dnd шага за весь блок [owner 2026-10-15] — та же зона, что выделяет шаг
      // кликом (S10): карточки элементов тащатся сами (их dragstart не
      // всплывает), кнопки шага dnd не начинают.
      draggable
      onPointerDown={(event) => {
        pressedOnActionRef.current = isActionTarget(event.target);
      }}
      onDragStart={(event) => {
        if (pressedOnActionRef.current) {
          event.preventDefault();
          return;
        }
        event.stopPropagation();
        writeStepDrag(event.dataTransfer, { formId, stepId: step.id });
        // Превью в масштабе канваса, не в 100% (доводка N2).
        setScaledDragPreview(event);
      }}
      onDragEnd={endStepDrag}
    >
      {/* Цель перехода между шагами [owner 2026-10-14]: невидимый handle во весь
          шаг, принимает связь, только пока шаг — допустимая цель (шаг следующих
          уровней той же формы). */}
      <TargetHandle entity="step" id={step.id} nodeId={formId} handleId={stepTargetHandleId(step.id)} />
      {/* Индикатор вставки шага — посередине зазора между шагами уровня, у
          края уровня — посередине поля узла (formStepsEdge);
          абсолютный — раскладка формы при drag не меняется (как ADR-16). */}
      {dropBar ? (
        <DropBar
          orientation="horizontal"
          style={{
            position: 'absolute',
            left: DROP_BAR_INSET,
            right: DROP_BAR_INSET,
            [dropBar.placement === 'before' ? 'top' : 'bottom']:
              -(dropBar.atEdge ? CANVAS_LAYOUT.formStepsEdge : CANVAS_LAYOUT.formStepGap) / 2 - 1,
          }}
          testId="step-drop-indicator"
          blocked={dropBar.blocked}
        />
      ) : null}
      <div className={classes.stepHeader}>
        <div className={classes.stepGrip} data-testid={`form-step-grip-${step.id}`}>
          <Typography variant="subtitle2">{step.title}</Typography>
        </div>
        <div className={classes.stepActions}>
          <IconButton
            className={`${nodeClasses.iconButton} nodrag`}
            size="small"
            aria-label="Удалить шаг"
            onClick={() => actions?.removeStep(formId, step.id)}
          >
            <Delete fontSize="small" />
          </IconButton>
          <IconButton
            className={`${nodeClasses.iconButton} nodrag`}
            size="small"
            aria-label="Добавить элемент в шаг"
            onClick={(event) => onOpenAddMenu(event.currentTarget, step.id)}
          >
            <Add fontSize="small" />
          </IconButton>
        </div>
      </div>
      <FormStepLayers elements={step.elements} onDropElement={onDropElement} />
    </div>
  );
});
