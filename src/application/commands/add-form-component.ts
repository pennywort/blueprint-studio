import type { ServiceGraph } from '@domain/model/service-graph';
import type { CanvasElement } from '@domain/model/canvas-element';
import type { ApplicationFormId, FormStepId } from '@domain/model/ids';
import { computeStepElementDepths } from '@domain/step-element-depths';
import type { Command } from './command';

// Команда добавления элемента на шаг формы заявки; элемент шага — любой
// элемент канваса [owner 2026-10-13], не только форм-компонент.
// Инварианты проверяются на черновике до фиксации (CommandBus, R-ARC-2): при
// нарушении — InvariantViolationError, produceWithPatches отменяется, и состояние
// остаётся нетронутым (история undo/redo не засоряется).
export class AddFormComponent implements Command {
  readonly name = 'AddFormComponent';

  constructor(
    private readonly formId: ApplicationFormId,
    private readonly stepId: FormStepId,
    private readonly component: CanvasElement,
  ) {}

  apply(draft: ServiceGraph): void {
    const form = draft.applicationForms.find((candidate) => candidate.id === this.formId);
    if (!form) {
      throw new Error(`Форма не найдена: ${this.formId}`);
    }

    const step = form.steps.find((candidate) => candidate.id === this.stepId);
    if (!step) {
      throw new Error(`Шаг не найден: ${this.stepId} (форма ${this.formId})`);
    }

    // Новый элемент без правил встаёт в колонку правее самой глубокой —
    // шаг растёт по горизонтали [owner 2026-10-13], как новый блок на
    // канвасе страниц (addNode → следующий уровень). Явная колонка
    // вызывающей стороны не переопределяется.
    const depths = [...computeStepElementDepths(step, draft.logicRules).values()];
    const nextColumn = depths.length === 0 ? 0 : Math.max(...depths) + 1;
    step.elements.push({ ...this.component, layerDepth: this.component.layerDepth ?? nextColumn });
  }
}
