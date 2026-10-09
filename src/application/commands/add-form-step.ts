import type { ServiceGraph } from '@domain/model/service-graph';
import type { FormStep } from '@domain/model/scenario';
import type { ApplicationFormId } from '@domain/model/ids';
import { validateGraph } from '@domain/invariants';
import type { Command } from './command';
import { InvariantViolationError } from './errors';
import { findFormById } from './graph-lookup';

// Команда добавления шага формы заявки (Epic 002, T-035; D1 — шаги формы
// редактируются на общем канвасе). Готовый шаг приходит в конструктор;
// без явного index шаг встаёт в конец — шаги упорядочены массивом (БТ 6.5).
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
    form.steps.splice(at, 0, this.step);

    const violations = validateGraph(draft);
    if (violations.length > 0) {
      throw new InvariantViolationError(violations);
    }
  }
}
