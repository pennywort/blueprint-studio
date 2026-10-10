import { useCallback, useState } from 'react';
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
} from '@sber-friend/flamingo-core';
import { Add, Delete, ExpandLess, ExpandMore } from '@sber-friend/flamingo-icons';
import type { FormComponentKind } from '@domain/model/form-components';
import type { EditorTheme } from '@presentation/theme/editor-theme';
import { CANVAS_LAYOUT } from '../canvas-layout';
import { collapseElements, isCollapsible } from '../collapse-elements';
import type { CanvasFormStepData, CanvasNode } from '../graph-flow-adapter';
import { ElementCard } from './element-card';

const useStyles = makeStyles<EditorTheme>((theme) => ({
  card: {
    borderRadius: 16,
    backgroundColor: theme.palette.background.paper,
    padding: theme.spacing(2),
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1.5),
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
  stepColumn: {
    width: CANVAS_LAYOUT.formStepWidth,
    flexShrink: 0,
    borderRadius: 12,
    backgroundColor: theme.palette.background.default,
    padding: theme.spacing(1.5),
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1.5),
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
  stepElements: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1.5),
  },
  expandButton: {
    alignSelf: 'center',
    textTransform: 'none',
  },
}));

// Узел «Форма заявки» (T-031, D1): заголовок «Форма заявки» + название,
// чип «Одностраничная»/«Степперная», корзина; шаги — горизонтальные колонки,
// у каждого шага заголовок, корзина и «+». Обработчики добавления/удаления
// (T-034) внедряются хранилищем состояния через data: onDeleteNode,
// onDeleteStep, onAddElementToStep + elementKindOptions для меню «+».
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

  const pickKind = (kind: FormComponentKind) => {
    if (stepMenu) {
      data.onAddElementToStep?.(stepMenu.stepId, kind);
    }
    setStepMenu(null);
  };

  return (
    <Card
      className={isDropTarget ? `${classes.card} ${classes.dropTarget}` : classes.card}
      data-testid={`canvas-node-${id}`}
    >
      {/* Форма — цель связей на общих основаниях (D12): точка входа на краю блока (D9). */}
      <Handle type="target" position={Position.Left} />
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
          />
        ))}
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
};

// Колонка одного шага формы: заголовок, корзина (RemoveFormStep), «+»
// (меню типов элементов → AddFormComponent) и сжимаемый список элементов.
function FormStepColumn({
  step,
  index,
  expanded,
  onToggleExpanded,
  onOpenAddMenu,
  onDeleteStep,
}: FormStepColumnProps) {
  const classes = useStyles();
  const visibleElements = collapseElements(step.elements, expanded);

  return (
    <Box className={classes.stepColumn} data-testid={`form-step-${step.id}`}>
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
      {visibleElements.length > 0 ? (
        <Box className={classes.stepElements}>
          {visibleElements.map((element) => (
            <ElementCard key={element.id} element={element} />
          ))}
        </Box>
      ) : null}
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
