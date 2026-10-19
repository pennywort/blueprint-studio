import type { ServiceGraph } from '@domain/model/service-graph';
import type { ApplicationFormId, FormStepId } from '@domain/model/ids';
import { computeAllFormStepDepths } from '@domain/form-step-depths';
import { validStepTransitions } from '@domain/step-transitions';
import type { Command } from './command';
import { findFormById } from './graph-lookup';
import { preserveFormStepDepths } from './depth-preservation';
import { removeNonAdjacentStepTransitions, touchesStep } from './step-placement';

// Обмен шагов формы местами [owner 2026-10-15] (dnd шага на середину другого
// шага): шаги меняются уровнями (явный layerDepth) и местами в массиве шагов
// (порядок внутри уровня, D7) — содержимое шагов переезжает, подписи «Шаг N»
// остаются за позициями. Каскад — как у MoveFormStep: переходы шагов,
// ставшие несмежными, рвутся (N4); прочие шаги, чей уровень сдвинулся,
// закрепляются на прежнем (ADR-15). Отмена — undo шины.

export class SwapFormSteps implements Command {
  readonly name = 'SwapFormSteps';

  constructor(
    private readonly formId: ApplicationFormId,
    private readonly stepId: FormStepId,
    private readonly otherStepId: FormStepId,
  ) {}

  apply(draft: ServiceGraph): void {
    const depthsBefore = computeAllFormStepDepths(draft);
    const form = findFormById(draft, this.formId);
    if (!form) {
      throw new Error(`Форма не найдена: ${this.formId}`);
    }
    const index = form.steps.findIndex((step) => step.id === this.stepId);
    const otherIndex = form.steps.findIndex((step) => step.id === this.otherStepId);
    if (index < 0 || otherIndex < 0) {
      throw new Error(`Шаг не найден: ${index < 0 ? this.stepId : this.otherStepId} (форма ${this.formId})`);
    }
    if (index === otherIndex) {
      return; // шаг сам с собой — ничего не меняется
    }
    const step = form.steps[index]!;
    const other = form.steps[otherIndex]!;
    step.layerDepth = depthsBefore.get(other.id) ?? 0;
    other.layerDepth = depthsBefore.get(step.id) ?? 0;
    form.steps[index] = other;
    form.steps[otherIndex] = step;

    const touchesStepA = touchesStep(draft, step.id);
    const touchesStepB = touchesStep(draft, other.id);
    removeNonAdjacentStepTransitions(
      draft,
      (transition) => touchesStepA(transition) || touchesStepB(transition),
    );
    preserveFormStepDepths(draft, depthsBefore, new Set([step.id, other.id]));
    draft.stepTransitions = validStepTransitions(draft);
  }
}
