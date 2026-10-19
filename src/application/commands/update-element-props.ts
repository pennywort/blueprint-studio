import type { ServiceGraph } from '@domain/model/service-graph';
import { CanvasElementSchema, type CanvasElement, type ElementProps } from '@domain/model/canvas-element';
import type { ElementId } from '@domain/model/ids';
import { canBeLogicSource, elementVariants } from '@domain/element-kinds';
import { computeAllFormStepDepths } from '@domain/form-step-depths';
import { validStepTransitions } from '@domain/step-transitions';
import { computeFormElementDepths } from '@domain/step-element-depths';
import type { Command } from './command';
import { preserveFormElementDepths, preserveFormStepDepths } from './depth-preservation';
import { findElementLocation } from './graph-lookup';

// Частичное обновление элемента; id и kind исключены — идентичность и вид
// менять нельзя (для смены kind элемент пересоздаётся). props сливаются с
// текущими по ключам, ключ со значением undefined удаляется.
export type ElementPropsPatch = Partial<Omit<CanvasElement, 'id' | 'kind' | 'props'>> & {
  props?: Readonly<ElementProps>;
};

// Команда обновления атрибутов элемента (Epic 002, T-035): ей пользуется
// панель атрибутов (T-043) — любое изменение поля идёт через CommandBus и
// получает undo/redo из коробки. Патч сливается с текущими атрибутами,
// результат валидируется доменной zod-схемой элемента (конституция,
// железное правило 5: валидация — в домене), затем — общими инвариантами.
export class UpdateElementProps implements Command {
  readonly name = 'UpdateElementProps';

  constructor(
    private readonly elementId: ElementId,
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

    // Значения props — по JSON-схеме элемента (этап 3 docs/schemas/PLAN.md):
    // их тип задаёт редактор атрибута, выведенный из схемы; zod проверяет
    // только структуру элемента карты.
    const current = location.list[location.index]!;
    const { props: propsPatch, ...metaPatch } = this.props;
    const props: ElementProps = { ...current.props, ...propsPatch };
    for (const key of Object.keys(props)) {
      if (props[key] === undefined) {
        delete props[key];
      }
    }
    const parsed = CanvasElementSchema.safeParse({ ...current, ...metaPatch, props });
    if (!parsed.success) {
      throw new Error(`Недопустимые атрибуты элемента ${this.elementId}: ${parsed.error.message}`);
    }
    // zod отсекает неизвестные схеме поля — в граф попадает только контракт.
    location.list[location.index] = parsed.data;

    // Каскад сложной логики при удалении вариантов источника (T-037, §6
    // дизайн-дока): правила на удалённые варианты уходят вместе с ними
    // (UI недостижимость L-I2, инвариант — защита).
    if (canBeLogicSource(parsed.data)) {
      const optionValues = new Set<string>(elementVariants(parsed.data).map((variant) => variant.id));
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
