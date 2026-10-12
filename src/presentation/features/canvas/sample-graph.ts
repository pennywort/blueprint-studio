import { ServiceGraphSchema, type ServiceGraph } from '@domain/model/service-graph';
import {
  toApplicationFormId,
  toBlueprintId,
  toElementId,
  toFormComponentId,
  toFormStepId,
  toLogicRuleId,
  toOptionId,
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
        // Больше 6 элементов — узел демонстрирует автосжатие (T-033);
        // один из скрытых элементов имеет исходящую связь и остаётся видимым.
        listItems: [
          { id: toElementId('demo-scenario-documents-item-1'), title: 'Справка о доходах' },
          { id: toElementId('demo-scenario-documents-item-2'), title: 'Выписка по счёту' },
          { id: toElementId('demo-scenario-documents-item-3'), title: 'Справка с места работы' },
          { id: toElementId('demo-scenario-documents-item-4'), title: 'Налоговая декларация' },
          { id: toElementId('demo-scenario-documents-item-5'), title: 'Выписка из ЕГРН' },
          { id: toElementId('demo-scenario-documents-item-6'), title: 'Справка об отсутствии задолженности' },
          { id: toElementId('demo-scenario-documents-item-7'), title: 'Копия паспорта' },
          {
            id: toElementId('demo-scenario-documents-item-8'),
            title: 'Заявление на выдачу',
            secondaryText: 'Переход к форме заявки',
          },
        ],
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
                // Режим «Сложной логики» включён (T-037): у option'ов —
                // source-handle'ы; правило ниже показывает чекбокс второго
                // шага при выборе «12 месяцев» (оба элемента — одна форма, L-I5).
                hasComplexLogic: true,
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
      {
        // Исходящая связь из скрытого при сжатии элемента: карточка остаётся
        // видимой, иначе react-flow уронил бы ребро без source-handle (T-033).
        id: toPageLinkId('demo-link-documents-apply'),
        sourceElementId: toElementId('demo-scenario-documents-item-8'),
        targetId: toApplicationFormId('demo-form-deposit'),
      },
    ],
    logicRules: [
      {
        // «Срок вклада = 12 месяцев» → показать чекбокс согласия (T-037).
        // Ребро — пунктирное, между элементами одной формы.
        id: toLogicRuleId('demo-logic-period-agree'),
        sourceElementId: toElementId('demo-field-period'),
        condition: { kind: 'optionSelected', optionId: toOptionId('12m') },
        targetElementId: toElementId('demo-field-agree'),
      },
    ],
  });
}
