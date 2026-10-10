import { Handle, Position, useConnection, type NodeProps } from '@xyflow/react';
import { Box, Card, Chip, IconButton, Typography, makeStyles } from '@sber-friend/flamingo-core';
import { Add, Delete } from '@sber-friend/flamingo-icons';
import type { EditorTheme } from '@presentation/theme/editor-theme';
import { CANVAS_LAYOUT } from '../canvas-layout';
import type { CanvasNode } from '../graph-flow-adapter';
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
}));

// Узел «Форма заявки» (T-031, D1): заголовок «Форма заявки» + название,
// чип «Одностраничная»/«Степперная», корзина; шаги — горизонтальные колонки,
// у каждого шага заголовок, корзина и «+». Корзины и «+» в этой сессии только
// рисуются — обработчики добавления/удаления подключаются в T-034 (S10).
export function FormNode({ id, data }: NodeProps<CanvasNode>) {
  const classes = useStyles();
  const isDropTarget = useConnection((connection) => connection.inProgress && connection.toNode?.id === id);

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
        <IconButton className={`${classes.iconButton} nodrag`} size="small" aria-label="Удалить форму">
          <Delete fontSize="small" />
        </IconButton>
      </Box>
      <Box className={classes.stepsRow}>
        {data.steps.map((step, index) => (
          <Box className={classes.stepColumn} key={step.id} data-testid={`form-step-${step.id}`}>
            <Box className={classes.stepHeader}>
              <Typography variant="subtitle2">{step.title || `Шаг ${index + 1}`}</Typography>
              <Box className={classes.stepActions}>
                <IconButton className={`${classes.iconButton} nodrag`} size="small" aria-label="Удалить шаг">
                  <Delete fontSize="small" />
                </IconButton>
                <IconButton
                  className={`${classes.iconButton} nodrag`}
                  size="small"
                  aria-label="Добавить элемент в шаг"
                >
                  <Add fontSize="small" />
                </IconButton>
              </Box>
            </Box>
            {step.elements.length > 0 ? (
              <Box className={classes.stepElements}>
                {step.elements.map((element) => (
                  <ElementCard key={element.id} element={element} />
                ))}
              </Box>
            ) : null}
          </Box>
        ))}
      </Box>
    </Card>
  );
}
