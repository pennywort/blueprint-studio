import type { CanvasElementKind } from './model/canvas-element';

// Политика доменных правил (R-CFG-5, [owner 2026-10-16]) — данные, а не
// ветвления: изменить или снять ограничение = поправить таблицу ниже.
// Сейчас это stub конфига редактора (R-CFG-9): при переходе на конфиг
// значения придут из него, проверки не меняются.

/**
 * Строгость правила:
 * - `error` — команда, нарушающая правило, отклоняется (как раньше);
 * - `warning` — действие разрешено, нарушение подсвечивается на канвасе;
 * - `off` — правило не проверяется вовсе.
 */
export type RuleSeverity = 'error' | 'warning' | 'off';

/** Строгость по id правила (`rule` нарушения); правила нет в таблице — `error`. */
// Пример: { 'element-count-limit': 'warning', 'radio-max-five-options': 'off' }.
export const RULE_SEVERITY: Readonly<Record<string, RuleSeverity>> = {};

export function ruleSeverity(rule: string): RuleSeverity {
  return RULE_SEVERITY[rule] ?? 'error';
}

/**
 * Вид блока, в котором считаются элементы:
 * - `home` / `subScenario` — страница;
 * - `formStep` — один шаг формы;
 * - `form` — вся форма (сумма по её шагам).
 */
export type ElementCountScope = 'home' | 'subScenario' | 'formStep' | 'form';

export type ElementCountLimit = {
  kind: CanvasElementKind;
  scope: ElementCountScope;
  max: number;
};

// Сколько элементов вида может лежать в блоке (конституция §4 п. 1 —
// значение по умолчанию). Вложение — одно на шаг формы [owner 2026-10-16;
// раньше — одно на форму]. Пример расширения:
// { kind: 'attachment', scope: 'subScenario', max: 2 }.
export const ELEMENT_COUNT_LIMITS: readonly ElementCountLimit[] = [
  { kind: 'attachment', scope: 'formStep', max: 1 },
];
