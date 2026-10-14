import type { ServiceGraph } from '@domain/model/service-graph';
import type { FormStep } from '@domain/model/scenario';
import type { ApplicationFormId } from '@domain/model/ids';
import { validateGraph } from '@domain/invariants';
import { nextFormStepLayerDepth } from '@domain/form-step-depths';
import type { Command } from './command';
import { InvariantViolationError } from './errors';
import { findFormById } from './graph-lookup';

// Команда добавления шага формы заявки (Epic 002, T-035; D1 — шаги формы
// редактируются на общем канвасе). Готовый шаг приходит в конструктор;
// без явного index шаг встаёт в конец — шаги упорядочены массивом (БТ 6.5).
// Уровень нового шага — следующий за самым глубоким, если не задан явно
// (как колонка нового подсценария, AddScenario [owner 2026-10-14]).
export class AddFormStep implements Command {
  readonly name = 'AddFormStep';

  constructor(
    private readonly formId: ApplicationFormId,
    private readonly step: FormStep,
    private readonly index?: number,
  ) {}

  apply(draft: ServiceGraph): void {
    const form = findFormById(draft, this.formId);
    if (!form) {
      throw new Error(`Форма не найдена: ${this.formId}`);
    }

    const at = this.index ?? form.steps.length;
    if (at < 0 || at > form.steps.length) {
      throw new Error(
        `Позиция шага вне диапазона: ${at} (форма ${this.formId}, шагов: ${form.steps.length})`,
      );
    }
    const layerDepth = this.step.layerDepth ?? nextFormStepLayerDepth(form, draft.stepTransitions);
    form.steps.splice(at, 0, { ...this.step, layerDepth });

    const violations = validateGraph(draft);
    if (violations.length > 0) {
      throw new InvariantViolationError(violations);
    }
  }
}
