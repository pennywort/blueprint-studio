import { useCallback, useEffect, useState } from 'react';
import { Handle, Position, useConnection, useUpdateNodeInternals, type NodeProps } from '@xyflow/react';
import {
  Box,
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
import type { DropAnchorPosition, ElementDragPayload } from '../element-dnd';
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
    // Одна рамка: тот же outline, что у выделения, цветом ошибки (без второго
    // кольца тенью); выделение важнее — его селектор специфичнее (T-043).
    outline: `2px solid ${theme.palette.error.main}`,
    outlineOffset: 2,
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
  expandButton: {
    alignSelf: 'center',
    textTransform: 'none',
  },
}));

// Узел «Форма заявки» (T-031, D1): заголовок «Форма заявки» + название,
// чип «Одностраничная»/«Степперная», корзина; шаги — горизонтальные колонки,
// у каждого шага заголовок, корзина и «+». Обработчики добавления/удаления
// (T-034) и dnd (N2) внедряются хранилищем состояния через data:
// onDeleteNode, onDeleteStep, onAddElementToStep, onAddStep, onDropElement.
// Элементы каждого шага сжимаются независимо при >6 (T-033).
export function FormNode({ id, data }: NodeProps<CanvasNode>) {
  const classes = useStyles();
  const isDropTarget = useConnection((connection) => connection.inProgress && connection.toNode?.id === id);

  // Меню «+» шага: якорь + шаг, в который добавляем. Варианты kind приходят
  // извне (data.elementKindOptions) — узел не знает о провайдере схем.
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
  const reveal = data.reveal;
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

  // Раскладка шага меняется с данными (колонки, варианты-карточки) при
  // неизменном размере узла — handles правил пересчитываются явно.
  useEffect(() => {
    updateNodeInternals(id);
  }, [data.steps, id, updateNodeInternals]);

  const pickKind = (kind: CanvasElementKind) => {
    if (stepMenu) {
      data.onAddElementToStep?.(stepMenu.stepId, kind);
    }
    setStepMenu(null);
  };

  return (
    <Card
      className={[
        classes.card,
        data.violations ? classes.invalid : '',
        isDropTarget ? classes.dropTarget : '',
      ].join(' ')}
      data-testid={`canvas-node-${id}`}
    >
      {/* Форма — цель связей на общих основаниях (D12): точка входа на краю блока (D9). */}
      {/* Принимающий handle невидим и накрывает блок: принимает связь, только пока блок — допустимая цель. */}
      <Handle
        type="target"
        position={Position.Left}
        className={data.connectTarget ? 'editor-target editor-target-available' : 'editor-target'}
      />
      <Box className={classes.header}>
        <Box>
          <Box className={classes.titleRow}>
            <Typography variant="subtitle1">Форма заявки</Typography>
            {data.title !== 'Форма заявки' ? (
              <Typography variant="subtitle1" color="textSecondary">
                · {data.title}
              </Typography>
            ) : null}
            {data.formKindLabel ? (
              <Chip className={classes.neutralChip} size="small" label={data.formKindLabel} />
            ) : null}
          </Box>
          <Typography variant="body2" color="textSecondary">
            {data.subtitle}
          </Typography>
        </Box>
        {data.violations ? <ViolationBadge messages={data.violations} inHeader /> : null}
        <IconButton
          className={`${classes.iconButton} nodrag`}
          size="small"
          aria-label="Удалить форму"
          onClick={data.onDeleteNode}
        >
          <Delete fontSize="small" />
        </IconButton>
      </Box>
      <Box className={classes.stepsRow}>
        {data.steps.map((step, index) => (
          <FormStepColumn
            key={step.id}
            step={step}
            index={index}
            expanded={expandedSteps[step.id] === true}
            onToggleExpanded={() => toggleStep(step.id)}
            onOpenAddMenu={(anchor) => setStepMenu({ anchor, stepId: step.id })}
            onDeleteStep={() => data.onDeleteStep?.(step.id)}
            onDropElement={(dragged, anchor, layerDepth) =>
              data.onDropElement?.(step.id, dragged, anchor, layerDepth)
            }
          />
        ))}
        {/* «+ Добавить шаг» (N3): пустая колонка-ячейка в конец формы. */}
        {data.onAddStep ? (
          <Box
            className={`${classes.addStepColumn} nodrag`}
            data-testid="add-form-step"
            onClick={data.onAddStep}
          >
            <Add fontSize="small" />
            <Typography variant="body2">Добавить шаг</Typography>
          </Box>
        ) : null}
      </Box>

      {/* Меню выбора типа элемента для «+» шага (T-034). */}
      <Menu anchorEl={stepMenu?.anchor ?? null} open={stepMenu !== null} onClose={() => setStepMenu(null)}>
        {(data.elementKindOptions ?? []).map((option) => (
          <MenuItem key={option.kind} onClick={() => pickKind(option.kind)}>
            {option.label}
          </MenuItem>
        ))}
      </Menu>
    </Card>
  );
}

type FormStepColumnProps = {
  step: CanvasFormStepData;
  index: number;
  expanded: boolean;
  onToggleExpanded: () => void;
  onOpenAddMenu: (anchor: HTMLElement) => void;
  onDeleteStep: () => void;
  onDropElement: (
    dragged: ElementDragPayload,
    anchor: DropAnchorPosition | null,
    layerDepth?: number,
  ) => void;
};

// Колонка одного шага формы: заголовок, корзина (RemoveFormStep), «+»
// (меню типов элементов → AddFormComponent) и слой элементов с колонками
// по правилам «Сложной логики» (FormStepLayers — там же зона приёма dnd).
function FormStepColumn({
  step,
  index,
  expanded,
  onToggleExpanded,
  onOpenAddMenu,
  onDeleteStep,
  onDropElement,
}: FormStepColumnProps) {
  const classes = useStyles();
  // Сжатие T-033 временно выключено (ELEMENTS_COLLAPSE_ENABLED) — список полный.
  const visibleElements = collapseElements(step.elements, expanded);

  return (
    <Box
      className={step.selected ? `${classes.stepColumn} ${classes.stepSelected}` : classes.stepColumn}
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
        className={step.connectTarget ? 'editor-target editor-target-available' : 'editor-target'}
      />
      <Box className={classes.stepHeader}>
        <Typography variant="subtitle2">{step.title || `Шаг ${index + 1}`}</Typography>
        <Box className={classes.stepActions}>
          <IconButton
            className={`${classes.iconButton} nodrag`}
            size="small"
            aria-label="Удалить шаг"
            onClick={onDeleteStep}
          >
            <Delete fontSize="small" />
          </IconButton>
          <IconButton
            className={`${classes.iconButton} nodrag`}
            size="small"
            aria-label="Добавить элемент в шаг"
            onClick={(event) => onOpenAddMenu(event.currentTarget)}
          >
            <Add fontSize="small" />
          </IconButton>
        </Box>
      </Box>
      <FormStepLayers elements={visibleElements} onDropElement={onDropElement} />
      {isCollapsible(step.elements) ? (
        <Button
          className={`${classes.expandButton} nodrag`}
          size="small"
          onClick={onToggleExpanded}
          endIcon={expanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
        >
          {expanded ? 'Свернуть' : `Показать все (${step.elements.length})`}
        </Button>
      ) : null}
    </Box>
  );
}
