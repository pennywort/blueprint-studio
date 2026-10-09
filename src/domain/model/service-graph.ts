import { z } from 'zod';
import { BlueprintIdSchema } from './ids';
import { ApplicationFormSchema, SubScenarioSchema, WidgetCardSchema, AdditionalInfoSchema, FaqSchema, ListItemSchema } from './scenario';

// Граф сервиса — корневая доменная модель содержимого карты (спека 5.1).

export const HomePageSchema = z.object({
  listItems: z.array(ListItemSchema),
  widgetCards: z.array(WidgetCardSchema),
  faq: FaqSchema.optional(),
  additionalInfo: AdditionalInfoSchema.optional(),
});
export type HomePage = z.infer<typeof HomePageSchema>;

export const ServiceGraphSchema = z.object({
  id: BlueprintIdSchema,
  title: z.string(),
  // Главная страница ровно одна (БТ 6.1).
  homePage: HomePageSchema,
  subScenarios: z.array(SubScenarioSchema),
  applicationForms: z.array(ApplicationFormSchema),
});
export type ServiceGraph = z.infer<typeof ServiceGraphSchema>;
