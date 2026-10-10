import { Handle, Position, useConnection, type NodeProps } from '@xyflow/react';
import { Box, Card, IconButton, Typography, makeStyles } from '@sber-friend/flamingo-core';
import { Delete } from '@sber-friend/flamingo-icons';
import type { EditorTheme } from '@presentation/theme/editor-theme';
import { CANVAS_LAYOUT } from '../canvas-layout';
import type { CanvasNode } from '../graph-flow-adapter';
import { ElementCard } from './element-card';

const useStyles = makeStyles<EditorTheme>((theme) => ({
  card: {
    width: CANVAS_LAYOUT.nodeWidth,
    borderRadius: 16,
    backgroundColor: theme.palette.background.paper,
    padding: theme.spacing(2),
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1.5),
  },
  // Hover-подсветка целевого узла при перетаскивании связи (T-032, макет
  // «связь-…-переход-к-подсценарию»): серый фон + рамка, цвета из темы.
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
  titles: {
    minWidth: 0,
  },
  deleteButton: {
    backgroundColor: theme.editor.canvas.controlsBackground,
    '&:hover': {
      backgroundColor: theme.editor.canvas.controlsHoverBackground,
    },
  },
  elements: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1.5),
  },
}));

// Узел страницы-сценария (T-031): «Главная» и «Подсценарий» — один компонент,
// различаются данными (заголовок, подпись уровня навигации) из адаптера.
// Корзина в этой сессии только рисуется — удаление узлов подключается
// в T-034 (сессия S10).
export function ScenarioNode({ id, data }: NodeProps<CanvasNode>) {
  const classes = useStyles();
  // Подсветка цели связи: узел под курсором во время drag рёбер (D9/T-032).
  const isDropTarget = useConnection((connection) => connection.inProgress && connection.toNode?.id === id);

  return (
    <Card
      className={isDropTarget ? `${classes.card} ${classes.dropTarget}` : classes.card}
      data-testid={`canvas-node-${id}`}
    >
      {/* Точка входа рёбер — одна на левом краю блока-узла (D9). */}
      <Handle type="target" position={Position.Left} />
      <Box className={classes.header}>
        <Box className={classes.titles}>
          <Typography variant="subtitle1">{data.title}</Typography>
          <Typography variant="body2" color="textSecondary">
            {data.subtitle}
          </Typography>
        </Box>
        {/* Обработчик удаления узла — T-034, здесь кнопка только рисуется. */}
        <IconButton className={`${classes.deleteButton} nodrag`} size="small" aria-label="Удалить узел">
          <Delete fontSize="small" />
        </IconButton>
      </Box>
      {data.elements.length > 0 ? (
        <Box className={classes.elements}>
          {data.elements.map((element) => (
            <ElementCard key={element.id} element={element} />
          ))}
        </Box>
      ) : null}
    </Card>
  );
}
