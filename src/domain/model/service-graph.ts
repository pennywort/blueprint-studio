import { z } from 'zod';
import { BlueprintIdSchema, PageIdSchema } from './ids';
import { ApplicationFormSchema, SubScenarioSchema, AdditionalInfoSchema, FaqSchema } from './scenario';
import { CanvasElementSchema } from './canvas-element';
import { PageLinkSchema } from './page-link';
import { LogicRuleSchema } from './logic-rule';
import { StepTransitionSchema } from './step-transition';

// Граф сервиса — корневая доменная модель содержимого карты (спека 5.1).
//
// Страницы (Epic 002, T-004/D13): Главная и Подсценарии — верхнеуровневые
// сущности карты, выше них только само приложение; каждая хранит свой
// персистентный порядковый номер (orderIndex). Главная НЕ обязательна (D8):
// карта может начинаться без неё (например, одностраничный МИП = единственный
// узел «Форма заявки»), удаление Главной разрешено.

export const HomePageSchema = z.object({
  id: PageIdSchema,
  orderIndex: z.number().int().nonnegative(),
  // Элементы Главной — любые элементы канваса [owner 2026-10-13]; бывшие
  // раздельные списки listItems/widgetCards слиты (порядок: List item, затем
  // Widget card — как их рисовал канвас).
  elements: z.array(CanvasElementSchema),
  faq: FaqSchema.optional(),
  additionalInfo: AdditionalInfoSchema.optional(),
});
export type HomePage = z.infer<typeof HomePageSchema>;

const ServiceGraphObjectSchema = z.object({
  id: BlueprintIdSchema,
  title: z.string(),
  homePage: HomePageSchema.optional(),
  subScenarios: z.array(SubScenarioSchema),
  applicationForms: z.array(ApplicationFormSchema),
  // Рёбра канваса: элемент страницы → страница-цель (подсценарий/форма, D12).
  links: z.array(PageLinkSchema),
  // Правила условной видимости «Сложной логики» (T-037, L7): отдельная
  // коллекция, ребро правила на канвасе — её проекция. Default [] — графы,
  // сериализованные до появления фичи, остаются валидными.
  logicRules: z.array(LogicRuleSchema).default([]),
  // Переходы между шагами форм [owner 2026-10-14]: элемент шага (или вариант
  // Select'а) → следующий/любой более поздний шаг той же формы. Default [] —
  // графы, сохранённые до фичи, остаются валидными.
  stepTransitions: z.array(StepTransitionSchema).default([]),
});

// --- Миграция модели «универсальные элементы» [owner 2026-10-13] ---
// Графы, сохранённые до миграции (IndexedDB, T-053), хранят элементы по
// видам: homePage.listItems/widgetCards, subScenario.listItems,
// step.components, а у List item/Widget card нет дискриминатора kind.
// Preprocess приводит такую запись к текущей форме до валидации; запись в
// новой форме проходит без изменений.

type LegacyRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is LegacyRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function withKind(items: unknown, kind: 'listItem' | 'widgetCard'): unknown[] {
  return Array.isArray(items)
    ? items.map((item) => (isRecord(item) && !('kind' in item) ? { ...item, kind } : item))
    : [];
}

function migrateLegacyPage(page: LegacyRecord): LegacyRecord {
  if ('elements' in page || !('listItems' in page || 'widgetCards' in page)) {
    return page;
  }
  const { listItems, widgetCards, ...rest } = page;
  return { ...rest, elements: [...withKind(listItems, 'listItem'), ...withKind(widgetCards, 'widgetCard')] };
}

function migrateLegacySubScenarios(subScenarios: unknown): unknown {
  if (!Array.isArray(subScenarios)) {
    return subScenarios;
  }
  return subScenarios.map((scenario) => {
    if (!isRecord(scenario)) {
      return scenario;
    }
    const migrated = migrateLegacyPage(scenario);
    return 'children' in migrated
      ? { ...migrated, children: migrateLegacySubScenarios(migrated.children) }
      : migrated;
  });
}

function migrateLegacyForms(forms: unknown): unknown {
  if (!Array.isArray(forms)) {
    return forms;
  }
  return forms.map((form) => {
    if (!isRecord(form) || !Array.isArray(form.steps)) {
      return form;
    }
    const steps = form.steps.map((step: unknown) => {
      if (!isRecord(step) || 'elements' in step || !('components' in step)) {
        return step;
      }
      const { components, ...rest } = step;
      return { ...rest, elements: components };
    });
    return { ...form, steps };
  });
}

export function migrateLegacyServiceGraph(raw: unknown): unknown {
  if (!isRecord(raw)) {
    return raw;
  }
  return {
    ...raw,
    ...(isRecord(raw.homePage) ? { homePage: migrateLegacyPage(raw.homePage) } : null),
    subScenarios: migrateLegacySubScenarios(raw.subScenarios),
    applicationForms: migrateLegacyForms(raw.applicationForms),
  };
}

export const ServiceGraphSchema = z.preprocess(migrateLegacyServiceGraph, ServiceGraphObjectSchema);
export type ServiceGraph = z.infer<typeof ServiceGraphObjectSchema>;
