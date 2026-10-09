import type { ServiceGraph } from '@domain/model/service-graph';
import { ListItemSchema, WidgetCardSchema, type ListItem, type WidgetCard } from '@domain/model/scenario';
import { FormComponentSchema, type FormComponent } from '@domain/model/form-components';
import type { ElementId, FormComponentId } from '@domain/model/ids';
import { validateGraph } from '@domain/invariants';
import type { Command } from './command';
import { InvariantViolationError } from './errors';
import { findElementLocation } from './graph-lookup';

// Частичное обновление атрибутов элемента; id и kind исключены — идентичность
// и дискриминатор union менять нельзя (для смены kind элемент пересоздаётся).
type DistributivePartial<T> = T extends unknown ? Partial<Omit<T, 'id' | 'kind'>> : never;
export type ElementPropsPatch = DistributivePartial<ListItem | WidgetCard | FormComponent>;

// Команда обновления атрибутов элемента (Epic 002, T-035): ей пользуется
// панель атрибутов (T-043) — любое изменение поля идёт через CommandBus и
// получает undo/redo из коробки. Патч сливается с текущими атрибутами,
// результат валидируется доменной zod-схемой элемента (конституция,
// железное правило 5: валидация — в домене), затем — общими инвариантами.
export class UpdateElementProps implements Command {
  readonly name = 'UpdateElementProps';

  constructor(
    private readonly elementId: ElementId | FormComponentId,
    private readonly props: ElementPropsPatch,
  ) {}

  apply(draft: ServiceGraph): void {
    if ('id' in this.props || 'kind' in this.props) {
      throw new Error(`UpdateElementProps не меняет id/kind элемента (${this.elementId})`);
    }

    const location = findElementLocation(draft, this.elementId);
    if (!location) {
      throw new Error(`Элемент не найден: ${this.elementId}`);
    }

    const merged = { ...location.list[location.index], ...this.props };
    const schema =
      location.kind === 'homeWidgetCard'
        ? WidgetCardSchema
        : location.kind === 'formComponent'
          ? FormComponentSchema
          : ListItemSchema;

    const parsed = schema.safeParse(merged);
    if (!parsed.success) {
      throw new Error(`Недопустимые атрибуты элемента ${this.elementId}: ${parsed.error.message}`);
    }
    // zod отсекает неизвестные схеме поля — в граф попадает только контракт.
    location.list[location.index] = parsed.data;

    const violations = validateGraph(draft);
    if (violations.length > 0) {
      throw new InvariantViolationError(violations);
    }
  }
}
