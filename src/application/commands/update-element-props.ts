import type { ServiceGraph } from '@domain/model/service-graph';
import { CanvasElementSchema, type CanvasElement, type ElementProps } from '@domain/model/canvas-element';
import type { ElementId } from '@domain/model/ids';
import { elementVariants, hasElementVariants } from '@domain/element-kinds';
import { computeAllFormStepDepths } from '@domain/form-step-depths';
import { validStepTransitions } from '@domain/step-transitions';
import { computeFormElementDepths } from '@domain/step-element-depths';
import type { Command, CommandContext } from './command';
import { preserveFormElementDepths, preserveFormStepDepths } from './depth-preservation';
import { findElementLocation } from './graph-lookup';

// Частичное обновление элемента; id и kind исключены — идентичность и вид
// менять нельзя (для смены kind элемент пересоздаётся). props и ext
// (надстройки проекта) сливаются с текущими по ключам, ключ со значением
// undefined удаляется.
export type ElementPropsPatch = Partial<Omit<CanvasElement, 'id' | 'kind' | 'props' | 'ext'>> & {
  props?: Readonly<ElementProps>;
  ext?: Readonly<ElementProps>;
};

// Слияние значений по ключам; undefined снимает ключ.
function mergeValues(
  current: ElementProps | undefined,
  patch: Readonly<ElementProps> | undefined,
): ElementProps {
  const merged: ElementProps = { ...current, ...patch };
  for (const key of Object.keys(merged)) {
    if (merged[key] === undefined) {
      delete merged[key];
    }
  }
  return merged;
}

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

  apply(draft: ServiceGraph, { rules }: CommandContext): void {
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
    const { props: propsPatch, ext: extPatch, ...metaPatch } = this.props;
    const props = mergeValues(current.props, propsPatch);
    // Пустые надстройки не храним: элемент без ext — как до надстроек.
    const ext = mergeValues(current.ext, extPatch);
    const parsed = CanvasElementSchema.safeParse({
      ...current,
      ...metaPatch,
      props,
      ext: Object.keys(ext).length > 0 ? ext : undefined,
    });
    if (!parsed.success) {
      throw new Error(`Недопустимые атрибуты элемента ${this.elementId}: ${parsed.error.message}`);
    }
    // zod отсекает неизвестные схеме поля — в граф попадает только контракт.
    location.list[location.index] = parsed.data;

    // Каскад сложной логики при удалении вариантов источника (T-037, §6
    // дизайн-дока): правила на удалённые варианты уходят вместе с ними
    // (UI недостижимость L-I2, инвариант — защита).
    if (hasElementVariants(rules, parsed.data)) {
      const optionValues = new Set<string>(elementVariants(rules, parsed.data).map((variant) => variant.id));
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
    draft.stepTransitions = validStepTransitions(draft, rules);
  }
}
