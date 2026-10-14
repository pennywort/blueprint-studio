import { useCallback, useMemo, useRef, type DragEvent, type ReactNode } from 'react';
import { makeStyles } from '@blueprint-vendor/flamingo-core';
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
import { FORM_STEP_LAYER_POLICY } from '../layers/layer-policy';
import { LayerDropHighlight } from '../layers/layer-drop-highlight';
import { packLayerBands } from '../layers/layer-bands';
import { ElementCard } from './element-card';
import { OptionCard } from './option-card';
import { useCanvasActions } from '../canvas-interaction';
import { DropIndicator, useElementDropZone } from './use-element-drop-zone';

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
    display: 'flex',
    flexDirection: 'column',
    gap: L.rowGap,
  },
  // Ячейка колонки: ширина фиксирована — колонки всех деревьев шага
  // выровнены по одной сетке (gridLayerColumns).
  cell: {
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
  const actions = useCanvasActions();
  const layersRef = useRef<HTMLDivElement>(null);
  // Лес правил: корни — элементы без варианта-источника в этом шаге,
  // дети — по option-handle варианта (порядок — порядок элементов шага).
  const { rows, children, maxDepth } = useMemo(() => {
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
      const column = nearestLayerColumn(gridLayerColumns(maxDepth, FORM_STEP_LAYER_POLICY), localX);
      const own = elements.find((element) => element.id === dragged.elementId);
      const decision = resolveLayerDrop(own ? (own.layerDepth ?? 0) : null, column, true);
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
      return { column, decision, anchor };
    },
    [elements, maxDepth],
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

  const renderTree = (element: CanvasElementData): ReactNode => (
    <div key={element.id} className={classes.tree}>
      <div className={classes.cell} data-layer-depth={element.layerDepth ?? 0}>
        <DropIndicator anchor={anchor} elementId={element.id} placement="before" />
        <ElementCard element={element} />
        <DropIndicator anchor={anchor} elementId={element.id} placement="after" />
      </div>
      {/* Варианты Select'а — карточки под ним всегда [owner 2026-10-14]: из
          варианта тянется переход на шаг, а при «Сложной логике» — и правило. */}
      {element.complexLogic
        ? element.complexLogic.options.map((option) => {
            const dependents = children.get(option.handleId) ?? [];
            return (
              <div key={option.handleId} className={classes.optionRow}>
                <div className={classes.cell}>
                  <OptionCard option={option} onSelect={() => actions?.selectElement(element.id)} />
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
      {drag?.decision.kind === 'moveToLayer' && drag.column ? (
        <LayerDropHighlight
          left={drag.column.x}
          width={drag.column.width}
          style={{ borderRadius: 12, zIndex: 0 }}
        />
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
