import type { CanvasElement } from './model/canvas-element';
import { canBeLogicSource } from './element-kinds';

// Куда источник может строить связи (R-CFG-2, [owner 2026-10-16]) — данные,
// а не ветвления `optionId !== undefined && hasComplexLogic`. Изменить или
// вернуть поведение = поправить строку таблицы; новый вид источника — новая
// роль и строка, проверки (connection-rules, step-transitions) не меняются.
// Сейчас это stub конфига редактора (R-CFG-9).
//
// Таблицу читают и подсветка целей при протягивании (connection-rules), и
// инвариант перехода (step-transitions) — одно правило, один источник.

/**
 * Роль источника связи:
 * - `element` — элемент целиком (handle элемента);
 * - `option` — вариант Select'а без «Сложной логики»;
 * - `logicOption` — вариант Select'а с включённой «Сложной логикой» (L4).
 */
export type ConnectionSourceRole = 'element' | 'option' | 'logicOption';

/**
 * Вид цели связи:
 * - `page` — страница следующих уровней (навигация, D9);
 * - `step` — шаг следующих уровней той же формы (переход [owner 2026-10-14]);
 * - `element` — элемент того же блока (правило видимости, L-I5/ADR-14).
 */
export type ConnectionTargetKind = 'page' | 'step' | 'element';

// Вариант с логикой — только внутри своего шага [owner 2026-10-16; раньше —
// ещё и переход на шаг]. Вариант без логики — источник перехода [owner 2026-10-14].
export const CONNECTION_REACH: Readonly<Record<ConnectionSourceRole, readonly ConnectionTargetKind[]>> = {
  element: ['page', 'step'],
  option: ['step'],
  logicOption: ['element'],
};

export function connectionSourceRole(element: CanvasElement, optionId?: string): ConnectionSourceRole {
  if (optionId === undefined) {
    return 'element';
  }
  return canBeLogicSource(element) && element.hasComplexLogic === true ? 'logicOption' : 'option';
}

export function canReach(role: ConnectionSourceRole, target: ConnectionTargetKind): boolean {
  return CONNECTION_REACH[role].includes(target);
}
