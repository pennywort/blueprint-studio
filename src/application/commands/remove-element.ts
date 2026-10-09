import type { ServiceGraph } from '@domain/model/service-graph';
import type { ElementId, FormComponentId } from '@domain/model/ids';
import { validateGraph } from '@domain/invariants';
import type { Command } from './command';
import { InvariantViolationError } from './errors';
import { findElementLocation } from './graph-lookup';

// Команда удаления элемента канваса (Epic 002, T-035): карточки страницы
// (ListItem/WidgetCard) или компонента формы. Элемент ищется по id во всём
// графе. Каскад: вместе с элементом уходят его исходящие связи (источник
// связи — элемент страницы, D9); входящие связи на страницы не трогаются.
export class RemoveElement implements Command {
  readonly name = 'RemoveElement';

  constructor(private readonly elementId: ElementId | FormComponentId) {}

  apply(draft: ServiceGraph): void {
    const location = findElementLocation(draft, this.elementId);
    if (!location) {
      throw new Error(`Элемент не найден: ${this.elementId}`);
    }

    location.list.splice(location.index, 1);
    draft.links = draft.links.filter((link) => link.sourceElementId !== this.elementId);

    const violations = validateGraph(draft);
    if (violations.length > 0) {
      throw new InvariantViolationError(violations);
    }
  }
}
