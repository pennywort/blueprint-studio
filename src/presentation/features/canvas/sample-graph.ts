import { ServiceGraphSchema, type ServiceGraph } from '@domain/model/service-graph';
import {
  toApplicationFormId,
  toBlueprintId,
  toElementId,
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
// гарантированно оставался валидным при изменениях модели. Элементы — по
// схемам фреймворка (kind = x-element-type, атрибуты в props).

const listItem = (id: string, primaryText: string, secondaryText?: string) => ({
  id: toElementId(id),
  kind: 'list-item',
  props: secondaryText ? { primaryText, secondaryText } : { primaryText },
});

export function createSampleGraph(): ServiceGraph {
  return ServiceGraphSchema.parse({
    id: toBlueprintId('demo-blueprint'),
    title: 'Демо-карта',
    homePage: {
      id: toPageId('demo-home'),
      orderIndex: 0,
      elements: [
        listItem('demo-home-item-deposits', 'Вклады', 'Подбор и открытие вклада'),
        listItem('demo-home-item-documents', 'Документы', 'Справки и выписки'),
      ],
    },
    subScenarios: [
      {
        id: toScenarioId('demo-scenario-deposits'),
        title: 'Подбор вклада',
        orderIndex: 1,
        elements: [
          listItem('demo-scenario-deposits-item-apply', 'Оформить заявку', 'Переход к форме заявки'),
        ],
      },
      {
        id: toScenarioId('demo-scenario-documents'),
        title: 'Документы',
        orderIndex: 2,
        // Длинный список элементов; у одного из последних — исходящая связь.
        elements: [
          listItem('demo-scenario-documents-item-1', 'Справка о доходах'),
          listItem('demo-scenario-documents-item-2', 'Выписка по счёту'),
          listItem('demo-scenario-documents-item-3', 'Справка с места работы'),
          listItem('demo-scenario-documents-item-4', 'Налоговая декларация'),
          listItem('demo-scenario-documents-item-5', 'Выписка из ЕГРН'),
          listItem('demo-scenario-documents-item-6', 'Справка об отсутствии задолженности'),
          listItem('demo-scenario-documents-item-7', 'Копия паспорта'),
          listItem('demo-scenario-documents-item-8', 'Заявление на выдачу', 'Переход к форме заявки'),
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
                id: toElementId('demo-field-amount'),
                kind: 'text-field',
                props: { label: 'Сумма вклада', required: true, placeholder: 'Например, 100 000 ₽' },
              },
              {
                id: toElementId('demo-field-period'),
                kind: 'select',
                // Режим «Сложной логики» включён (T-037): у вариантов —
                // source-handle'ы; правила ниже показывают чекбокс при выборе
                // «6 месяцев» и выплату процентов при «12 месяцах» (L-I5/ADR-14).
                hasComplexLogic: true,
                props: {
                  label: 'Срок вклада',
                  required: true,
                  options: [
                    { id: '6m', label: '6 месяцев' },
                    { id: '12m', label: '12 месяцев' },
                  ],
                },
              },
              {
                id: toElementId('demo-field-agree'),
                kind: 'checkbox',
                props: { label: 'Согласен с условиями', required: true },
              },
              // Цепочка правил для раскладки шага колонками [owner 2026-10-13]:
              // «12 месяцев» → выплата процентов → «Ежемесячно» → уведомления.
              {
                id: toElementId('demo-field-payout'),
                kind: 'radio-group',
                hasComplexLogic: true,
                props: {
                  label: 'Выплата процентов',
                  required: true,
                  value: 'monthly',
                  items: [
                    { label: 'Ежемесячно', value: 'monthly', disabled: false, required: false, error: false },
                    { label: 'В конце срока', value: 'end', disabled: false, required: false, error: false },
                  ],
                },
              },
              {
                id: toElementId('demo-field-notify'),
                kind: 'checkbox',
                props: { label: 'Уведомлять о начислении' },
              },
            ],
          },
          {
            id: toFormStepId('demo-form-deposit-step-2'),
            elements: [
              {
                id: toElementId('demo-field-comment'),
                kind: 'text-field',
                props: { label: 'Комментарий к заявке', multiline: true },
              },
            ],
          },
          {
            id: toFormStepId('demo-form-deposit-step-3'),
            // Шаг без входящего перехода держит явный уровень (ADR-15, как
            // миграция v2→3): иначе он — второй корень уровня 0 и демо-граф
            // нарушает ёмкость уровня (layer-capacity).
            layerDepth: 2,
            elements: [
              {
                id: toElementId('demo-field-confirm'),
                kind: 'checkbox',
                props: { label: 'Подтверждаю введённые данные', required: true },
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
