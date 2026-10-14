import { memo, useCallback, useState } from 'react';
import { Handle, Position, useConnection, type NodeProps } from '@xyflow/react';
import {
  Card,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  makeStyles,
} from '@blueprint-vendor/flamingo-core';
import { Add, Delete } from '@blueprint-vendor/flamingo-icons';
import type { CanvasElementKind } from '@domain/model/canvas-element';
import type { EditorTheme } from '@presentation/theme/editor-theme';
import { ViolationBadge } from './violation-badge';
import { CANVAS_LAYOUT } from '../canvas-layout';
import { stepTargetHandleId, type CanvasFormStepData, type CanvasNode } from '../graph-flow-adapter';
import type { DropAnchorPosition, ElementDragPayload } from '../element-dnd';
import { useCanvasActions, useCanvasInteraction } from '../canvas-interaction';
import { FormStepLayers } from './form-step-layers';
import { useNodeStyles } from './node-styles';

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
  // Шаги формы — горизонтальные колонки внутри узла (D1, макет
  // «добавление-шагов-формы-и-элементов-в-шаги»).
  stepsRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: theme.spacing(2),
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
  // Выделенный шаг (S10): рамка цвета выделения тенью, как у карточки элемента.
  stepSelected: {
    boxShadow: `0 0 0 1px ${theme.editor.canvas.edge}`,
  },
  // «+ Добавить шаг» (N3): новая пустая колонка в конец формы.
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
// чип «Одностраничная»/«Степперная», корзина; шаги — горизонтальные колонки,
// у каждого шага заголовок, корзина и «+». Обработчики добавления/удаления
// (T-034) и dnd (N2) — из контекста действий канваса, выделение, цель
// связи и нарушения — подпиской на стор (ревью A4, R2), не из data.
function FormNodeView({ id, data }: NodeProps<CanvasNode>) {
  const nodeClasses = useNodeStyles();
  const classes = useStyles();
  const actions = useCanvasActions();
  const isDropTarget = useConnection((connection) => connection.inProgress && connection.toNode?.id === id);
  const connectTarget = useCanvasInteraction((state) => state.connectionTargets?.pages.has(id) ?? false);
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

  return (
    <Card
      className={[
        nodeClasses.card,
        violations ? nodeClasses.invalid : '',
        isDropTarget ? nodeClasses.dropTarget : '',
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
      <div className={nodeClasses.header}>
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
          className={`${nodeClasses.iconButton} nodrag`}
          size="small"
          aria-label="Удалить форму"
          onClick={() => actions?.removeNode(id, 'form')}
        >
          <Delete fontSize="small" />
        </IconButton>
      </div>
      <div className={classes.stepsRow}>
        {data.steps.map((step, index) => (
          <FormStepColumn key={step.id} formId={id} step={step} index={index} onOpenAddMenu={openAddMenu} />
        ))}
        {/* «+ Добавить шаг» (N3): пустая колонка-ячейка в конец формы. */}
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

type FormStepColumnProps = {
  formId: string;
  step: CanvasFormStepData;
  index: number;
  onOpenAddMenu: (anchor: HTMLElement, stepId: string) => void;
};

// Колонка одного шага формы: заголовок, корзина (RemoveFormStep), «+»
// (меню типов элементов → AddFormComponent) и слой элементов с колонками
// по правилам «Сложной логики» (FormStepLayers — там же зона приёма dnd).
const FormStepColumn = memo(function FormStepColumn({
  formId,
  step,
  index,
  onOpenAddMenu,
}: FormStepColumnProps) {
  const nodeClasses = useNodeStyles();
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

  return (
    <div
      className={selected ? `${classes.stepColumn} ${classes.stepSelected}` : classes.stepColumn}
      data-testid={`form-step-${step.id}`}
      data-form-step-id={step.id}
    >
      {/* Цель перехода между шагами [owner 2026-10-14]: невидимый handle во весь
          шаг, принимает связь, только пока шаг — допустимая цель (шаг позже
          источника в той же форме). */}
      <Handle
        type="target"
        position={Position.Left}
        id={stepTargetHandleId(step.id)}
        className={connectTarget ? 'editor-target editor-target-available' : 'editor-target'}
      />
      <div className={classes.stepHeader}>
        <Typography variant="subtitle2">{step.title || `Шаг ${index + 1}`}</Typography>
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
