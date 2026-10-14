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

// Epic 002 (T-037, сложная логика): правило условной видимости — самостоятельная
// сущность со стабильным id; условие v1 ссылается на option Select'а по его
// value (OptionId — branded, чтобы не путать с id сущностей).
export const LogicRuleIdSchema = z.string().min(1).brand<'LogicRuleId'>();
export type LogicRuleId = z.infer<typeof LogicRuleIdSchema>;

export const OptionIdSchema = z.string().min(1).brand<'OptionId'>();
export type OptionId = z.infer<typeof OptionIdSchema>;

// Переход между шагами формы [owner 2026-10-14]: самостоятельная сущность со
// стабильным id (ребро на канвасе — её проекция, как у правил логики).
export const StepTransitionIdSchema = z.string().min(1).brand<'StepTransitionId'>();
export type StepTransitionId = z.infer<typeof StepTransitionIdSchema>;

// Epic 002 (T-035): идентификатор сущности-страницы любого вида — Главная,
// Подсценарий или Форма заявки (страницы в слоях на общих основаниях, D12/D13).
export type PageEntityId = PageId | ScenarioId | ApplicationFormId;

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
export const toLogicRuleId = (raw: string): LogicRuleId => LogicRuleIdSchema.parse(raw);
export const toOptionId = (raw: string): OptionId => OptionIdSchema.parse(raw);
// Id страницы любого вида (ревью A6, R4): бренды — только типовая метка,
// проверка та же (непустая строка), вид страницы определяет граф.
export const toPageEntityId = (raw: string): PageEntityId => PageIdSchema.parse(raw);
export const toStepTransitionId = (raw: string): StepTransitionId => StepTransitionIdSchema.parse(raw);
