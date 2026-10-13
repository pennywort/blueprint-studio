import { useCallback, useMemo, useRef, useState, type DragEvent, type ReactNode } from 'react';
import { Box, makeStyles } from '@blueprint-vendor/flamingo-core';
import type { EditorTheme } from '@presentation/theme/editor-theme';
import { FORM_STEP_LAYOUT } from '../canvas-layout';
import type { CanvasElementData } from '../graph-flow-adapter';
import {
  anchorFromPoint,
  readElementDndId,
  readElementDndKind,
  readElementDrag,
  type DropAnchorPosition,
  type ElementDragPayload,
} from '../element-dnd';
import {
  gridLayerColumns,
  nearestLayerColumn,
  resolveLayerDrop,
  type LayerColumn,
  type LayerDropDecision,
} from '../layers/layer-columns';
import { FORM_STEP_LAYER_POLICY, canMoveToLayer } from '../layers/layer-policy';
import { LayerDropHighlight } from '../layers/layer-drop-highlight';
import { ElementCard } from './element-card';
import { OptionCard } from './option-card';

const L = FORM_STEP_LAYOUT;

const useStyles = makeStyles<EditorTheme>((theme) => ({
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
  band: {
    display: 'flex',
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
  dropIndicator: {
    height: 2,
    borderRadius: 1,
    backgroundColor: theme.editor.canvas.edge,
    margin: '-1px 0',
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
  const layersRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  // Лес правил: корни — элементы без варианта-источника в этом шаге,
  // дети — по option-handle варианта (порядок — порядок элементов шага).
  const { roots, children, maxDepth } = useMemo(() => {
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
    return {
      roots: rootList,
      children: byHandle,
      maxDepth: Math.max(-1, ...elements.map((element) => element.layerDepth ?? 0)),
    };
  }, [elements]);

  // Жест → колонка-кандидат, решение и якорь. Координаты — локальные
  // координаты слоя: узел внутри zoom react-flow, масштаб снимается по
  // отношению экранной ширины к собственной.
  const locate = useCallback(
    (event: DragEvent<HTMLElement>): DragState | null => {
      const container = layersRef.current;
      const kind = readElementDndKind(event.dataTransfer.types);
      if (!container || !kind || !canMoveToLayer(FORM_STEP_LAYER_POLICY, kind)) {
        return null;
      }
      const rect = container.getBoundingClientRect();
      const scale = container.offsetWidth > 0 ? rect.width / container.offsetWidth : 1;
      const localX = (event.clientX - rect.left) / scale;
      const column = nearestLayerColumn(gridLayerColumns(maxDepth, FORM_STEP_LAYER_POLICY), localX);
      const draggedId = readElementDndId(event.dataTransfer.types);
      const own = elements.find((element) => element.id.toLowerCase() === draggedId);
      const decision = resolveLayerDrop(own ? (own.layerDepth ?? 0) : null, column, true);
      let anchor = column
        ? anchorFromPoint(
            container,
            event.clientY,
            `[data-layer-depth="${column.depth}"] > [data-element-card]`,
          )
        : null;
      if (anchor && anchor.elementId.toLowerCase() === draggedId) {
        anchor = null; // якорь на самой карточке — позиция не меняется
      }
      return { column, decision, anchor };
    },
    [elements, maxDepth],
  );

  const handleDragOver = useCallback(
    (event: DragEvent<HTMLElement>) => {
      const state = locate(event);
      if (!state) {
        setDrag(null);
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = 'move';
      setDrag(state);
    },
    [locate],
  );

  const handleDragLeave = useCallback((event: DragEvent<HTMLElement>) => {
    // Переход на дочерний элемент слоя — не уход из зоны.
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setDrag(null);
    }
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLElement>) => {
      const state = locate(event);
      setDrag(null);
      const dragged = readElementDrag(event.dataTransfer);
      if (!state || !dragged) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      if (state.decision.kind === 'moveToLayer') {
        onDropElement(dragged, state.anchor, state.decision.depth);
        return;
      }
      // Своя колонка: без якоря порядок не меняется.
      if (state.anchor) {
        onDropElement(dragged, state.anchor);
      }
    },
    [locate, onDropElement],
  );

  const anchor = drag?.anchor ?? null;
  const indicator = (elementId: string, placement: 'before' | 'after') =>
    anchor?.elementId === elementId && anchor.placement === placement ? (
      <Box className={classes.dropIndicator} data-testid="drop-indicator" />
    ) : null;

  const renderTree = (element: CanvasElementData): ReactNode => (
    <Box key={element.id} className={classes.tree}>
      <Box className={classes.cell} data-layer-depth={element.layerDepth ?? 0}>
        {indicator(element.id, 'before')}
        <ElementCard element={element} />
        {indicator(element.id, 'after')}
      </Box>
      {element.complexLogic?.enabled
        ? element.complexLogic.options.map((option) => {
            const dependents = children.get(option.handleId) ?? [];
            return (
              <Box key={option.handleId} className={classes.optionRow}>
                <Box className={classes.cell}>
                  <OptionCard option={option} onSelect={element.onSelect} />
                </Box>
                {dependents.length > 0 ? (
                  <Box className={classes.subtrees}>{dependents.map(renderTree)}</Box>
                ) : null}
              </Box>
            );
          })
        : null}
    </Box>
  );

  return (
    <div
      ref={layersRef}
      className={classes.layers}
      data-testid="form-step-layers"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {drag?.decision.kind === 'moveToLayer' && drag.column ? (
        <LayerDropHighlight
          left={drag.column.x}
          width={drag.column.width}
          style={{ borderRadius: 12, zIndex: 0 }}
        />
      ) : null}
      {roots.map((root) => (
        // Дерево начинается в колонке своего корня (явная колонка или 0).
        <Box
          key={root.id}
          className={classes.band}
          style={{ marginLeft: (root.layerDepth ?? 0) * (L.elementWidth + L.columnGap) }}
        >
          {renderTree(root)}
        </Box>
      ))}
    </div>
  );
}
