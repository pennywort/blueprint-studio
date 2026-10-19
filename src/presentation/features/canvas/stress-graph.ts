import { ServiceGraphSchema, type ServiceGraph } from '@domain/model/service-graph';
import type { CanvasElement } from '@domain/model/canvas-element';
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

// Нагрузочный граф для стенда производительности (проект «Стенд производительности»):
// много страниц, элементов, связей, форм и правил «Сложной логики» —
// проверка лагов канваса на объёме. Размеры — параметрами (URL стенда).
// Связи только между смежными уровнями (N4), у каждой страницы явный
// уровень (layerDepth) — граф проходит инварианты (layer-capacity, L-I*).

export type StressGraphOptions = {
  /** Уровней навигации подсценариев. */
  levels: number;
  /** Подсценариев на уровне. */
  pagesPerLevel: number;
  /** Элементов (List item) на странице. */
  elementsPerPage: number;
  /** Форм заявки (последний уровень). */
  forms: number;
  /** Шагов в форме. */
  stepsPerForm: number;
  /** Полей в шаге (первые два — Select'ы со «Сложной логикой»). */
  fieldsPerStep: number;
};

export const DEFAULT_STRESS_OPTIONS: StressGraphOptions = {
  levels: 4,
  pagesPerLevel: 25,
  elementsPerPage: 6,
  forms: 20,
  stepsPerForm: 3,
  fieldsPerStep: 8,
};

const OPTION_VALUES = ['a', 'b', 'c'];

function stepFields(prefix: string, count: number): { elements: unknown[]; rules: unknown[] } {
  const elements: unknown[] = [];
  const rules: unknown[] = [];
  for (let index = 0; index < count; index += 1) {
    const id = toFormComponentId(`${prefix}-f${index}`);
    if (index < 2) {
      elements.push({
        id,
        kind: 'selectList',
        label: `Список ${index + 1}`,
        required: false,
        displayType: 'dropdown',
        multiSelect: false,
        hasComplexLogic: true,
        options: OPTION_VALUES.map((value) => ({ label: `Вариант ${value}`, value })),
      });
    } else {
      elements.push(
        index % 2 === 0
          ? { id, kind: 'textField', label: `Поле ${index + 1}`, required: false, multiline: false }
          : { id, kind: 'checkbox', label: `Флажок ${index + 1}`, required: false },
      );
    }
  }
  // Select 0: варианты → поля 1..3; Select 1 (сам цель) → поля 4..5.
  // Каждая цель — с одним правилом (L-I7), циклов нет (L-I6).
  const plan: Array<[number, string, number]> = [
    [0, 'a', 1],
    [0, 'b', 2],
    [0, 'c', 3],
    [1, 'a', 4],
    [1, 'b', 5],
  ];
  for (const [source, option, target] of plan) {
    if (target < count) {
      rules.push({
        id: toLogicRuleId(`${prefix}-r${source}-${option}`),
        sourceElementId: toElementId(`${prefix}-f${source}`),
        condition: { kind: 'optionSelected', optionId: toOptionId(option) },
        targetElementId: toElementId(`${prefix}-f${target}`),
      });
    }
  }
  return { elements, rules };
}

export function createStressGraph(options: StressGraphOptions = DEFAULT_STRESS_OPTIONS): ServiceGraph {
  const { levels, pagesPerLevel, elementsPerPage, forms, stepsPerForm, fieldsPerStep } = options;
  let orderIndex = 0;
  const pageElementId = (level: number, page: number, element: number) =>
    toElementId(`p${level}-${page}-e${element}`);
  const items = (level: number, page: number, count: number): CanvasElement[] =>
    Array.from({ length: count }, (_, element) => ({
      id: pageElementId(level, page, element),
      kind: element % 3 === 2 ? 'widgetCard' : 'listItem',
      title: `Элемент ${element + 1} · стр. ${level}.${page + 1}`,
      secondaryText: 'Описание элемента',
    }));

  const homePage = {
    id: toPageId('stress-home'),
    orderIndex: orderIndex++,
    elements: items(0, 0, pagesPerLevel),
  };

  const subScenarios: unknown[] = [];
  const links: unknown[] = [];
  for (let level = 1; level <= levels; level += 1) {
    for (let page = 0; page < pagesPerLevel; page += 1) {
      subScenarios.push({
        id: toScenarioId(`s${level}-${page}`),
        title: `Подсценарий ${level}.${page + 1}`,
        orderIndex: orderIndex++,
        layerDepth: level,
        elements: items(level, page, elementsPerPage),
      });
      // Вход страницы: с Главной (уровень 1) или от элемента 0 страницы выше.
      links.push({
        id: toPageLinkId(`l${level}-${page}`),
        sourceElementId: level === 1 ? pageElementId(0, 0, page) : pageElementId(level - 1, page, 0),
        targetId: toScenarioId(`s${level}-${page}`),
      });
      // Перекрёстная связь соседа — рёбра пересекаются, как в реальных картах.
      if (level > 1 && elementsPerPage > 1) {
        links.push({
          id: toPageLinkId(`x${level}-${page}`),
          sourceElementId: pageElementId(level - 1, (page + 1) % pagesPerLevel, 1),
          targetId: toScenarioId(`s${level}-${page}`),
        });
      }
    }
  }

  const applicationForms: unknown[] = [];
  const logicRules: unknown[] = [];
  for (let form = 0; form < forms; form += 1) {
    const formId = toApplicationFormId(`form-${form}`);
    const steps = Array.from({ length: stepsPerForm }, (_, step) => {
      const prefix = `form-${form}-s${step}`;
      const { elements, rules } = stepFields(prefix, fieldsPerStep);
      logicRules.push(...rules);
      // Шаги стенда — подряд по уровням, подпись — formStepLabel [owner 2026-10-14].
      return { id: toFormStepId(prefix), layerDepth: step, elements };
    });
    applicationForms.push({
      id: formId,
      title: `Заявка ${form + 1}`,
      orderIndex: orderIndex++,
      layerDepth: levels + 1,
      steps,
    });
    if (levels > 0 && elementsPerPage > 2) {
      links.push({
        id: toPageLinkId(`lf-${form}`),
        sourceElementId: pageElementId(levels, form % pagesPerLevel, 2),
        targetId: formId,
      });
    }
  }

  return ServiceGraphSchema.parse({
    id: toBlueprintId('stress-blueprint'),
    title: 'Нагрузочная карта',
    homePage,
    subScenarios,
    applicationForms,
    links,
    logicRules,
  });
}

// Параметры из query-строки стенда: ?levels=4&pagesPerLevel=25&…
export function stressOptionsFromQuery(search: string): StressGraphOptions {
  const params = new URLSearchParams(search);
  const read = (key: keyof StressGraphOptions): number => {
    const value = Number(params.get(key));
    return Number.isInteger(value) && value >= 0 && params.has(key) ? value : DEFAULT_STRESS_OPTIONS[key];
  };
  return {
    levels: read('levels'),
    pagesPerLevel: read('pagesPerLevel'),
    elementsPerPage: read('elementsPerPage'),
    forms: read('forms'),
    stepsPerForm: read('stepsPerForm'),
    fieldsPerStep: read('fieldsPerStep'),
  };
}
