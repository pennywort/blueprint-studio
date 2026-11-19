import { useCallback, type RefObject } from 'react';
import type { ServiceGraph } from '@domain/model/service-graph';
import type { EditorRules } from '@domain/editor-rules';
import { findElementInGraph } from '@domain/element-containers';
import { appendVariant, canAddVariantOnCanvas } from '@domain/variant-source';
import { elementVariants } from '@domain/element-kinds';
import type { Command } from '@application/commands/command';
import { UpdateElementProps } from '@application/commands/update-element-props';
import { variantNumberLabel } from '@presentation/labels/editor-labels';
import { newVariantId } from '@presentation/features/attributes/new-variant-id';

// Кнопка «Значение» под вариантами (Selection list, [owner 2026-11-19]):
// новый вариант в конец — та же команда UpdateElementProps, что у панели
// атрибутов (undo из коробки). Можно ли добавить и куда — domain/variant-source.
export function useAddElementVariant(
  graphRef: RefObject<ServiceGraph>,
  runCommand: (command: Command) => void,
  rules: EditorRules,
): (elementId: string) => void {
  return useCallback(
    (elementId: string) => {
      const found = findElementInGraph(graphRef.current, elementId);
      if (!found || !canAddVariantOnCanvas(rules, found.element)) {
        return;
      }
      const label = variantNumberLabel(elementVariants(rules, found.element).length + 1);
      const next = appendVariant(rules, found.element, { id: newVariantId(), label });
      if (next) {
        runCommand(new UpdateElementProps(found.element.id, { props: { [next.prop]: next.items } }));
      }
    },
    [graphRef, rules, runCommand],
  );
}
