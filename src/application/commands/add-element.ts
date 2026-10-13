import type { ServiceGraph } from '@domain/model/service-graph';
import type { CanvasElement } from '@domain/model/canvas-element';
import type { ApplicationFormId, FormStepId, ScenarioId } from '@domain/model/ids';
import { validateGraph } from '@domain/invariants';
import { computeStepElementDepths } from '@domain/step-element-depths';
import type { Command } from './command';
import { InvariantViolationError } from './errors';
import { findFormById, findSubScenarioById } from './graph-lookup';

// Блок-контейнер элемента на канвасе (T-034): Главная, подсценарий или шаг
// формы заявки. Любой элемент — в любом блоке [owner 2026-10-13]: вид блока
// не ограничивает вид элемента (ранее Widget card — только Главная, компоненты
// формы — только шаги).
export type CanvasElementTarget =
  | { kind: 'home' }
  | { kind: 'subScenario'; scenarioId: ScenarioId }
  | { kind: 'formStep'; formId: ApplicationFormId; stepId: FormStepId };

// Список элементов блока; null — блока нет (команда отклонится).
export function resolveElementTarget(
  draft: ServiceGraph,
  target: CanvasElementTarget,
): CanvasElement[] | null {
  switch (target.kind) {
    case 'home':
      return draft.homePage?.elements ?? null;
    case 'subScenario':
      return findSubScenarioById(draft, target.scenarioId)?.elements ?? null;
    case 'formStep':
      return (
        findFormById(draft, target.formId)?.steps.find((step) => step.id === target.stepId)?.elements ?? null
      );
  }
}

// Команда добавления элемента в узел канваса (Epic 002, T-035). Готовый
// элемент приходит в конструктор (id — от IIdGenerator вызывающей стороны).
// Инварианты проверяются на черновике до фиксации (например, второй
// attachment на форму отклоняется инвариантом #1).
export class AddElement implements Command {
  readonly name = 'AddElement';

  constructor(
    private readonly target: CanvasElementTarget,
    private readonly element: CanvasElement,
  ) {}

  apply(draft: ServiceGraph): void {
    const target = this.target;
    const list = resolveElementTarget(draft, target);
    if (!list) {
      // Главная необязательна (D8): добавление на отсутствующую Главную —
      // понятная ошибка, а не молчаливая потеря данных.
      throw new Error(`Блок для элемента не найден: ${JSON.stringify(this.target)}`);
    }

    if (target.kind === 'formStep' && this.element.layerDepth === undefined) {
      // Новый элемент шага без правил встаёт в колонку правее самой глубокой —
      // шаг растёт по горизонтали [owner 2026-10-13] (как AddFormComponent).
      const depths = [
        ...computeStepElementDepths({ id: target.stepId, elements: list }, draft.logicRules).values(),
      ];
      list.push({ ...this.element, layerDepth: depths.length === 0 ? 0 : Math.max(...depths) + 1 });
    } else {
      list.push(this.element);
    }

    const violations = validateGraph(draft);
    if (violations.length > 0) {
      throw new InvariantViolationError(violations);
    }
  }
}
