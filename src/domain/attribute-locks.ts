// Фиксация значений атрибутов (lockedWhen политики, [owner 2026-11-19]):
// пока атрибут-условие равен значению, у атрибута зафиксированное значение.
// Правило — данные политики («радио → единичный выбор» — строка
// editor-policy.json); здесь только их применение — одна функция для поля
// панели (недоступно) и для записи согласованных значений той же командой.

export type AttributeLockRule = { key: string; equals: unknown; value: unknown };

type LockedAttribute = { key: string; lockedWhen?: readonly AttributeLockRule[] };

type Values = Readonly<Record<string, unknown>>;

/** Действующая фиксация атрибута при значениях элемента; нет — значение свободно. */
export function activeLock(attribute: LockedAttribute, values: Values): AttributeLockRule | undefined {
  return attribute.lockedWhen?.find((lock) => values[lock.key] === lock.equals);
}

/**
 * Атрибуты, чьё значение надо выставить после правки (values — уже с ней):
 * в карте не остаётся несогласованного сочетания (§4b).
 */
export function lockedUpdates<A extends LockedAttribute>(
  attributes: readonly A[],
  values: Values,
): { attribute: A; value: unknown }[] {
  return attributes.flatMap((attribute) => {
    const lock = activeLock(attribute, values);
    return lock && values[attribute.key] !== lock.value ? [{ attribute, value: lock.value }] : [];
  });
}
