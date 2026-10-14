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

// Миграция сохранённых записей старого формата — в адаптере хранилища
// (infrastructure/persistence, ревью A11, R4): доменная схема описывает
// только текущую модель.
export const ServiceGraphSchema = ServiceGraphObjectSchema;
export type ServiceGraph = z.infer<typeof ServiceGraphObjectSchema>;
