import type { ServiceGraph } from '@domain/model/service-graph';
import type { ElementId } from '@domain/model/ids';
import { canBeLogicSource } from '@domain/element-kinds';
import { computeFormElementDepths } from '@domain/step-element-depths';
import type { Command } from './command';
import { preserveFormElementDepths } from './depth-preservation';
import { findElementInGraph } from '@domain/element-containers';

// Выключение режима «Сложная логика» (T-037/T-064, L4): при наличии правил —
// каскадное удаление всех рёбер этого источника (UI заранее спрашивает
// подтверждение, команда выполняет каскад атомарно вместе со снятием флага,
// поэтому undo возвращает и флаг, и правила).
export class DisableComplexLogic implements Command {
  readonly name = 'DisableComplexLogic';

  constructor(private readonly componentId: ElementId) {}

  apply(draft: ServiceGraph): void {
    // Колонки элементов шагов до мутации: цель, потерявшая правило, остаётся на месте (ADR-15).
    const elementDepthsBefore = computeFormElementDepths(draft);
    // Выключить можно в любом блоке (R-CFG-2): снятие флага только убирает правила.
    const found = findElementInGraph(draft, this.componentId);
    if (!found) {
      throw new Error(`Элемент не найден: ${this.componentId}`);
    }
    if (!canBeLogicSource(found.element)) {
      throw new Error(
        `Сложная логика v1 поддерживает только Select (элемент ${this.componentId}: ${found.element.kind})`,
      );
    }
    found.element.hasComplexLogic = false;
    draft.logicRules = draft.logicRules.filter(
      (rule) => (rule.sourceElementId as string) !== this.componentId,
    );

    preserveFormElementDepths(draft, elementDepthsBefore);
  }
}
