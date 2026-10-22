import type { CanvasElementKind } from './model/canvas-element';
import type { EditorRules } from './editor-rules';

// Политика доменных правил (R-CFG-5, [owner 2026-10-16]) — данные, а не
// ветвления: изменить или снять ограничение = поправить значение. Таблицы
// ниже — умолчания; действующие значения приходят в EditorRules из
// настроек редактора (R-ADM), проверки не меняются.

/**
 * Строгость правила:
 * - `error` — команда, нарушающая правило, отклоняется (как раньше);
 * - `warning` — действие разрешено, нарушение подсвечивается на канвасе;
 * - `off` — правило не проверяется вовсе.
 */
export type RuleSeverity = 'error' | 'warning' | 'off';

/** Строгость по id правила (`rule` нарушения); правила нет в таблице — `error`. */
// Пример: { 'element-count-limit': 'warning', 'radio-max-five-options': 'off' }.
export const DEFAULT_RULE_SEVERITY: Readonly<Record<string, RuleSeverity>> = {};

export function ruleSeverity(rules: EditorRules, rule: string): RuleSeverity {
  return rules.severity[rule] ?? 'error';
}

/**
 * Вид блока, в котором считаются элементы:
 * - `home` / `subScenario` — страница;
 * - `formStep` — один шаг формы;
 * - `form` — вся форма (сумма по её шагам).
 */
export type ElementCountScope = 'home' | 'subScenario' | 'formStep' | 'form';

/**
 * Вид блока → вид элемента → наибольшее число (решение владельца 2026-10-16,
 * R-CFG §3.1). Нет записи — без ограничения: снять лимит = удалить запись.
 */
export type ElementCountLimits = Readonly<
  Partial<Record<ElementCountScope, Readonly<Record<CanvasElementKind, number>>>>
>;

export const DEFAULT_ELEMENT_COUNT_LIMITS: ElementCountLimits = {
  formStep: { attachment: 1 },
};
