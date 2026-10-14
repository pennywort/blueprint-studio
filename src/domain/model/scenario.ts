import { z } from 'zod';
import { ApplicationFormIdSchema, FormStepIdSchema, ScenarioIdSchema } from './ids';
import { CanvasElementSchema, IconRefSchema, type CanvasElement } from './canvas-element';

// Сценарии, контент страниц и формы заявок — спецификация 001-foundation, разделы 5.1–5.3.

// --- Контент страниц (спека 5.2) ---

// List item / Widget card — элементы канваса наравне с компонентами форм:
// определены в canvas-element.ts (универсальные элементы [owner 2026-10-13]).
export {
  IconRefSchema,
  ImageRefSchema,
  ListItemSchema,
  WidgetCardSchema,
  type IconRef,
  type ImageRef,
  type ListItem,
  type WidgetCard,
} from './canvas-element';

export const FaqQuestionSchema = z.object({
  question: z.string(),
  answer: z.string(),
});
export type FaqQuestion = z.infer<typeof FaqQuestionSchema>;

export const FaqSchema = z.object({
  questions: z.array(FaqQuestionSchema),
  tags: z.array(z.string()).optional(),
  // Автопоиск актуален при >10 вопросов (БТ 6.2).
  autoSearch: z.boolean().optional(),
});
export type Faq = z.infer<typeof FaqSchema>;

export const HotLinkSchema = z.object({
  label: z.string(),
  url: z.string(),
  kind: z.string().optional(),
});
export type HotLink = z.infer<typeof HotLinkSchema>;

export const AdditionalInfoSchema = z.object({
  text: z.string(),
  links: z.array(HotLinkSchema),
  icons: z.array(IconRefSchema).optional(),
  segments: z.array(z.string()).optional(),
});
export type AdditionalInfo = z.infer<typeof AdditionalInfoSchema>;

// Общий контент главной страницы и подсценария (спека 5.1).
// orderIndex — персистентный порядковый номер сущности-страницы (Epic 002,
// D13/T-004): 0, 1, 2, 3… по порядку добавления; порядок внутри колонки
// канваса пользователь меняет drag'ом, координаты не хранятся (D2).
const pageContentFields = {
  orderIndex: z.number().int().nonnegative(),
  // Явное переопределение колонки канваса (уровня навигации): выставляется
  // при добавлении узла (следующий уровень), переносе dnd между уровнями и
  // протягивании связи; без него глубина — производная связей (D7).
  layerDepth: z.number().int().nonnegative().optional(),
  // Элементы страницы — любые элементы канваса [owner 2026-10-13].
  elements: z.array(CanvasElementSchema),
  faq: FaqSchema.optional(),
  additionalInfo: AdditionalInfoSchema.optional(),
};

// --- Сценарии (спека 5.3) ---

export const ScenarioTypeSchema = z.enum(['application', 'link', 'navigation']);
export type ScenarioType = z.infer<typeof ScenarioTypeSchema>;

// Базовые поля сценария; `children` добавляется рекурсивно в SubScenario.
const ScenarioBaseSchema = z.object({
  id: ScenarioIdSchema,
  type: ScenarioTypeSchema,
  title: z.string().min(1),
  description: z.string().optional(),
  icon: IconRefSchema.optional(),
  // Только для type=navigation (инвариант scenario-type-fields).
  infoBlock: z.object({ content: z.string(), position: z.literal('right') }).optional(),
  // Только для type=link.
  link: z
    .object({ domain: z.string().optional(), url: z.string(), device: z.string().optional() })
    .optional(),
  // Только для type=application — ссылка на форму заявки.
  applicationFormId: ApplicationFormIdSchema.optional(),
});

export type Scenario = z.infer<typeof ScenarioBaseSchema> & {
  children?: Scenario[];
};

export const ScenarioSchema: z.ZodType<Scenario> = ScenarioBaseSchema.extend({
  children: z.lazy(() => z.array(ScenarioSchema)).optional(),
}) as z.ZodType<Scenario>;

// SubScenario — разводящая страница: сценарий + контент страницы (спека 5.1).
// Вложенность через children не ограничена (БТ, раздел 7).
export type SubScenario = z.infer<typeof ScenarioBaseSchema> & {
  orderIndex: number;
  // Явная колонка канваса (уровень навигации) — см. pageContentFields.
  layerDepth?: number;
  elements: CanvasElement[];
  faq?: Faq;
  additionalInfo?: AdditionalInfo;
  children?: SubScenario[];
};

export const SubScenarioSchema: z.ZodType<SubScenario> = ScenarioBaseSchema.extend({
  ...pageContentFields,
  children: z.lazy(() => z.array(SubScenarioSchema)).optional(),
}) as z.ZodType<SubScenario>;

// --- Формы заявок (спека 5.1) ---

export const FormStepSchema = z.object({
  id: FormStepIdSchema,
  title: z.string().optional(),
  // Элементы шага — любые элементы канваса [owner 2026-10-13], не только
  // компоненты форм.
  elements: z.array(CanvasElementSchema),
  // Явный уровень шага в форме (колонка) — как layerDepth страниц [owner
  // 2026-10-14]; без него уровень выводится из переходов (form-step-depths).
  layerDepth: z.number().int().nonnegative().optional(),
});
export type FormStep = z.infer<typeof FormStepSchema>;

export const ApplicationFormSchema = z.object({
  id: ApplicationFormIdSchema,
  title: z.string(),
  // Форма заявки — сущность-страница в слоях на общих основаниях (Epic 002,
  // D12): персистентный порядковый номер, как у Главной и Подсценариев (D13).
  orderIndex: z.number().int().nonnegative(),
  // Шаги упорядочены, количество не ограничено (БТ, раздел 6.5).
  steps: z.array(FormStepSchema),
  // Явное переопределение колонки канваса — как у подсценариев (D12).
  layerDepth: z.number().int().nonnegative().optional(),
});
export type ApplicationForm = z.infer<typeof ApplicationFormSchema>;
