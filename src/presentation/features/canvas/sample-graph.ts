import { ServiceGraphSchema, type ServiceGraph } from '@domain/model/service-graph';
import {
  toApplicationFormId,
  toBlueprintId,
  toElementId,
  toFormComponentId,
  toFormStepId,
  toStepTransitionId,
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
      elements: [
        {
          id: toElementId('demo-home-item-deposits'),
          kind: 'listItem',
          title: 'Вклады',
          secondaryText: 'Подбор и открытие вклада',
        },
        {
          id: toElementId('demo-home-item-documents'),
          kind: 'listItem',
          title: 'Документы',
          secondaryText: 'Справки и выписки',
        },
      ],
    },
    subScenarios: [
      {
        id: toScenarioId('demo-scenario-deposits'),
        type: 'navigation',
        title: 'Подбор вклада',
        orderIndex: 1,
        elements: [
          {
            id: toElementId('demo-scenario-deposits-item-apply'),
            kind: 'listItem',
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
        // Длинный список элементов; у одного из последних — исходящая связь.
        elements: [
          { id: toElementId('demo-scenario-documents-item-1'), kind: 'listItem', title: 'Справка о доходах' },
          { id: toElementId('demo-scenario-documents-item-2'), kind: 'listItem', title: 'Выписка по счёту' },
          {
            id: toElementId('demo-scenario-documents-item-3'),
            kind: 'listItem',
            title: 'Справка с места работы',
          },
          {
            id: toElementId('demo-scenario-documents-item-4'),
            kind: 'listItem',
            title: 'Налоговая декларация',
          },
          { id: toElementId('demo-scenario-documents-item-5'), kind: 'listItem', title: 'Выписка из ЕГРН' },
          {
            id: toElementId('demo-scenario-documents-item-6'),
            kind: 'listItem',
            title: 'Справка об отсутствии задолженности',
          },
          { id: toElementId('demo-scenario-documents-item-7'), kind: 'listItem', title: 'Копия паспорта' },
          {
            id: toElementId('demo-scenario-documents-item-8'),
            kind: 'listItem',
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
            elements: [
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
                search: false,
                // Режим «Сложной логики» включён (T-037): у option'ов —
                // source-handle'ы; правила ниже показывают чекбокс при выборе
                // «6 месяцев» и выплату процентов при «12 месяцах» (L-I5/ADR-14).
                hasComplexLogic: true,
                options: [
                  { label: '6 месяцев', value: '6m' },
                  { label: '12 месяцев', value: '12m' },
                ],
              },
              {
                id: toFormComponentId('demo-field-agree'),
                kind: 'checkbox',
                label: 'Согласен с условиями',
                required: true,
              },
              // Цепочка правил для раскладки шага колонками [owner 2026-10-13]:
              // «12 месяцев» → выплата процентов → «Ежемесячно» → уведомления.
              {
                id: toFormComponentId('demo-field-payout'),
                kind: 'selectList',
                label: 'Выплата процентов',
                required: true,
                displayType: 'dropdown',
                multiSelect: false,
                hasComplexLogic: true,
                options: [
                  { label: 'Ежемесячно', value: 'monthly', isDefault: true },
                  { label: 'В конце срока', value: 'end' },
                ],
              },
              {
                id: toFormComponentId('demo-field-notify'),
                kind: 'checkbox',
                label: 'Уведомлять о начислении',
                required: false,
              },
            ],
          },
          {
            id: toFormStepId('demo-form-deposit-step-2'),
            elements: [
              {
                id: toFormComponentId('demo-field-comment'),
                kind: 'textField',
                label: 'Комментарий к заявке',
                required: false,
                multiline: true,
              },
            ],
          },
          {
            id: toFormStepId('demo-form-deposit-step-3'),
            elements: [
              {
                id: toFormComponentId('demo-field-confirm'),
                kind: 'checkbox',
                label: 'Подтверждаю введённые данные',
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
        // Связь из элемента в конце длинного списка «Документы».
        id: toPageLinkId('demo-link-documents-apply'),
        sourceElementId: toElementId('demo-scenario-documents-item-8'),
        targetId: toApplicationFormId('demo-form-deposit'),
      },
    ],
    logicRules: [
      {
        // «Срок вклада = 6 месяцев» → показать чекбокс согласия (T-037).
        // Ребро между элементами одного шага формы (стиль — общий, N1).
        id: toLogicRuleId('demo-logic-period-agree'),
        sourceElementId: toElementId('demo-field-period'),
        condition: { kind: 'optionSelected', optionId: toOptionId('6m') },
        targetElementId: toElementId('demo-field-agree'),
      },
      {
        id: toLogicRuleId('demo-logic-period-payout'),
        sourceElementId: toElementId('demo-field-period'),
        condition: { kind: 'optionSelected', optionId: toOptionId('12m') },
        targetElementId: toElementId('demo-field-payout'),
      },
      {
        id: toLogicRuleId('demo-logic-payout-notify'),
        sourceElementId: toElementId('demo-field-payout'),
        condition: { kind: 'optionSelected', optionId: toOptionId('monthly') },
        targetElementId: toElementId('demo-field-notify'),
      },
    ],
    // Переходы между шагами [owner 2026-10-14]: «Сумма» → следующий шаг.
    // Варианты Select'ов здесь с «Сложной логикой» — на шаги не ведут
    // (connection-matrix, [owner 2026-10-16]).
    stepTransitions: [
      {
        id: toStepTransitionId('demo-transition-amount'),
        sourceElementId: toElementId('demo-field-amount'),
        targetStepId: toFormStepId('demo-form-deposit-step-2'),
      },
    ],
  });
}
