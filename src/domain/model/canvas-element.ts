import { z } from 'zod';
import { ElementIdSchema, FormStepIdSchema, ScenarioIdSchema } from './ids';

// Универсальный элемент канваса [owner 2026-10-13: «элемент может быть в
// любом блоке»]: любой блок — Главная, подсценарий, шаг формы — хранит единый
// упорядоченный список `elements` этого типа.
//
// Этап 3 docs/schemas/PLAN.md [owner 2026-10-19]: состав и атрибуты
// элемента описывает JSON-схема фреймворка (компоненты и комментарий —
// схемы проекта), а не zod-схема по каждому виду. `kind` — имя элемента во
// фреймворке (x-element-type: `text-field`, `select`…), `props` — значения
// атрибутов по его схеме; генератор UI берёт их как есть (§4b AGENTS.md).
// Какие элементы и атрибуты доступны в редакторе — политика редактора
// (порт IElementSchemaProvider), что умеет вид — реестр element-kinds.

/** Имя элемента во фреймворке или в схемах проекта (x-element-type). */
export const CanvasElementKindSchema = z.string().min(1);
export type CanvasElementKind = z.infer<typeof CanvasElementKindSchema>;

/** Значения атрибутов элемента по его JSON-схеме. */
export const ElementPropsSchema = z.record(z.string(), z.unknown());
export type ElementProps = z.infer<typeof ElementPropsSchema>;

// Маршрутизация задаётся в технических характеристиках (БТ, раздел 4.1),
// поэтому хранится как метаданные элемента, а не в его props.
export const RoutingRuleSchema = z.object({
  // Элемент участвует в маршрутизации: его значение определяет переход.
  targetStepId: FormStepIdSchema.optional(),
  targetScenarioId: ScenarioIdSchema.optional(),
});
export type RoutingRule = z.infer<typeof RoutingRuleSchema>;

export const CanvasElementSchema = z.object({
  // Стабильный id: элемент — источник связи на канвасе (Epic 002, T-004/D9).
  id: ElementIdSchema,
  kind: CanvasElementKindSchema,
  props: ElementPropsSchema,
  // Надстройки проекта над схемой [owner 2026-10-22]: значения атрибутов из
  // extensions схем проекта (для всех элементов или для одного kind). Отдельно
  // от props: props остаются валидными по схеме фреймворка, генератор отличает
  // данные фреймворка от своих (§4b AGENTS.md).
  ext: ElementPropsSchema.optional(),
  // Ниже — метаданные редактора, не атрибуты элемента фреймворка (D4).
  // Комментарий-часть элемента для разработчика (US-05).
  comment: z.string().optional(),
  // Явная колонка элемента внутри шага формы [owner 2026-10-13]: перенос dnd
  // в другую колонку и закрепление элемента, потерявшего правило (ADR-15);
  // без него колонка — производная правил «Сложной логики» (step-element-depths).
  layerDepth: z.number().int().nonnegative().optional(),
  routing: RoutingRuleSchema.optional(),
  // Элемент с динамическим контентом (инварианты #3–5).
  hasDynamicContent: z.boolean().optional(),
  // Режим «Сложная логика» (T-037, L4/L5) — атрибут схемы вида в ext
  // (element-kinds: COMPLEX_LOGIC_KEY), а не метаданные [owner 2026-10-27].
});
export type CanvasElement = z.infer<typeof CanvasElementSchema>;
export type CanvasElementId = CanvasElement['id'];

// Адресат комментария-части элемента (бейдж под карточкой): комментарий для
// разработчика — поэтому в левом меню он с иконкой кода.
export const DEFAULT_COMMENT_AUDIENCE = 'Разработчику';

// Семейство вида и его возможности (isPageElementKind, isCommentKind,
// варианты источника логики, …) — реестр видов domain/element-kinds.ts (R-CFG-1).
