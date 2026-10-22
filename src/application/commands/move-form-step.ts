import type { ServiceGraph } from '@domain/model/service-graph';
import type { ApplicationFormId, FormStepId } from '@domain/model/ids';
import { computeAllFormStepDepths } from '@domain/form-step-depths';
import { moveByAnchor } from '@domain/ordered-move';
import { validStepTransitions } from '@domain/step-transitions';
import type { Command, CommandContext } from './command';
import { findFormById } from './graph-lookup';
import { placeFormStepIntoLayer } from './step-placement';

// Перенос шага формы заявки внутри формы (dnd заголовка шага [owner
// 2026-10-14]) — как dnd узлов канваса: шаги разложены по уровням
// (form-step-depths), своя колонка — порядок (якорь: соседний шаг и
// сторона от него, как ReorderInLayer), другая колонка — перенос на уровень
// явным layerDepth (как SetPageLayerDepth) и, если задан якорь, — на его
// место в колонке. Каскад переноса на уровень: переходы шага, ставшие
// несмежными, рвутся (N4); шаги, чей уровень сдвинулся, закрепляются (ADR-15).

export type StepDropAnchor = {
  /** Шаг-якорь той же формы: перемещаемый встаёт до/после него. */
  stepId: FormStepId;
  placement: 'before' | 'after';
};

export class MoveFormStep implements Command {
  readonly name = 'MoveFormStep';

  constructor(
    private readonly formId: ApplicationFormId,
    private readonly stepId: FormStepId,
    private readonly anchor: StepDropAnchor | null,
    /** Новый уровень шага; undefined — порядок внутри своего уровня. */
    private readonly layerDepth?: number,
  ) {}

  apply(draft: ServiceGraph, { rules }: CommandContext): void {
    const depthsBefore = computeAllFormStepDepths(draft);
    const form = findFormById(draft, this.formId);
    if (!form) {
      throw new Error(`Форма не найдена: ${this.formId}`);
    }
    if (!form.steps.some((step) => step.id === this.stepId)) {
      throw new Error(`Шаг не найден: ${this.stepId} (форма ${this.formId})`);
    }
    if (this.anchor && !form.steps.some((step) => step.id === this.anchor!.stepId)) {
      throw new Error(`Шаг-якорь не найден: ${this.anchor.stepId} (форма ${this.formId})`);
    }
    const anchor = this.anchor ? { id: this.anchor.stepId, placement: this.anchor.placement } : undefined;
    if (this.layerDepth !== undefined) {
      if (!Number.isInteger(this.layerDepth) || this.layerDepth < 0) {
        throw new Error(`Недопустимый уровень шага: ${this.layerDepth}`);
      }
      placeFormStepIntoLayer(draft, rules, this.stepId, this.layerDepth, depthsBefore, anchor);
    } else if (anchor) {
      moveByAnchor(form.steps, this.stepId, anchor);
    }
    draft.stepTransitions = validStepTransitions(draft, rules);
  }
}
