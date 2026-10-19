import type { ServiceGraph } from '@domain/model/service-graph';
import { CanvasElementSchema, type CanvasElement } from '@domain/model/canvas-element';
import type { ElementId, FormComponentId } from '@domain/model/ids';
import { computeAllFormStepDepths } from '@domain/form-step-depths';
import { validStepTransitions } from '@domain/step-transitions';
import { computeFormElementDepths } from '@domain/step-element-depths';
import type { Command } from './command';
import { preserveFormElementDepths, preserveFormStepDepths } from './depth-preservation';
import { findElementLocation } from './graph-lookup';

// Частичное обновление атрибутов элемента; id и kind исключены — идентичность
// и дискриминатор union менять нельзя (для смены kind элемент пересоздаётся).
type DistributivePartial<T> = T extends unknown ? Partial<Omit<T, 'id' | 'kind'>> : never;
export type ElementPropsPatch = DistributivePartial<CanvasElement>;

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
    // Уровни шагов до мутации: шаг, потерявший входящий переход, остаётся на месте (ADR-15).
    const stepDepthsBefore = computeAllFormStepDepths(draft);
    // Колонки элементов шагов до мутации: цель, потерявшая правило, остаётся на месте (ADR-15).
    const elementDepthsBefore = computeFormElementDepths(draft);
    if ('id' in this.props || 'kind' in this.props) {
      throw new Error(`UpdateElementProps не меняет id/kind элемента (${this.elementId})`);
    }

    const location = findElementLocation(draft, this.elementId);
    if (!location) {
      throw new Error(`Элемент не найден: ${this.elementId}`);
    }

    // Схема выбирается дискриминатором kind самого элемента: блок больше не
    // определяет вид элемента [owner 2026-10-13].
    const merged = { ...location.list[location.index], ...this.props };
    const parsed = CanvasElementSchema.safeParse(merged);
    if (!parsed.success) {
      throw new Error(`Недопустимые атрибуты элемента ${this.elementId}: ${parsed.error.message}`);
    }
    // zod отсекает неизвестные схеме поля — в граф попадает только контракт.
    location.list[location.index] = parsed.data;

    // Каскад сложной логики при удалении option'ов Select'а-источника
    // (T-037, §6 дизайн-дока): правила на удалённые значения списка уходят
    // вместе со значением (UI недостижимость L-I2, инвариант — защита).
    if (parsed.data.kind === 'selectList') {
      const optionValues = new Set(parsed.data.options.map((option) => option.value));
      draft.logicRules = draft.logicRules.filter(
        (rule) =>
          rule.sourceElementId !== this.elementId ||
          (rule.condition.kind === 'optionSelected' && optionValues.has(rule.condition.optionId)),
      );
    }

    preserveFormElementDepths(draft, elementDepthsBefore);

    // Каскад переходов между шагами [owner 2026-10-14]: переходы, ставшие
    // недопустимыми (удалён вариант Select'а), уходят вместе с причиной.
    preserveFormStepDepths(draft, stepDepthsBefore);
    draft.stepTransitions = validStepTransitions(draft);
  }
}
