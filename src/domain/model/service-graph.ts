import { z } from 'zod';
import { BlueprintIdSchema, PageIdSchema } from './ids';
import {
  ApplicationFormSchema,
  SubScenarioSchema,
  WidgetCardSchema,
  AdditionalInfoSchema,
  FaqSchema,
  ListItemSchema,
} from './scenario';
import { PageLinkSchema } from './page-link';

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
  listItems: z.array(ListItemSchema),
  widgetCards: z.array(WidgetCardSchema),
  faq: FaqSchema.optional(),
  additionalInfo: AdditionalInfoSchema.optional(),
});
export type HomePage = z.infer<typeof HomePageSchema>;

export const ServiceGraphSchema = z.object({
  id: BlueprintIdSchema,
  title: z.string(),
  homePage: HomePageSchema.optional(),
  subScenarios: z.array(SubScenarioSchema),
  applicationForms: z.array(ApplicationFormSchema),
  // Рёбра канваса: элемент страницы → страница-цель (подсценарий/форма, D12).
  links: z.array(PageLinkSchema),
});
export type ServiceGraph = z.infer<typeof ServiceGraphSchema>;
