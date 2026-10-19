/**
 * Диагностики: всё, что генератор не смог выразить точно, попадает в отчёт,
 * а не молча превращается в «любое значение».
 */

import type { Diagnostic, Severity } from './format';

/** Код → важность. Новый вид проблемы = новая строка здесь. */
export const DIAGNOSTIC_CODES = {
  /** Тип не распознан, в схеме x-ts-type. */
  'unresolved-type': 'warn',
  /** Явный any/unknown в исходнике. */
  'any-type': 'warn',
  /** Объект с произвольными ключами ({[key: string]: any}). */
  'loose-object': 'info',
  /** Тип из lib.d.ts / .d.ts — не раскрывается. */
  'external-type': 'info',
  /** Рантайм-объект движка (интерфейс с методами) — не раскрывается. */
  'runtime-type': 'info',
  /** Циклическая ссылка типа. */
  'cycle-type': 'info',
  /** Значение по умолчанию — выражение, не сводимое к JSON. */
  'default-unresolved': 'warn',
  /** default: null при типе без null — тип расширен null. */
  'default-null-widened': 'warn',
  /** Значение по умолчанию не проходит схему свойства (ajv). */
  'default-invalid': 'error',
  /** В defaultProps есть ключ, которого нет среди props. */
  'default-without-prop': 'info',
  /** Схема не компилируется валидатором (ajv). */
  'schema-invalid': 'error',
  /** Props-файл или тип <X>Props не найден. */
  'props-missing': 'error',
  /** Свойство есть в ручной базе, но не в props-типе элемента — в схему не попадает. */
  'base-only-prop': 'info',
  /** Контейнер, но список дочерних типов не извлечён. */
  'children-unresolved': 'warn',
  /** Список дочерних типов извлечён по тексту, а не по типу. */
  'children-by-text': 'info',
  /** Ручная база событий содержит невалидный "type": "any" — убран. */
  'base-event-any': 'info',
  /** Генерация элемента упала. */
  'element-failed': 'error',
} as const satisfies Record<string, Severity>;

export type DiagnosticCode = keyof typeof DIAGNOSTIC_CODES;

export class Diagnostics {
  readonly items: Diagnostic[] = [];

  report(code: DiagnosticCode, path: string, message: string): void {
    const exists = this.items.some((d) => d.code === code && d.path === path && d.message === message);
    if (!exists) this.items.push({ code, severity: DIAGNOSTIC_CODES[code], path, message });
  }
}
