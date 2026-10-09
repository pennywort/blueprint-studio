import type { ServiceGraph } from '@domain/model/service-graph';
import type { ApplicationForm } from '@domain/model/scenario';
import { validateGraph } from '@domain/invariants';
import type { Command } from './command';
import { InvariantViolationError } from './errors';
import { nextPageOrderIndex } from './graph-lookup';

// Команда добавления формы заявки (Epic 002, T-035). Форм в карте может быть
// любое количество (D8). Готовая сущность приходит в конструктор;
// персистентный порядковый номер выдаёт команда — следующий по порядку
// добавления среди всех страниц карты (D13, форма в слоях на общих
// основаниях — D12).
export class AddForm implements Command {
  readonly name = 'AddForm';

  constructor(private readonly form: Omit<ApplicationForm, 'orderIndex'>) {}

  apply(draft: ServiceGraph): void {
    draft.applicationForms.push({ ...this.form, orderIndex: nextPageOrderIndex(draft) });

    const violations = validateGraph(draft);
    if (violations.length > 0) {
      throw new InvariantViolationError(violations);
    }
  }
}
