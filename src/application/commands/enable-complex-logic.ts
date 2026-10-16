import type { ServiceGraph } from '@domain/model/service-graph';
import type { FormComponentId } from '@domain/model/ids';
import { validateGraph } from '@domain/invariants';
import { canBeLogicSource } from '@domain/element-kinds';
import { findElementInGraph } from '@domain/element-containers';
import { supportsLogic } from '@domain/container-capabilities';
import type { Command } from './command';
import { InvariantViolationError } from './errors';

// Включение режима «Сложная логика» на элементе-источнике (T-037/T-064, L4):
// само по себе не создаёт правил — только открывает возможность протягивать
// рёбра из option'ов. v1: источник — только Select (L5).
export class EnableComplexLogic implements Command {
  readonly name = 'EnableComplexLogic';

  constructor(private readonly componentId: FormComponentId) {}

  apply(draft: ServiceGraph): void {
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

    const violations = validateGraph(draft);
    if (violations.length > 0) {
      throw new InvariantViolationError(violations);
    }
  }
}
