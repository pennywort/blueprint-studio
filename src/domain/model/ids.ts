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

// Factory-функции: единственное место, где сырая строка становится branded id.
// Генерация значения — за портом IIdGenerator, здесь только приведение типа.
export const toBlueprintId = (raw: string): BlueprintId => BlueprintIdSchema.parse(raw);
export const toScenarioId = (raw: string): ScenarioId => ScenarioIdSchema.parse(raw);
export const toApplicationFormId = (raw: string): ApplicationFormId => ApplicationFormIdSchema.parse(raw);
export const toFormStepId = (raw: string): FormStepId => FormStepIdSchema.parse(raw);
export const toFormComponentId = (raw: string): FormComponentId => FormComponentIdSchema.parse(raw);
