import type { ServiceGraph } from '@domain/model/service-graph';
import type { CanvasElement } from '@domain/model/canvas-element';
import type { ApplicationFormId, FormStepId, ScenarioId } from '@domain/model/ids';
import { computeStepElementDepths } from '@domain/step-element-depths';
import type { Command } from './command';
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

// Команда добавления элементов в узел канваса (Epic 002, T-035). Готовые
// элементы приходят в конструктор (id — от IIdGenerator вызывающей стороны);
// несколько — вставка группы из буфера одним шагом undo [owner 2026-10-27].
// Инварианты проверяются на черновике до фиксации (например, второй
// attachment на форму отклоняется инвариантом #1).
export class AddElement implements Command {
  readonly name = 'AddElement';
  private readonly elements: readonly CanvasElement[];

  constructor(
    private readonly target: CanvasElementTarget,
    ...elements: CanvasElement[]
  ) {
    this.elements = elements;
  }

  apply(draft: ServiceGraph): void {
    const target = this.target;
    const list = resolveElementTarget(draft, target);
    if (!list) {
      // Главная необязательна (D8): добавление на отсутствующую Главную —
      // понятная ошибка, а не молчаливая потеря данных.
      throw new Error(`Блок для элемента не найден: ${JSON.stringify(this.target)}`);
    }

    if (target.kind !== 'formStep') {
      list.push(...this.elements);
      return;
    }
    // Новые элементы шага без правил встают в одну колонку правее самой
    // глубокой — шаг растёт по горизонтали [owner 2026-10-13] (как AddFormComponent).
    const depths = [
      ...computeStepElementDepths({ id: target.stepId, elements: list }, draft.logicRules).values(),
    ];
    const layerDepth = depths.length === 0 ? 0 : Math.max(...depths) + 1;
    list.push(
      ...this.elements.map((element) =>
        element.layerDepth === undefined ? { ...element, layerDepth } : element,
      ),
    );
  }
}
