import type { ServiceGraph } from '@domain/model/service-graph';
import type { ApplicationFormId } from '@domain/model/ids';
import type { Command, CommandContext } from './command';
import { elementIdsOf } from '@domain/cascade-removal';
import { removeWithCascade } from './cascade-remove';

// Команда удаления формы заявки (Epic 002, T-035). Каскад — общий (R-CMD-1):
// входящие связи на форму (D12 — форма может быть целью связи), исходящие связи
// и правила логики её элементов (ADR-17, T-037, L-I5), недопустимые переходы.
export class RemoveForm implements Command {
  readonly name = 'RemoveForm';

  constructor(private readonly formId: ApplicationFormId) {}

  apply(draft: ServiceGraph, { rules }: CommandContext): void {
    removeWithCascade(draft, rules, () => {
      const index = draft.applicationForms.findIndex((form) => form.id === this.formId);
      if (index < 0) {
        throw new Error(`Форма не найдена: ${this.formId}`);
      }
      const [form] = draft.applicationForms.splice(index, 1);
      return { elementIds: elementIdsOf(form!.steps), targetIds: new Set([this.formId]) };
    });
  }
}
