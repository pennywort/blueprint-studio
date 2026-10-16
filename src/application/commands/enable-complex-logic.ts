import type { ServiceGraph } from '@domain/model/service-graph';
import type { FormComponentId } from '@domain/model/ids';
import { validateGraph } from '@domain/invariants';
import { canBeLogicSource } from '@domain/element-kinds';
import { findElementInGraph } from '@domain/element-containers';
import { supportsLogic } from '@domain/container-capabilities';
import { computeAllFormStepDepths } from '@domain/form-step-depths';
import { validStepTransitions } from '@domain/step-transitions';
import type { Command } from './command';
import { preserveFormStepDepths } from './depth-preservation';
import { InvariantViolationError } from './errors';

// Включение режима «Сложная логика» на элементе-источнике (T-037/T-064, L4):
// само по себе не создаёт правил — только открывает возможность протягивать
// рёбра из option'ов. v1: источник — только Select (L5).
export class EnableComplexLogic implements Command {
  readonly name = 'EnableComplexLogic';

  constructor(private readonly componentId: FormComponentId) {}

  apply(draft: ServiceGraph): void {
    // Уровни шагов до мутации: шаг, потерявший переход варианта, остаётся на месте.
    const stepDepthsBefore = computeAllFormStepDepths(draft);
    const found = findElementInGraph(draft, this.componentId);
    if (!found) {
      throw new Error(`Элемент не найден: ${this.componentId}`);
    }
    // Где логика возможна — таблица возможностей блоков (R-CFG-2).
    if (!supportsLogic(found.container)) {
      throw new Error(`Сложная логика недоступна в блоке элемента ${this.componentId}`);
    }
    if (!canBeLogicSource(found.element)) {
      throw new Error(
        `Сложная логика v1 поддерживает только Select (элемент ${this.componentId}: ${found.element.kind})`,
      );
    }
    found.element.hasComplexLogic = true;

    // Каскад [owner 2026-10-16]: вариант с логикой не ведёт на шаг
    // (connection-reach) — его переходы уходят атомарно с флагом, undo вернёт.
    preserveFormStepDepths(draft, stepDepthsBefore);
    draft.stepTransitions = validStepTransitions(draft);

    const violations = validateGraph(draft);
    if (violations.length > 0) {
      throw new InvariantViolationError(violations);
    }
  }
}
