import { z } from 'zod';
import { ElementIdSchema, LogicRuleIdSchema, OptionIdSchema } from './ids';

// «Сложная логика» — условная видимость элементов (Epic 002, T-037;
// дизайн-док docs/дизайн-сложная-логика.md).
//
// Смысл правила: «когда в элементе-источнике выбран option → целевой
// элемент становится видимым». Цель с правилами скрыта по умолчанию,
// между правилами — неявное ИЛИ (L2/L3). Аудитория — бизнес-пользователи:
// никакого редактора выражений и AND/OR (L8), условие — закрытый
// discriminated union: новые источники (Checkbox, Radio…) добавляются
// новым членом union без смены UI-парадигмы и механики рёбер (L5).
//
// Правила хранятся отдельной коллекцией logicRules в ServiceGraph (L7),
// ребро на канвасе — проекция правила; удаление ребра = удаление правила.

export const LogicConditionSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('optionSelected'),
    // Значение (value) option'а Select'а-источника (v1, L1/L5).
    optionId: OptionIdSchema,
  }),
  // Расширение без изменения обвязки (§4 дизайн-дока):
  // | { kind: 'checkboxChecked' } | { kind: 'radioOptionSelected', optionId } | …
]);
export type LogicCondition = z.infer<typeof LogicConditionSchema>;

export const LogicRuleSchema = z.object({
  id: LogicRuleIdSchema,
  // Элемент-источник (Select с включённой «Сложной логикой», L-I1).
  sourceElementId: ElementIdSchema,
  condition: LogicConditionSchema,
  // Элемент-цель — любой элемент той же формы (L5/L-I5), скрыт по умолчанию.
  targetElementId: ElementIdSchema,
});
export type LogicRule = z.infer<typeof LogicRuleSchema>;
