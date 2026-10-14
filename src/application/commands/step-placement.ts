import type { ServiceGraph } from '@domain/model/service-graph';
import type { StepTransition } from '@domain/model/step-transition';
import { computeAllFormStepDepths } from '@domain/form-step-depths';
import { moveByAnchor } from '@domain/ordered-move';
import { stepTransitionSourceStepId } from '@domain/step-transitions';
import { preserveFormStepDepths } from './depth-preservation';

// Раскладка шагов формы по уровням [owner 2026-10-14] — те же правила, что у
// страниц канваса (layer-placement): переход осмыслен между смежными
// уровнями «источник + 1 = цель» (N4), цель нового перехода встаёт на
// уровень «источник + 1» в конец его колонки (D7), прочие шаги, чей уровень
// сдвинулся, закрепляются на прежнем (ADR-15).

// Каскад N4 для шагов: рвёт переходы, отобранные affects, у которых уровни
// источника и цели перестали быть смежными.
export function removeNonAdjacentStepTransitions(
  draft: ServiceGraph,
  affects: (transition: StepTransition) => boolean,
): void {
  const depths = computeAllFormStepDepths(draft);
  draft.stepTransitions = draft.stepTransitions.filter((transition) => {
    if (!affects(transition)) {
      return true;
    }
    const sourceStepId = stepTransitionSourceStepId(draft, transition);
    const sourceDepth = sourceStepId !== null ? depths.get(sourceStepId) : undefined;
    const targetDepth = depths.get(transition.targetStepId);
    if (sourceDepth === undefined || targetDepth === undefined) {
      return true; // битый переход — решает инвариант, здесь не трогаем
    }
    return targetDepth === sourceDepth + 1;
  });
}

// Переходы, касающиеся шага (входящие и исходящие).
export const touchesStep =
  (draft: ServiceGraph, stepId: string) =>
  (transition: StepTransition): boolean =>
    transition.targetStepId === stepId || stepTransitionSourceStepId(draft, transition) === stepId;

// Шаг встаёт на уровень depth; если уровень изменился и якоря нет — в конец
// новой колонки (порядок внутри уровня — порядок массива шагов, D7).
export function placeFormStepIntoLayer(
  draft: ServiceGraph,
  stepId: string,
  depth: number,
  depthsBefore: ReadonlyMap<string, number>,
  anchor?: { id: string; placement: 'before' | 'after' },
): void {
  const form = draft.applicationForms.find((candidate) => candidate.steps.some((step) => step.id === stepId));
  const step = form?.steps.find((candidate) => candidate.id === stepId);
  if (!form || !step) {
    return; // существование шага проверяют команды до вызова
  }
  step.layerDepth = depth;
  removeNonAdjacentStepTransitions(draft, touchesStep(draft, stepId));
  preserveFormStepDepths(draft, depthsBefore, new Set([stepId]));

  if (anchor) {
    moveByAnchor(form.steps, stepId, anchor);
    return;
  }
  if (depthsBefore.get(stepId) === depth) {
    return; // тот же уровень — шаг остаётся на своём месте в колонке
  }
  const depthsAfter = computeAllFormStepDepths(draft);
  const column = form.steps.filter((other) => other.id !== stepId && depthsAfter.get(other.id) === depth);
  const lastInColumn = column[column.length - 1];
  if (lastInColumn) {
    moveByAnchor(form.steps, stepId, { id: lastInColumn.id, placement: 'after' });
  }
}

// Цель перехода — на уровень «источник + 1» (как placeLinkTargetIntoNextLayer).
export function placeStepTransitionTarget(
  draft: ServiceGraph,
  transition: StepTransition,
  depthsBefore: ReadonlyMap<string, number>,
): void {
  const sourceStepId = stepTransitionSourceStepId(draft, transition);
  const sourceDepth = sourceStepId !== null ? depthsBefore.get(sourceStepId) : undefined;
  if (sourceDepth === undefined) {
    return; // переход не из шага формы — решает инвариант
  }
  placeFormStepIntoLayer(draft, transition.targetStepId, sourceDepth + 1, depthsBefore);
}
