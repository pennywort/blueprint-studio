import { useCallback, useState } from 'react';
import type { CanvasSearchResult } from '@presentation/features/top-bar/editor-top-bar';
import type { CanvasNode } from './graph-flow-adapter';

/** Запрос центрирования вьюпорта на узле — результат поиска. */
export type CanvasFocus = { nodeId: string; elementId: string | null; nonce: number };

// Поиск по канвасу (T-050): узлы и элементы по вхождению подстроки без
// учёта регистра; не больше 20 результатов.
export function searchCanvasNodes(nodes: readonly CanvasNode[], query: string): CanvasSearchResult[] {
  const needle = query.toLocaleLowerCase();
  const matches = (text: string) => text.toLocaleLowerCase().includes(needle);
  const results: CanvasSearchResult[] = [];
  for (const node of nodes) {
    if (matches(node.data.title)) {
      results.push({
        key: node.id,
        nodeId: node.id,
        elementId: null,
        title: node.data.title,
        context: node.data.subtitle,
      });
    }
    const elements = [...node.data.elements, ...node.data.steps.flatMap((step) => step.elements)];
    for (const element of elements) {
      if (matches(element.title)) {
        results.push({
          key: `${node.id}/${element.id}`,
          nodeId: node.id,
          elementId: element.id,
          title: element.title,
          context: `${element.kindLabel} · ${node.data.title}`,
        });
      }
    }
  }
  return results.slice(0, 20);
}

// Выбор результата поиска (ревью A3, R3): выделение + центрирование вьюпорта
// (focus).
export function useCanvasSearch(
  selectNode: (nodeId: string) => void,
  selectElement: (elementId: string) => void,
) {
  const [focus, setFocus] = useState<CanvasFocus | null>(null);

  // Выбор результата поиска (T-050): выделение по единому правилу (ADR-12)
  // + запрос центрирования (nonce — повторный выбор того же).
  const selectSearchResult = useCallback(
    (result: CanvasSearchResult) => {
      if (result.elementId !== null) {
        selectElement(result.elementId);
      } else {
        selectNode(result.nodeId);
      }
      setFocus((current) => ({
        nodeId: result.nodeId,
        elementId: result.elementId,
        nonce: (current?.nonce ?? 0) + 1,
      }));
    },
    [selectElement, selectNode],
  );

  return { focus, selectSearchResult };
}
