import type { ServiceGraph } from '@domain/model/service-graph';
import type { ElementId } from '@domain/model/ids';
import type { Command, CommandContext } from './command';
import { removeWithCascade } from './cascade-remove';
import { findElementLocation } from './graph-lookup';

// Команда удаления элемента канваса (Epic 002, T-035): карточки страницы
// (ListItem/WidgetCard) или компонента формы. Элемент ищется по id во всём
// графе. Каскад — общий (R-CMD-1): исходящие связи (D9), правила логики (T-037),
// недопустимые переходы; входящие связи на страницы не трогаются.
// Несколько id — удаление группы выделенных одним шагом undo [owner 2026-10-27].
export class RemoveElement implements Command {
  readonly name = 'RemoveElement';
  private readonly elementIds: ReadonlySet<ElementId>;

  constructor(...elementIds: ElementId[]) {
    this.elementIds = new Set(elementIds);
  }

  apply(draft: ServiceGraph, { rules }: CommandContext): void {
    removeWithCascade(draft, rules, () => {
      for (const elementId of this.elementIds) {
        const location = findElementLocation(draft, elementId);
        if (!location) {
          throw new Error(`Элемент не найден: ${elementId}`);
        }
        location.list.splice(location.index, 1);
      }
      return { elementIds: this.elementIds };
    });
  }
}
