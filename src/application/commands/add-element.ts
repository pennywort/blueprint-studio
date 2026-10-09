import type { ServiceGraph } from '@domain/model/service-graph';
import type { ListItem, WidgetCard } from '@domain/model/scenario';
import type { FormComponent } from '@domain/model/form-components';
import type { ApplicationFormId, FormStepId, ScenarioId } from '@domain/model/ids';
import { validateGraph } from '@domain/invariants';
import type { Command } from './command';
import { InvariantViolationError } from './errors';
import { findFormById, findSubScenarioById } from './graph-lookup';

// Контейнер элемента на канвасе (T-034): списки Главной, список подсценария
// или шаг формы заявки. Тип контейнера однозначно определяет допустимый вид
// элемента — WidgetCard живёт только на Главной (спека 5.1), компоненты
// формы — только на шаге формы; пары проверяются на этапе компиляции.
export type CanvasElementTarget =
  | { kind: 'homeListItems' }
  | { kind: 'homeWidgetCards' }
  | { kind: 'subScenarioListItems'; scenarioId: ScenarioId }
  | { kind: 'formStepComponents'; formId: ApplicationFormId; stepId: FormStepId };

export type ElementForTarget<Target extends CanvasElementTarget> = Target extends {
  kind: 'homeWidgetCards';
}
  ? WidgetCard
  : Target extends { kind: 'formStepComponents' }
    ? FormComponent
    : ListItem;

// Команда добавления элемента в узел канваса (Epic 002, T-035). Готовый
// элемент приходит в конструктор (id — от IIdGenerator вызывающей стороны).
// Инварианты проверяются на черновике до фиксации (например, второй
// attachment на форму отклоняется инвариантом #1).
export class AddElement<Target extends CanvasElementTarget> implements Command {
  readonly name = 'AddElement';

  constructor(
    private readonly target: Target,
    private readonly element: ElementForTarget<Target>,
  ) {}

  apply(draft: ServiceGraph): void {
    // Локальная переменная нужна для narrowing: по дискриминатору kind
    // TypeScript сужает объединение, но не обобщённый параметр Target.
    const target: CanvasElementTarget = this.target;
    switch (target.kind) {
      case 'homeListItems': {
        const homePage = requireHomePage(draft);
        homePage.listItems.push(this.element as ListItem);
        break;
      }
      case 'homeWidgetCards': {
        const homePage = requireHomePage(draft);
        homePage.widgetCards.push(this.element as WidgetCard);
        break;
      }
      case 'subScenarioListItems': {
        const scenario = findSubScenarioById(draft, target.scenarioId);
        if (!scenario) {
          throw new Error(`Подсценарий не найден: ${target.scenarioId}`);
        }
        scenario.listItems.push(this.element as ListItem);
        break;
      }
      case 'formStepComponents': {
        const form = findFormById(draft, target.formId);
        if (!form) {
          throw new Error(`Форма не найдена: ${target.formId}`);
        }
        const step = form.steps.find((candidate) => candidate.id === target.stepId);
        if (!step) {
          throw new Error(`Шаг не найден: ${target.stepId} (форма ${target.formId})`);
        }
        step.components.push(this.element as FormComponent);
        break;
      }
    }

    const violations = validateGraph(draft);
    if (violations.length > 0) {
      throw new InvariantViolationError(violations);
    }
  }
}

// Главная необязательна (D8): добавление элемента на отсутствующую Главную —
// понятная ошибка, а не молчаливая потеря данных.
function requireHomePage(draft: ServiceGraph): NonNullable<ServiceGraph['homePage']> {
  if (!draft.homePage) {
    throw new Error('Главная страница отсутствует в карте (D8)');
  }
  return draft.homePage;
}
