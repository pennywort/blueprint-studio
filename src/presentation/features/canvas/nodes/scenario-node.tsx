import { memo, useCallback, useEffect, useState, type DragEvent } from 'react';
import { Handle, Position, useConnection, useUpdateNodeInternals, type NodeProps } from '@xyflow/react';
import { Button, Card, IconButton, Typography, makeStyles } from '@blueprint-vendor/flamingo-core';
import { Delete, ExpandLess, ExpandMore } from '@blueprint-vendor/flamingo-icons';
import type { EditorTheme } from '@presentation/theme/editor-theme';
import { ViolationBadge } from './violation-badge';
import { CANVAS_LAYOUT } from '../canvas-layout';
import { collapseElements, isCollapsible } from '../collapse-elements';
import type { CanvasNode } from '../graph-flow-adapter';
import { anchorFromPoint, type DropAnchorPosition, type ElementDragPayload } from '../element-dnd';
import { ElementCard } from './element-card';
import { useCanvasActions, useCanvasInteraction } from '../canvas-interaction';
import { useNodeStyles } from './node-styles';
import { DropIndicator, useElementDropZone } from './use-element-drop-zone';

// Своё у узла страницы — фиксированная ширина и список элементов; остальное
// — общие стили узлов (ревью A8, R4).
const useStyles = makeStyles<EditorTheme>((theme) => ({
  card: {
    width: CANVAS_LAYOUT.nodeWidth,
  },
  titles: {
    minWidth: 0,
  },
  elements: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1.5),
  },
}));

// Узел страницы-сценария (T-031): «Главная» и «Подсценарий» — один компонент,
// различаются данными (заголовок, подпись уровня навигации) из адаптера.
// Корзина удаляет узел командой (T-034) — обработчик из контекста действий
// канваса, выделение/цель связи/нарушения — подпиской на стор (ревью A4,
// R2), не из data. При избытке элементов (>6, Q-14) список
// автосжимается с кнопкой раскрытия (T-033).
//
// Dnd (N2): весь узел — зона приёма карточек любого вида (ADR-17); позиция
// — по якорю-карточке под курсором, без якоря — в конец списка.
function ScenarioNodeView({ id, data, type }: NodeProps<CanvasNode>) {
  const nodeClasses = useNodeStyles();
  const classes = useStyles();
  const actions = useCanvasActions();
  // Подсветка цели связи: узел под курсором во время drag рёбер (D9/T-032).
  const isDropTarget = useConnection((connection) => connection.inProgress && connection.toNode?.id === id);
  const connectTarget = useCanvasInteraction((state) => state.connectionTargets?.pages.has(id) ?? false);
  const violations = useCanvasInteraction((state) => state.violations.nodes.get(id));
  const reveal = useCanvasInteraction((state) => (state.reveal?.nodeId === id ? state.reveal : null));

  // Сжатие (T-033): состояние локальное в узле; при смене — пересчёт handles,
  // чтобы рёбра корректно позиционировались в обоих состояниях.
  const [expanded, setExpanded] = useState(false);
  const updateNodeInternals = useUpdateNodeInternals();
  const toggleExpanded = useCallback(() => {
    setExpanded((current) => !current);
    updateNodeInternals(id);
  }, [id, updateNodeInternals]);
  // Поиск нашёл элемент в сжатом узле (T-050) — развернуть, иначе его не показать.
  useEffect(() => {
    if (reveal && data.elements.some((element) => element.id === reveal.elementId)) {
      setExpanded(true);
      updateNodeInternals(id);
    }
    // data.elements намеренно вне зависимостей: реагируем только на новый запрос поиска.
  }, [reveal, id, updateNodeInternals]);

  // Зона приёма карточек: подсветка во время drag + линия-индикатор якоря.
  // Узел принимает элемент любого вида (ADR-17).
  const locateDrop = useCallback(
    (event: DragEvent<HTMLElement>): { anchor: DropAnchorPosition | null } => ({
      anchor: anchorFromPoint(event.currentTarget, event.clientY),
    }),
    [],
  );
  const dropElement = useCallback(
    (dragged: ElementDragPayload, { anchor }: { anchor: DropAnchorPosition | null }) => {
      if (actions && type) {
        actions.moveElement(id, type, null, dragged, anchor);
      }
    },
    [actions, id, type],
  );
  const { state: drop, handlers: dropHandlers } = useElementDropZone({
    locate: locateDrop,
    onDrop: dropElement,
  });
  const anchor = drop?.anchor ?? null;

  const visibleElements = collapseElements(data.elements, expanded);

  return (
    <Card
      className={[
        nodeClasses.card,
        classes.card,
        violations ? nodeClasses.invalid : '',
        isDropTarget ? nodeClasses.dropTarget : '',
        drop ? nodeClasses.dndActive : '',
      ].join(' ')}
      data-testid={`canvas-node-${id}`}
      {...dropHandlers}
    >
      {/* Точка входа рёбер — одна на левом краю блока-узла (D9). Только у
          подсценариев: Главная целью связи быть не может (домен, N5). */}
      {/* Принимающий handle невидим и накрывает блок: принимает связь, только пока блок — допустимая цель. */}
      {type === 'home' ? null : (
        <Handle
          type="target"
          position={Position.Left}
          className={connectTarget ? 'editor-target editor-target-available' : 'editor-target'}
        />
      )}
      <div className={nodeClasses.header}>
        <div className={classes.titles}>
          <Typography variant="subtitle1">{data.title}</Typography>
          <Typography variant="body2" color="textSecondary">
            {data.subtitle}
          </Typography>
        </div>
        {violations ? <ViolationBadge messages={violations} inHeader /> : null}
        <IconButton
          className={`${nodeClasses.iconButton} nodrag`}
          size="small"
          aria-label="Удалить узел"
          onClick={() => type && actions?.removeNode(id, type)}
        >
          <Delete fontSize="small" />
        </IconButton>
      </div>
      {visibleElements.length > 0 ? (
        <div className={classes.elements}>
          {visibleElements.map((element) => (
            <div key={element.id}>
              <DropIndicator anchor={anchor} elementId={element.id} placement="before" />
              <ElementCard element={element} />
              <DropIndicator anchor={anchor} elementId={element.id} placement="after" />
            </div>
          ))}
        </div>
      ) : null}
      {isCollapsible(data.elements) ? (
        <Button
          className={`${nodeClasses.expandButton} nodrag`}
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

// Перерисовка только при смене своих данных (data сохраняет идентичность,
// ревью P1/P3, R2): позиция, выделение чужой карточки и прочие пропсы
// react-flow на содержимое узла не влияют.
export const ScenarioNode = memo(
  ScenarioNodeView,
  (previous, next) => previous.id === next.id && previous.type === next.type && previous.data === next.data,
);
