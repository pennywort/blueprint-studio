import { z } from 'zod';
import { ElementIdSchema, FormStepIdSchema, OptionIdSchema, StepTransitionIdSchema } from './ids';

// Переход между шагами формы заявки [owner 2026-10-14]: «из элемента шага
// (или из варианта Select'а) пользователь попадает на шаг-цель».
//
// - Источник — любой элемент шага формы; optionId — вариант (value) Select'а:
//   переход срабатывает при выборе этого варианта.
// - Цель — шаг ТОЙ ЖЕ формы следующего уровня (form-step-depths): шаг-цель
//   встаёт на уровень «источник + 1», как подсценарий-цель связи; шагов
//   одного уровня может быть несколько (ветвление). Назад — нельзя.
// - У источника (элемент или его вариант) переход один — однозначность
//   ветвления; новая связь из того же источника заменяет прежнюю.
// - Связь — самостоятельная сущность (ребро на канвасе — проекция), как
//   PageLink и LogicRule; координат нет (D2).

export const StepTransitionSchema = z.object({
  id: StepTransitionIdSchema,
  sourceElementId: ElementIdSchema,
  /** Вариант Select'а-источника; без него переход — от элемента целиком. */
  optionId: OptionIdSchema.optional(),
  targetStepId: FormStepIdSchema,
});
export type StepTransition = z.infer<typeof StepTransitionSchema>;
