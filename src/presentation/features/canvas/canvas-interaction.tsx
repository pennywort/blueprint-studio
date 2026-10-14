import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react';
import type { CanvasElementKind } from '@domain/model/canvas-element';
import type { ConnectableTargets } from '@domain/connection-rules';
import type { CanvasNodeType } from './graph-flow-adapter';
import type { DropAnchorPosition, ElementDragPayload } from './element-dnd';
import type { StepAnchorPosition } from './step-dnd';
import type { ViolationMarkers } from './violation-markers';

// Состояние взаимодействия канваса — НЕ в data узлов (ревью A4/P3, R2):
// выделение, цель протягиваемой связи и нарушения живут
// во внешнем сторе; узел/карточка подписываются селектором
// (useSyncExternalStore) и перерисовываются, только когда меняется ИХ
// значение. Иначе любое выделение пересоздавало data всех узлов, и
// react-flow перерисовывал 121 узел и 1105 карточек стенда.

export type CanvasInteractionState = {
  selectedNodeId: string | null;
  selectedElementId: string | null;
  /** Выделенный шаг формы (S10) — подсветка колонки шага. */
  selectedStepId: string | null;
  /** Допустимые цели протягиваемой связи (ADR-14); null — связь не тянется. */
  connectionTargets: ConnectableTargets | null;
  /** Нарушения инвариантов узлов и элементов (T-043). */
  violations: ViolationMarkers;
};

export type CanvasInteractionStore = {
  getState: () => CanvasInteractionState;
  setState: (patch: Partial<CanvasInteractionState>) => void;
  subscribe: (listener: () => void) => () => void;
};

const NO_VIOLATIONS: ViolationMarkers = { nodes: new Map(), elements: new Map() };

export const INITIAL_CANVAS_INTERACTION: CanvasInteractionState = {
  selectedNodeId: null,
  selectedElementId: null,
  selectedStepId: null,
  connectionTargets: null,
  violations: NO_VIOLATIONS,
};

export function createCanvasInteractionStore(): CanvasInteractionStore {
  let state = INITIAL_CANVAS_INTERACTION;
  const listeners = new Set<() => void>();
  return {
    getState: () => state,
    setState: (patch) => {
      const keys = Object.keys(patch) as (keyof CanvasInteractionState)[];
      if (keys.every((key) => patch[key] === state[key])) {
        return;
      }
      state = { ...state, ...patch };
      for (const listener of listeners) {
        listener();
      }
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

// Действия узлов и карточек (ревью A4): раньше — колбэки в data каждого
// узла/карточки. Объект стабилен (создаётся один раз хуком), поэтому
// контекст не перерисовывает потребителей.
export type CanvasActions = {
  selectElement: (elementId: string) => void;
  toggleComplexLogic: (elementId: string) => void;
  removeNode: (nodeId: string, nodeType: CanvasNodeType) => void;
  addElementToStep: (formId: string, stepId: string, kind: CanvasElementKind) => void;
  removeStep: (formId: string, stepId: string) => void;
  addFormStep: (formId: string) => void;
  /**
   * Dnd шага за заголовок [owner 2026-10-14]: внутри своей формы — к якорю-соседу
   * в своём уровне или на другой уровень (layerDepth; якорь — место в колонке).
   */
  moveStep: (formId: string, stepId: string, anchor: StepAnchorPosition | null, layerDepth?: number) => void;
  /**
   * Dnd карточек (N2): drop в списке узла или колонке шага. targetStepId —
   * шаг-цель у форм; null — общий список узла страницы. Якорь — позиция
   * вставки (null — в конец); layerDepth — колонка шага (undefined — та же).
   */
  moveElement: (
    nodeId: string,
    nodeType: CanvasNodeType,
    targetStepId: string | null,
    dragged: ElementDragPayload,
    anchor: DropAnchorPosition | null,
    layerDepth?: number,
  ) => void;
  /** Варианты меню «+» шага формы — все виды элементов (ADR-17). */
  elementKindOptions: ReadonlyArray<{ kind: CanvasElementKind; label: string }>;
};

const StoreContext = createContext<CanvasInteractionStore | null>(null);
const ActionsContext = createContext<CanvasActions | null>(null);

export function CanvasInteractionProvider({
  store,
  actions,
  children,
}: {
  store: CanvasInteractionStore;
  actions: CanvasActions;
  children: ReactNode;
}) {
  return (
    <StoreContext.Provider value={store}>
      <ActionsContext.Provider value={actions}>{children}</ActionsContext.Provider>
    </StoreContext.Provider>
  );
}

// Вне провайдера (изолированный рендер узла) — пустое состояние, без падения.
const FALLBACK_STORE = createCanvasInteractionStore();

/**
 * Подписка на срез состояния: селектор должен возвращать примитив или
 * стабильную ссылку — компонент перерисуется, только если значение изменилось.
 */
export function useCanvasInteraction<T>(selector: (state: CanvasInteractionState) => T): T {
  const store = useContext(StoreContext) ?? FALLBACK_STORE;
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getState()),
  );
}

export function useCanvasActions(): CanvasActions | null {
  return useContext(ActionsContext);
}
