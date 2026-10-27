import { useCallback, useMemo, useRef, type DragEvent, type ReactNode } from 'react';
import { makeStyles } from '@material-ui/core';
import type { EditorTheme } from '@presentation/theme/editor-theme';
import { FORM_STEP_LAYOUT } from '../canvas-layout';
import type { CanvasElementData } from '../graph-flow-adapter';
import { anchorFromPoint, type DropAnchorPosition, type ElementDragPayload } from '../element-dnd';
import {
  gridLayerColumns,
  nearestLayerColumn,
  resolveLayerDrop,
  type LayerColumn,
  type LayerDropDecision,
} from '../layers/layer-columns';
import { useLayerPolicies } from '../layers/layer-policy';
import { packLayerBands } from '../layers/layer-bands';
import { ElementCard } from './element-card';
import { OptionCard } from './option-card';
import {
  ColumnDropBar,
  columnBarX,
  DROP_BAR_INSET,
  DropBar,
  DropIndicator,
  useElementDropZone,
} from './use-element-drop-zone';

const L = FORM_STEP_LAYOUT;
/** Шаг сетки колонок шага: колонка + зазор. */
const COLUMN_PITCH = L.elementWidth + L.columnGap;

const useStyles = makeStyles<EditorTheme>(() => ({
  // Слой шага: деревья элементов друг под другом; шаг растёт по
  // содержимому, скролла нет [owner 2026-10-13]. minHeight — пустой шаг
  // тоже принимает drop.
  layers: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: L.rowGap,
    minHeight: 64,
  },
  // Ряд полос: независимые деревья в свободных колонках — по горизонтали.
  row: {
    display: 'flex',
    alignItems: 'flex-start',
  },
  band: {
    display: 'flex',
    flexShrink: 0,
  },
  tree: {
    position: 'relative', // якорь полосы «после» дерева Select'а
    display: 'flex',
    flexDirection: 'column',
    // Внутри дерева — Select и его варианты: плотный зазор [owner 2026-10-16].
    gap: L.optionGap,
  },
  // Ячейка колонки: ширина фиксирована — колонки всех деревьев шага
  // выровнены по одной сетке (gridLayerColumns).
  cell: {
    position: 'relative', // якорь полосы вставки (DropIndicator)
    width: L.elementWidth,
    flexShrink: 0,
  },
  // Строка варианта: карточка варианта + зависящие от него элементы
  // правее — цель встаёт напротив своего варианта (макеты «layouting …»);
  // высота строки — по большему из них, следующий вариант сдвигается вниз.
  optionRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: L.columnGap,
  },
  subtrees: {
    display: 'flex',
    flexDirection: 'column',
    gap: L.rowGap,
  },
}));

type DragState = {
  column: LayerColumn | null;
  decision: LayerDropDecision;
  anchor: DropAnchorPosition | null;
  /** Ширина слоя без поля шага — правая граница для полосы переноса. */
  layersWidth: number;
};

export type FormStepLayersProps = {
  elements: readonly CanvasElementData[];
  /** Drop карточки: якорь — позиция в колонке; layerDepth — новая колонка (undefined — та же). */
  onDropElement: (
    dragged: ElementDragPayload,
    anchor: DropAnchorPosition | null,
    layerDepth?: number,
  ) => void;
};

// Содержимое шага формы — слой с колонками [owner 2026-10-13]: колонка
// элемента — уровень по правилам «Сложной логики» (layerDepth из адаптера),
// варианты Select'а — отдельные карточки под ним, цель правила — напротив
// своего варианта. Dnd — общее ядро слоёв (layers/) с политикой шага:
// своя колонка — порядок (якорь-карточка), другая — перенос в колонку
// (MoveElement рвёт правила переносимого элемента), карточка из другого
// шага/формы — перенос в колонку-кандидат.
export function FormStepLayers({ elements, onDropElement }: FormStepLayersProps) {
  const classes = useStyles();
  const layersRef = useRef<HTMLDivElement>(null);
  const layerPolicy = useLayerPolicies().formStep;
  // Лес правил: корни — элементы без варианта-источника в этом шаге,
  // дети — по option-handle варианта (порядок — порядок элементов шага).
  const { rows, children, maxDepth, elementDepths } = useMemo(() => {
    const optionHandles = new Set(
      elements.flatMap((element) => element.complexLogic?.options.map((option) => option.handleId) ?? []),
    );
    const byHandle = new Map<string, CanvasElementData[]>();
    const rootList: CanvasElementData[] = [];
    for (const element of elements) {
      const parent = element.logicParentHandleId;
      if (parent && optionHandles.has(parent)) {
        byHandle.set(parent, [...(byHandle.get(parent) ?? []), element]);
      } else {
        rootList.push(element);
      }
    }
    // Полоса дерева: от колонки корня до самой глубокой колонки потомков.
    const deepest = (element: CanvasElementData): number =>
      Math.max(
        element.layerDepth ?? 0,
        ...(element.complexLogic?.options ?? []).flatMap((option) =>
          (byHandle.get(option.handleId) ?? []).map(deepest),
        ),
      );
    return {
      rows: packLayerBands(
        rootList.map((root) => ({ start: root.layerDepth ?? 0, end: deepest(root), item: root })),
      ),
      children: byHandle,
      maxDepth: Math.max(-1, ...elements.map((element) => element.layerDepth ?? 0)),
      elementDepths: new Map(elements.map((element) => [element.id, element.layerDepth ?? 0])),
    };
  }, [elements]);

  // Жест → колонка-кандидат, решение и якорь. Координаты — локальные
  // координаты слоя: узел внутри zoom react-flow, масштаб снимается по
  // отношению экранной ширины к собственной.
  const locate = useCallback(
    (event: DragEvent<HTMLElement>, dragged: ElementDragPayload): DragState | null => {
      const container = layersRef.current;
      if (!container) {
        return null;
      }
      const rect = container.getBoundingClientRect();
      const scale = container.offsetWidth > 0 ? rect.width / container.offsetWidth : 1;
      const localX = (event.clientX - rect.left) / scale;
      const column = nearestLayerColumn(gridLayerColumns(maxDepth, layerPolicy), localX);
      const own = elements.find((element) => element.id === dragged.elementId);
      const decision = resolveLayerDrop(
        layerPolicy,
        // Вид не важен: политика шага переносит любой элемент (ADR-17).
        { id: dragged.elementId, kind: 'element', depth: own ? (own.layerDepth ?? 0) : null },
        column,
        elementDepths,
      );
      let anchor = column
        ? anchorFromPoint(
            container,
            event.clientY,
            `[data-layer-depth="${column.depth}"] > [data-element-card]`,
          )
        : null;
      if (anchor && anchor.elementId === dragged.elementId) {
        anchor = null; // якорь на самой карточке — позиция не меняется
      }
      return { column, decision, anchor, layersWidth: container.offsetWidth };
    },
    [elementDepths, elements, maxDepth, layerPolicy],
  );

  const dropElement = useCallback(
    (dragged: ElementDragPayload, state: DragState) => {
      if (state.decision.kind === 'moveToLayer') {
        onDropElement(dragged, state.anchor, state.decision.depth);
        return;
      }
      // Своя колонка: без якоря порядок не меняется.
      if (state.anchor) {
        onDropElement(dragged, state.anchor);
      }
    },
    [onDropElement],
  );

  // Шаг — внутренняя зона узла формы: события drag дальше не идут.
  const { state: drag, handlers: dropHandlers } = useElementDropZone({
    locate,
    onDrop: dropElement,
    isolate: true,
  });

  const anchor = drag?.anchor ?? null;
  // Перенос в колонку без якоря-карточки (пустая колонка справа, зазор
  // между карточками) — вертикальная полоса в зазоре слева от колонки;
  // пустой шаг — горизонтальная полоса сверху. Подсветка колонки во всю
  // ширину здесь не рисуется: выходила за границу шага [owner 2026-10-15].
  const columnTarget = drag?.decision.kind === 'moveToLayer' && !anchor ? drag.column : null;

  const renderTree = (element: CanvasElementData): ReactNode => (
    <div key={element.id} className={classes.tree}>
      <div className={classes.cell} data-layer-depth={element.layerDepth ?? 0}>
        <DropIndicator anchor={anchor} elementId={element.id} placement="before" gap={L.rowGap} />
        <ElementCard element={element} />
        {element.complexLogic ? null : (
          <DropIndicator anchor={anchor} elementId={element.id} placement="after" gap={L.rowGap} />
        )}
      </div>
      {/* «После» Select'а — после всего его дерева (варианты и зависимые):
          туда элемент и встанет; полоса между Select'ом и его вариантами
          обещала место, которого нет (N2). */}
      {element.complexLogic ? (
        <DropIndicator
          anchor={anchor}
          elementId={element.id}
          placement="after"
          gap={L.rowGap}
          width={L.elementWidth}
        />
      ) : null}
      {/* Варианты Select'а — карточки под ним, если из варианта есть связь
          (variantsVisible; сейчас всегда — переход на шаг [owner 2026-10-14],
          а при «Сложной логике» — правило). */}
      {element.complexLogic
        ? element.complexLogic.options.map((option) => {
            const dependents = children.get(option.handleId) ?? [];
            return (
              <div key={option.handleId} className={classes.optionRow}>
                <div className={classes.cell}>
                  <OptionCard option={option} elementId={element.id} />
                </div>
                {dependents.length > 0 ? (
                  <div className={classes.subtrees}>{dependents.map(renderTree)}</div>
                ) : null}
              </div>
            );
          })
        : null}
    </div>
  );

  return (
    <div ref={layersRef} className={classes.layers} data-testid="form-step-layers" {...dropHandlers}>
      {/* Пока над шагом идёт drag, зона приёма продлена до пустой колонки
          справа (ADR-16) абсолютным слоем — размер шага не меняется: иначе
          узел формы рос, раскладка канваса (N12, measured) пересчитывалась
          и весь лэйаут дёргался [owner 2026-10-13]. */}
      {drag ? (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            width: (maxDepth + 1) * COLUMN_PITCH + L.elementWidth,
          }}
        />
      ) : null}
      {columnTarget ? (
        maxDepth < 0 ? (
          <DropBar
            orientation="horizontal"
            style={{
              position: 'absolute',
              top: '50%',
              left: DROP_BAR_INSET,
              width: L.elementWidth - 2 * DROP_BAR_INSET,
            }}
            testId="drop-zone-bar"
          />
        ) : (
          // Справа от последней колонки — посередине пути до границы шага.
          <ColumnDropBar
            x={columnBarX(columnTarget, {
              gap: L.columnGap,
              edge: L.stepPadding,
              right: (drag?.layersWidth ?? 0) + L.stepPadding,
            })}
          />
        )
      ) : null}
      {rows.map((row) => (
        <div key={row[0]!.item.id} className={classes.row}>
          {row.map((band, index) => {
            const previous = row[index - 1];
            // Отступ до колонки start: от левого края ряда или от предыдущей полосы.
            const marginLeft = previous
              ? (band.start - previous.end - 1) * COLUMN_PITCH + L.columnGap
              : band.start * COLUMN_PITCH;
            return (
              <div
                key={band.item.id}
                className={classes.band}
                style={{ marginLeft, width: (band.end - band.start) * COLUMN_PITCH + L.elementWidth }}
              >
                {renderTree(band.item)}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
