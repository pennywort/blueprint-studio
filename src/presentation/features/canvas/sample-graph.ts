import { ServiceGraphSchema, type ServiceGraph } from '@domain/model/service-graph';
import {
  toApplicationFormId,
  toBlueprintId,
  toElementId,
  toFormComponentId,
  toFormStepId,
  toPageId,
  toPageLinkId,
  toScenarioId,
} from '@domain/model/ids';

// Демо-граф редактора (Epic 002, S9): начальное значение временного
// хранилища состояния в presentation (TEMPORARY, до effector). Хранилища/
// репозитория карт ещё нет, а T-031/T-032 нужно что рендерить и проверять
// глазами: Главная + два подсценария + степперная форма с двумя шагами +
// связи через три колонки. Граф прогоняется через zod-схему, чтобы образец
// гарантированно оставался валидным при изменениях модели.
export function createSampleGraph(): ServiceGraph {
  return ServiceGraphSchema.parse({
    id: toBlueprintId('demo-blueprint'),
    title: 'Демо-карта',
    homePage: {
      id: toPageId('demo-home'),
      orderIndex: 0,
      listItems: [
        {
          id: toElementId('demo-home-item-deposits'),
          title: 'Вклады',
          secondaryText: 'Подбор и открытие вклада',
        },
        {
          id: toElementId('demo-home-item-documents'),
          title: 'Документы',
          secondaryText: 'Справки и выписки',
        },
      ],
      widgetCards: [],
    },
    subScenarios: [
      {
        id: toScenarioId('demo-scenario-deposits'),
        type: 'navigation',
        title: 'Подбор вклада',
        orderIndex: 1,
        listItems: [
          {
            id: toElementId('demo-scenario-deposits-item-apply'),
            title: 'Оформить заявку',
            secondaryText: 'Переход к форме заявки',
          },
        ],
      },
      {
        id: toScenarioId('demo-scenario-documents'),
        type: 'navigation',
        title: 'Документы',
        orderIndex: 2,
        listItems: [],
      },
    ],
    applicationForms: [
      {
        id: toApplicationFormId('demo-form-deposit'),
        title: 'Заявка на вклад',
        orderIndex: 3,
        steps: [
          {
            id: toFormStepId('demo-form-deposit-step-1'),
            title: 'Первый шаг',
            components: [
              {
                id: toFormComponentId('demo-field-amount'),
                kind: 'textField',
                label: 'Сумма вклада',
                required: true,
                multiline: false,
                placeholder: 'Например, 100 000 ₽',
              },
              {
                id: toFormComponentId('demo-field-period'),
                kind: 'selectList',
                label: 'Срок вклада',
                required: true,
                displayType: 'dropdown',
                multiSelect: false,
                options: [
                  { label: '6 месяцев', value: '6m' },
                  { label: '12 месяцев', value: '12m' },
                ],
              },
            ],
          },
          {
            id: toFormStepId('demo-form-deposit-step-2'),
            title: 'Второй шаг',
            components: [
              {
                id: toFormComponentId('demo-field-agree'),
                kind: 'checkbox',
                label: 'Согласен с условиями',
                required: true,
              },
            ],
          },
        ],
      },
    ],
    links: [
      {
        id: toPageLinkId('demo-link-deposits'),
        sourceElementId: toElementId('demo-home-item-deposits'),
        targetId: toScenarioId('demo-scenario-deposits'),
      },
      {
        id: toPageLinkId('demo-link-documents'),
        sourceElementId: toElementId('demo-home-item-documents'),
        targetId: toScenarioId('demo-scenario-documents'),
      },
      {
        id: toPageLinkId('demo-link-apply'),
        sourceElementId: toElementId('demo-scenario-deposits-item-apply'),
        targetId: toApplicationFormId('demo-form-deposit'),
      },
    ],
  });
}
