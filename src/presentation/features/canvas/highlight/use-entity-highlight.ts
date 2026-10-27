import { useEditorTheme } from '@presentation/theme/editor-theme';
import { useCanvasInteraction, type CanvasInteractionState } from '../canvas-interaction';
import {
  resolveHighlight,
  type HighlightFlags,
  type HighlightKind,
} from '@presentation/theme/highlight-policy';

/** Сущность с подсветкой; шаг знает свою форму — выделение шага = форма + шаг (S10). */
export type HighlightTarget =
  | { entity: 'node'; id: string }
  | { entity: 'step'; id: string; nodeId: string }
  | { entity: 'card'; id: string };

/** Ключ сущности в сторе (connectHover) и в разметке (data-highlight-key). */
export const highlightKey = (target: HighlightTarget): string => `${target.entity}:${target.id}`;

const SELECTED = 1;
const INVALID = 2;
const CONNECT_HOVER = 4;

// Флаги сущности из стора взаимодействия одним числом: селектор возвращает
// примитив, и сущность перерисовывается только при смене СВОИХ флагов (R-PERF-6).
function storeFlags(state: CanvasInteractionState, target: HighlightTarget): number {
  let flags = 0;
  const noElement = state.selectedElementIds.length === 0;
  switch (target.entity) {
    case 'node':
      // Выделен шаг или элемент — рамка у них, не у узла: одна рамка на одно выделение (F5).
      if (noElement && state.selectedStepId === null && state.selectedNodeId === target.id) {
        flags |= SELECTED;
      }
      if (state.violations.nodes.has(target.id)) {
        flags |= INVALID;
      }
      break;
    case 'step':
      if (noElement && state.selectedNodeId === target.nodeId && state.selectedStepId === target.id) {
        flags |= SELECTED;
      }
      break;
    case 'card':
      if (state.selectedElementIds.includes(target.id)) {
        flags |= SELECTED;
      }
      if (state.violations.elements.has(target.id)) {
        flags |= INVALID;
      }
      break;
  }
  if (state.connectHover === highlightKey(target)) {
    flags |= CONNECT_HOVER;
  }
  return flags;
}

const NO_FLAGS: HighlightFlags = {};

// Единственная точка, где решается подсветка сущности (R-PERF-6): флаги стора
// (выделение, ошибка, цель связи под курсором) + локальные флаги жеста dnd →
// итог по приоритету политики темы. Результат — значение data-highlight.
export function useEntityHighlight(
  target: HighlightTarget,
  local: HighlightFlags = NO_FLAGS,
): HighlightKind | null {
  const { priority } = useEditorTheme().editor.highlight;
  const flags = useCanvasInteraction((state) => storeFlags(state, target));
  return resolveHighlight(
    {
      ...local,
      selected: (flags & SELECTED) !== 0,
      invalid: (flags & INVALID) !== 0,
      connectHover: (flags & CONNECT_HOVER) !== 0,
    },
    priority,
  );
}
