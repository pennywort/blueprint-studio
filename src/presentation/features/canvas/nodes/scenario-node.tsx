import { useCallback, useEffect, useState, type DragEvent } from 'react';
import { Handle, Position, useConnection, useUpdateNodeInternals, type NodeProps } from '@xyflow/react';
import { Box, Button, Card, IconButton, Typography, makeStyles } from '@sber-friend/flamingo-core';
import { Delete, ExpandLess, ExpandMore } from '@sber-friend/flamingo-icons';
import type { EditorTheme } from '@presentation/theme/editor-theme';
import { ViolationBadge } from './violation-badge';
import { CANVAS_LAYOUT } from '../canvas-layout';
import { collapseElements, isCollapsible } from '../collapse-elements';
import type { CanvasNode } from '../graph-flow-adapter';
import { anchorFromPoint, readElementDndKind, readElementDrag } from '../element-dnd';
import { ElementCard } from './element-card';

const useStyles = makeStyles<EditorTheme>((theme) => ({
  card: {
    // Не обрезать target-handle узла на левой границе (N7/N11).
    overflow: 'visible',
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
  // Нарушение инвариантов узла или его элементов (T-043): кольцо цвета
  // ошибки тенью — outline занят выделением и подсветкой цели связи.
  invalid: {
    boxShadow: `0 0 0 2px ${theme.palette.error.main}`,
  },
  dropTarget: {
    backgroundColor: theme.editor.canvas.nodeHoverBackground,
    outline: `2px solid ${theme.editor.canvas.nodeHoverBorder}`,
  },
  // Зона приёма dnd карточек (N2): совместимый drag над узлом.
  dndActive: {
    outline: `2px dashed ${theme.editor.canvas.nodeHoverBorder}`,
    outlineOffset: 2,
  },
  dropIndicator: {
    height: 2,
    borderRadius: 1,
    backgroundColor: theme.editor.canvas.edge,
    margin: '-1px 0',
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
  expandButton: {
    alignSelf: 'center',
    textTransform: 'none',
  },
}));

// Узел страницы-сценария (T-031): «Главная» и «Подсценарий» — один компонент,
// различаются данными (заголовок, подпись уровня навигации) из адаптера.
// Корзина удаляет узел командой (T-034) — обработчик внедряется хранилищем
// состояния через data.onDeleteNode. При избытке элементов (>6, Q-14) список
// автосжимается с кнопкой раскрытия (T-033).
//
// Dnd (N2): весь узел — зона приёма карточек своего вида (List item на
// Главной и в подсценариях, Widget card только на Главной); позиция — по
// якорю-карточке под курсором, без якоря — в конец списка.
export function ScenarioNode({ id, data, type }: NodeProps<CanvasNode>) {
  const classes = useStyles();
  // Подсветка цели связи: узел под курсором во время drag рёбер (D9/T-032).
  const isDropTarget = useConnection((connection) => connection.inProgress && connection.toNode?.id === id);

  // Сжатие (T-033): состояние локальное в узле; при смене — пересчёт handles,
  // чтобы рёбра корректно позиционировались в обоих состояниях.
  const [expanded, setExpanded] = useState(false);
  const updateNodeInternals = useUpdateNodeInternals();
  const toggleExpanded = useCallback(() => {
    setExpanded((current) => !current);
    updateNodeInternals(id);
  }, [id, updateNodeInternals]);
  // Поиск нашёл элемент в сжатом узле (T-050) — развернуть, иначе его не показать.
  const reveal = data.reveal;
  useEffect(() => {
    if (reveal && data.elements.some((element) => element.id === reveal.elementId)) {
      setExpanded(true);
      updateNodeInternals(id);
    }
    // data.elements намеренно вне зависимостей: реагируем только на новый запрос поиска.
  }, [reveal, id, updateNodeInternals]);

  // Состояние drop-зоны: подсветка во время совместимого drag + линия-индикатор
  // якоря. Вид приёмника узла зависит от его типа (доменные ограничения).
  const [dndActive, setDndActive] = useState(false);
  const [anchor, setAnchor] = useState<{ elementId: string; placement: 'before' | 'after' } | null>(null);

  const acceptsKind = useCallback(
    (kind: string | null): boolean =>
      type === 'home' ? kind === 'listItem' || kind === 'widgetCard' : kind === 'listItem',
    [type],
  );

  const handleDragOver = useCallback(
    (event: DragEvent<HTMLElement>) => {
      const kind = readElementDndKind(event.dataTransfer.types);
      if (!acceptsKind(kind)) {
        setDndActive(false);
        return; // не preventDefault — курсор «нельзя», drop не случится
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      setDndActive(true);
      setAnchor(anchorFromPoint(event.currentTarget, event.clientY));
    },
    [acceptsKind],
  );

  const handleDragLeave = useCallback(() => {
    setDndActive(false);
    setAnchor(null);
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      setDndActive(false);
      setAnchor(null);
      const dragged = readElementDrag(event.dataTransfer);
      if (!dragged || !acceptsKind(dragged.kind) || !data.onDropElement) {
        return;
      }
      data.onDropElement(null, dragged, anchorFromPoint(event.currentTarget, event.clientY));
    },
    [acceptsKind, data],
  );

  const visibleElements = collapseElements(data.elements, expanded);

  return (
    <Card
      className={`${classes.card}${data.violations ? ` ${classes.invalid}` : ''}${isDropTarget ? ` ${classes.dropTarget}` : ''}${
        dndActive ? ` ${classes.dndActive}` : ''
      }`}
      data-testid={`canvas-node-${id}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Точка входа рёбер — одна на левом краю блока-узла (D9). Только у
          подсценариев: Главная целью связи быть не может (домен, N5). */}
      {type === 'home' ? null : <Handle type="target" position={Position.Left} />}
      <Box className={classes.header}>
        <Box className={classes.titles}>
          <Typography variant="subtitle1">{data.title}</Typography>
          <Typography variant="body2" color="textSecondary">
            {data.subtitle}
          </Typography>
        </Box>
        {data.violations ? <ViolationBadge messages={data.violations} inHeader /> : null}
        <IconButton
          className={`${classes.deleteButton} nodrag`}
          size="small"
          aria-label="Удалить узел"
          onClick={data.onDeleteNode}
        >
          <Delete fontSize="small" />
        </IconButton>
      </Box>
      {visibleElements.length > 0 ? (
        <Box className={classes.elements}>
          {visibleElements.map((element) => (
            <Box key={element.id}>
              {anchor?.elementId === element.id && anchor.placement === 'before' ? (
                <Box className={classes.dropIndicator} data-testid="drop-indicator" />
              ) : null}
              <ElementCard element={element} />
              {anchor?.elementId === element.id && anchor.placement === 'after' ? (
                <Box className={classes.dropIndicator} data-testid="drop-indicator" />
              ) : null}
            </Box>
          ))}
        </Box>
      ) : null}
      {isCollapsible(data.elements) ? (
        <Button
          className={`${classes.expandButton} nodrag`}
          size="small"
          onClick={toggleExpanded}
          endIcon={expanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
        >
          {expanded ? 'Свернуть' : `Показать все (${data.elements.length})`}
        </Button>
      ) : null}
    </Card>
  );
}
