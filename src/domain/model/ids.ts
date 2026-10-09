import { z } from 'zod';

// Branded-типы идентификаторов: не дают перепутать id разных сущностей на этапе компиляции.

export const BlueprintIdSchema = z.string().min(1).brand<'BlueprintId'>();
export type BlueprintId = z.infer<typeof BlueprintIdSchema>;

export const ScenarioIdSchema = z.string().min(1).brand<'ScenarioId'>();
export type ScenarioId = z.infer<typeof ScenarioIdSchema>;

export const ApplicationFormIdSchema = z.string().min(1).brand<'ApplicationFormId'>();
export type ApplicationFormId = z.infer<typeof ApplicationFormIdSchema>;

export const FormStepIdSchema = z.string().min(1).brand<'FormStepId'>();
export type FormStepId = z.infer<typeof FormStepIdSchema>;

export const FormComponentIdSchema = z.string().min(1).brand<'FormComponentId'>();
export type FormComponentId = z.infer<typeof FormComponentIdSchema>;

// Epic 002 (T-004, D13): страницы МИПа (Главная/Подсценарий) — верхнеуровневые
// сущности карты; элементы страниц — источники связей; связи — самостоятельные
// сущности со стабильным id (переназначение концов без пересоздания, D7/D13).
export const PageIdSchema = z.string().min(1).brand<'PageId'>();
export type PageId = z.infer<typeof PageIdSchema>;

export const ElementIdSchema = z.string().min(1).brand<'ElementId'>();
export type ElementId = z.infer<typeof ElementIdSchema>;

export const PageLinkIdSchema = z.string().min(1).brand<'PageLinkId'>();
export type PageLinkId = z.infer<typeof PageLinkIdSchema>;

// Factory-функции: единственное место, где сырая строка становится branded id.
// Генерация значения — за портом IIdGenerator, здесь только приведение типа.
export const toBlueprintId = (raw: string): BlueprintId => BlueprintIdSchema.parse(raw);
export const toScenarioId = (raw: string): ScenarioId => ScenarioIdSchema.parse(raw);
export const toApplicationFormId = (raw: string): ApplicationFormId => ApplicationFormIdSchema.parse(raw);
export const toFormStepId = (raw: string): FormStepId => FormStepIdSchema.parse(raw);
export const toFormComponentId = (raw: string): FormComponentId => FormComponentIdSchema.parse(raw);
export const toPageId = (raw: string): PageId => PageIdSchema.parse(raw);
export const toElementId = (raw: string): ElementId => ElementIdSchema.parse(raw);
export const toPageLinkId = (raw: string): PageLinkId => PageLinkIdSchema.parse(raw);
