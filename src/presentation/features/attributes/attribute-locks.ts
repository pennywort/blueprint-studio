import type { ElementAttribute } from '@application/ports/element-schema-provider';
import type { ElementPropsPatch } from '@application/commands/update-element-props';
import { lockedUpdates } from '@domain/attribute-locks';

// Патч правки поля панели + зафиксированные значения, которые она включила
// (domain/attribute-locks, [owner 2026-11-19]): смена типа группы той же
// командой выставляет зависимый атрибут. Здесь — только раскладка по props/ext.
export function patchWithLocks(
  attributes: readonly ElementAttribute[],
  values: Readonly<Record<string, unknown>>,
  changed: ElementAttribute,
  next: unknown,
): ElementPropsPatch {
  const props: Record<string, unknown> = {};
  const ext: Record<string, unknown> = {};
  const target = (attribute: ElementAttribute) => (attribute.store === 'props' ? props : ext);
  target(changed)[changed.key] = next;
  for (const { attribute, value } of lockedUpdates(attributes, { ...values, [changed.key]: next })) {
    target(attribute)[attribute.key] = value;
  }
  return {
    ...(Object.keys(props).length > 0 && { props }),
    ...(Object.keys(ext).length > 0 && { ext }),
  };
}
