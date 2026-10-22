import { memo, useCallback, useLayoutEffect, useRef, type DragEvent } from 'react';
import type { NodeProps } from '@xyflow/react';
import { Card, IconButton, Typography, makeStyles } from '@blueprint-vendor/flamingo-core';
import { Delete } from '@blueprint-vendor/flamingo-icons';
import type { EditorTheme } from '@presentation/theme/editor-theme';
import { ViolationBadge } from './violation-badge';
import { CANVAS_LAYOUT, FORM_STEP_LAYOUT, type MeasuredElementRows } from '../canvas-layout';
import type { CanvasNode } from '../graph-flow-adapter';
import { anchorFromPoint, type DropAnchorPosition, type ElementDragPayload } from '../element-dnd';
import { ElementCard } from './element-card';
import { OptionCard } from './option-card';
import { useCanvasActions, useCanvasInteraction } from '../canvas-interaction';
import { useNodeStyles } from './node-styles';
import { useHandlesSync } from './use-handles-sync';
import { DropIndicator, useElementDropZone } from './use-element-drop-zone';
import type { HighlightFlags } from '@presentation/theme/highlight-policy';
import { useHighlightStyles } from '../highlight/highlight-styles';
import { useEntityHighlight } from '../highlight/use-entity-highlight';
import { TargetHandle } from './target-handle';

const NO_FLAGS: HighlightFlags = {};
const DROP_ZONE: HighlightFlags = { dropZone: true };

/** Зазор между карточками элементов страницы. */
const ELEMENTS_GAP = 24;

// Своё у узла страницы — фиксированная ширина и список элементов; остальное
// — общие стили узлов (ревью A8, R4).
const useStyles = makeStyles<EditorTheme>(() => ({
  card: {
    width: CANVAS_LAYOUT.nodeWidth,
  },
  titles: {
    minWidth: 0,
  },
  // Зазор вмещает полосу вставки с точками и отступом (DropBar, [owner 2026-10-15]).
  elements: {
    display: 'flex',
    flexDirection: 'column',
    gap: ELEMENTS_GAP,
  },
  elementSlot: {
    position: 'relative', // якорь полосы вставки (DropIndicator)
  },
  // Варианты Select'а под карточкой (отступ слева — у самой карточки варианта).
  options: {
    display: 'flex',
    flexDirection: 'column',
    gap: FORM_STEP_LAYOUT.optionGap,
    marginTop: FORM_STEP_LAYOUT.optionGap,
  },
}));

// Узел страницы-сценария (T-031): «Главная» и «Подсценарий» — один компонент,
// различаются данными (заголовок, подпись уровня навигации) из адаптера.
// Корзина удаляет узел командой (T-034) — обработчик из контекста действий
// канваса, выделение/цель связи/нарушения — подпиской на стор (ревью A4,
// R2), не из data. Список элементов показывается целиком: сжатие T-033
// удалено [owner 2026-10-14].
//
// Dnd (N2): весь узел — зона приёма карточек любого вида (ADR-17); позиция
// — по якорю-карточке под курсором, без якоря — в конец списка.
function ScenarioNodeView({ id, data, type }: NodeProps<CanvasNode>) {
  useHandlesSync(id, data);
  const nodeClasses = useNodeStyles();
  const classes = useStyles();
  const actions = useCanvasActions();
  const highlightClasses = useHighlightStyles();
  const violations = useCanvasInteraction((state) => state.violations.nodes.get(id));

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
  // Подсветка — единый механизм (R-PERF-6): выделение, ошибка, цель связи —
  // из стора; зона приёма dnd карточек — локальный жест узла.
  const highlight = useEntityHighlight({ entity: 'node', id }, drop ? DROP_ZONE : NO_FLAGS);
  const elementsRef = useElementRowsReport(data.elements, actions?.reportElementRows);

  return (
    <Card
      className={[nodeClasses.card, classes.card, highlightClasses.node].join(' ')}
      data-highlight={highlight ?? undefined}
      data-testid={`canvas-node-${id}`}
      {...dropHandlers}
    >
      {/* Точка входа рёбер — одна на левом краю блока-узла (D9). Только у
          подсценариев: Главная целью связи быть не может (домен, N5). */}
      {/* Принимающий handle невидим и накрывает блок: принимает связь, только пока блок — допустимая цель. */}
      {type === 'home' ? null : <TargetHandle entity="node" id={id} />}
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
      {data.elements.length > 0 ? (
        <div ref={elementsRef} className={classes.elements}>
          {data.elements.map((element) => (
            <div
              key={element.id}
              className={classes.elementSlot}
              // Отступ строки: блоки-цели связей напротив карточки (computeLayout).
              style={element.rowOffset ? { marginTop: element.rowOffset } : undefined}
            >
              <DropIndicator anchor={anchor} elementId={element.id} placement="before" gap={ELEMENTS_GAP} />
              <ElementCard element={element} />
              {/* Варианты Select'а с включённой «Сложной логикой» — карточки под
                  ним, как в шаге формы: из варианта тянется правило видимости.
                  Появляются, только если блок умеет логику (connection-matrix, R-CFG-2). */}
              {element.complexLogic?.enabled ? (
                <div className={classes.options}>
                  {element.complexLogic.options.map((option) => (
                    <OptionCard
                      key={option.handleId}
                      option={option}
                      onSelect={() => actions?.selectElement(element.id)}
                    />
                  ))}
                </div>
              ) : null}
              <DropIndicator anchor={anchor} elementId={element.id} placement="after" gap={ELEMENTS_GAP} />
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

// Замер строк элементов для раскладки «блок-цель напротив элемента»
// ([owner 2026-10-16], N12): верх строки от верха узла и высота — без
// отступа rowOffset, который дала сама раскладка. Перемер — при изменении
// размера списка (карточка выросла, сменились отступы).
function useElementRowsReport(
  elements: CanvasNode['data']['elements'],
  report: ((rows: MeasuredElementRows) => void) | undefined,
) {
  const elementsRef = useRef<HTMLDivElement>(null);
  const elementsNow = useRef(elements);
  elementsNow.current = elements;
  useLayoutEffect(() => {
    const list = elementsRef.current;
    const node = list?.closest<HTMLElement>('.react-flow__node');
    if (!list || !node || !report) {
      return;
    }
    const measure = () => {
      const nodeRect = node.getBoundingClientRect();
      // Масштаб вьюпорта: замер в координатах канваса, не экрана.
      const zoom = node.offsetHeight > 0 ? nodeRect.height / node.offsetHeight : 1;
      const rows: Record<string, { top: number; height: number }> = {};
      let offsets = 0;
      Array.from(list.children).forEach((slot, index) => {
        const element = elementsNow.current[index];
        if (!element || !(slot instanceof HTMLElement)) {
          return;
        }
        offsets += element.rowOffset ?? 0;
        const top = (slot.getBoundingClientRect().top - nodeRect.top) / zoom;
        rows[element.id] = { top: top - offsets, height: slot.offsetHeight };
      });
      report(rows);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, [report, elements]);
  return elementsRef;
}

// Перерисовка только при смене своих данных (data сохраняет идентичность,
// ревью P1/P3, R2): позиция, выделение чужой карточки и прочие пропсы
// react-flow на содержимое узла не влияют.
export const ScenarioNode = memo(
  ScenarioNodeView,
  (previous, next) => previous.id === next.id && previous.type === next.type && previous.data === next.data,
);
