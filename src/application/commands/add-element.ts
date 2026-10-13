import type { ServiceGraph } from '@domain/model/service-graph';
import type { MapElement } from '@domain/model/element';
import { validateGraph } from '@domain/invariants';
import { findElementContainer, type ElementContainerRef } from '@domain/element-containers';
import { computeStepElementDepths } from '@domain/step-element-depths';
import type { Command } from './command';
import { InvariantViolationError } from './errors';
import { findFormById } from './graph-lookup';

// Команда добавления элемента в контейнер канваса (Epic 002, T-035):
// Главная, подсценарий или шаг формы. Элементы равноправны [owner
// 2026-10-13] — любой вид в любой контейнер; ограничения, если появятся,
// — инвариантами домена. Готовый элемент приходит в конструктор (id — от
// IIdGenerator вызывающей стороны). Инварианты проверяются на черновике до
// фиксации (например, второй attachment на форму отклоняется инвариантом #1).
export class AddElement implements Command {
  readonly name = 'AddElement';

  constructor(
    private readonly target: ElementContainerRef,
    private readonly element: MapElement,
  ) {}

  apply(draft: ServiceGraph): void {
    const container = findElementContainer(draft, this.target);
    if (!container) {
      throw new Error('Контейнер для элемента не найден');
    }

    let element = this.element;
    // Шаг формы растёт по горизонтали (ADR-16): новый элемент без правил
    // встаёт в колонку правее самой глубокой, как новый блок на канвасе
    // страниц (addNode → следующий уровень). Явная колонка не переопределяется.
    if (this.target.kind === 'formStep' && element.layerDepth === undefined) {
      const ref = this.target;
      const step = findFormById(draft, ref.formId)?.steps.find((candidate) => candidate.id === ref.stepId);
      const depths = step ? [...computeStepElementDepths(step, draft.logicRules).values()] : [];
      element = { ...element, layerDepth: depths.length === 0 ? 0 : Math.max(...depths) + 1 };
    }
    container.elements.push(element);

    const violations = validateGraph(draft);
    if (violations.length > 0) {
      throw new InvariantViolationError(violations);
    }
  }
}
