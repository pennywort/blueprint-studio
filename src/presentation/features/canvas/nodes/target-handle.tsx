import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useCanvasInteraction, type CanvasInteractionState } from '../canvas-interaction';
import { highlightKey, type HighlightTarget } from '../highlight/use-entity-highlight';

// Допустима ли сущность как цель протягиваемой связи — по виду сущности.
const isAvailable = (
  state: CanvasInteractionState,
  entity: HighlightTarget['entity'],
  id: string,
): boolean => {
  const targets = state.connectionTargets;
  if (!targets) {
    return false;
  }
  return entity === 'node'
    ? targets.pages.has(id)
    : entity === 'step'
      ? targets.steps.has(id)
      : targets.elements.has(id);
};

export type TargetHandleProps = {
  entity: HighlightTarget['entity'];
  id: string;
  /** Узел шага (только для entity = 'step'). */
  nodeId?: string;
  /** Id handle в react-flow; без него — handle узла по умолчанию. */
  handleId?: string;
};

// Принимающий handle сущности (ADR-14) — один для узла, шага и карточки: в
// покое невидим и не ловит мышь, во время протягивания связи у допустимой
// цели накрывает сущность целиком и принимает связь. Своя подписка на стор
// (R-PERF): старт связи перерисовывает только эти handles, а не узлы целиком.
export const TargetHandle = memo(function TargetHandle({ entity, id, nodeId, handleId }: TargetHandleProps) {
  const available = useCanvasInteraction((state) => isAvailable(state, entity, id));
  const target: HighlightTarget = entity === 'step' ? { entity, id, nodeId: nodeId ?? '' } : { entity, id };
  return (
    <Handle
      type="target"
      position={Position.Left}
      id={handleId}
      className={available ? 'editor-target editor-target-available' : 'editor-target'}
      data-highlight-key={highlightKey(target)}
    />
  );
});
