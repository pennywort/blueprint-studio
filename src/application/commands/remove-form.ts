import type { ServiceGraph } from '@domain/model/service-graph';
import type { ApplicationFormId } from '@domain/model/ids';
import { validateGraph } from '@domain/invariants';
import type { Command } from './command';
import { InvariantViolationError } from './errors';

// Команда удаления формы заявки (Epic 002, T-035) с каскадом связей:
// удаляются все связи, направленные на эту форму (D12 — форма может быть
// целью связи на общих основаниях). Исходящих связей у формы нет:
// источник связи — элемент страницы (ElementId, D9), а не компонент формы.
export class RemoveForm implements Command {
  readonly name = 'RemoveForm';

  constructor(private readonly formId: ApplicationFormId) {}

  apply(draft: ServiceGraph): void {
    const index = draft.applicationForms.findIndex((form) => form.id === this.formId);
    if (index < 0) {
      throw new Error(`Форма не найдена: ${this.formId}`);
    }

    draft.applicationForms.splice(index, 1);
    draft.links = draft.links.filter((link) => link.targetId !== this.formId);

    const violations = validateGraph(draft);
    if (violations.length > 0) {
      throw new InvariantViolationError(violations);
    }
  }
}
