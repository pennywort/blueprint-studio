import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ServiceGraph } from '@domain/model/service-graph';
import type { CanvasElement } from '@domain/model/canvas-element';
import { findElementLocation } from '@application/commands/graph-lookup';

// Данные панели атрибутов для выделенного элемента (T-041).
export type SelectedElementInfo = {
  component: CanvasElement;
};

// Кнопка мыши зажата на канвасе: пока ЛКМ удержана, подразумевается попытка
// переноса, и панель атрибутов не должна открываться — она сужает канвас и
// срывает drag. Жест кончается на pointerup (клик, drag узла react-flow) либо
// на dragend/drop (нативный dnd карточек: на его старте браузер шлёт
// pointercancel и pointerup уже не будет — поэтому pointercancel жест НЕ
// завершает, иначе панель открывалась бы посреди переноса; drop нужен на
// случай, когда перенесённая карточка перемонтирована и dragend не дойдёт).
// Нажатия вне .react-flow (сама панель) не считаются.
export function useCanvasPointerHeld(): boolean {
  const [held, setHeld] = useState(false);
  useEffect(() => {
    const onDown = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest('.react-flow')) {
        setHeld(true);
      }
    };
    const onRelease = () => setHeld(false);
    window.addEventListener('pointerdown', onDown, true);
    window.addEventListener('pointerup', onRelease, true);
    window.addEventListener('dragend', onRelease, true);
    window.addEventListener('drop', onRelease, true);
    return () => {
      window.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('pointerup', onRelease, true);
      window.removeEventListener('dragend', onRelease, true);
      window.removeEventListener('drop', onRelease, true);
    };
  }, []);
  return held;
}

const NO_ELEMENTS: readonly string[] = [];

// Выделение на канвасе (ревью A3, R3): узел, шаг формы и элементы.
// Выделение узла и элементов взаимоисключающи — последний клик побеждает
// (единое правило проекта: выделение + Delete, F5/ADR-12).
export function useSelection(graph: ServiceGraph) {
  // Выделенный узел (клик): цель меню добавления элементов тулбара (T-034).
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  // Выделенные элементы в порядке выделения; Shift+клик набирает несколько
  // для Delete и Ctrl+C/X/V [owner 2026-10-27]. Последний — основной: его
  // блок — цель вставки.
  const [selectedElementIds, setSelectedElementIds] = useState<readonly string[]>(NO_ELEMENTS);
  // Выделенный шаг формы (S10): меню элементов тулбара добавляет в него.
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);

  // Выделение узлов — только явным нажатием на узел (канвас); собственное
  // выделение react-flow игнорируется — иначе выделение «качалось» между
  // узлом и элементом до Maximum update depth (N6, повторная приёмка).
  const selectNode = useCallback((nodeId: string | null, stepId: string | null = null) => {
    setSelectedNodeId(nodeId);
    setSelectedStepId(nodeId !== null ? stepId : null);
    if (nodeId !== null) {
      setSelectedElementIds(NO_ELEMENTS);
    }
  }, []);
  // additive (Shift+клик) — элемент добавляется в набор или убирается из него;
  // иначе выделение — только он.
  const selectElement = useCallback((elementId: string | null, additive = false) => {
    if (elementId === null) {
      setSelectedElementIds(NO_ELEMENTS);
      return;
    }
    setSelectedNodeId(null);
    setSelectedElementIds((current) => {
      if (!additive) {
        return current.length === 1 && current[0] === elementId ? current : [elementId];
      }
      return current.includes(elementId) ? current.filter((id) => id !== elementId) : [...current, elementId];
    });
  }, []);
  // Набор элементов целиком (копии после вставки).
  const selectElements = useCallback((elementIds: readonly string[]) => {
    setSelectedElementIds(elementIds.length === 0 ? NO_ELEMENTS : elementIds);
    if (elementIds.length > 0) {
      setSelectedNodeId(null);
    }
  }, []);
  // Клик по пустому полю: снимает выделение со всего (выделение держится
  // на сущности, пока не выбрана другая).
  const clearSelection = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedElementIds(NO_ELEMENTS);
  }, []);
  // Удалённый узел больше не выделен.
  const forgetNode = useCallback((nodeId: string) => {
    setSelectedNodeId((current) => (current === nodeId ? null : current));
  }, []);

  // Основной выделенный элемент — последний выбранный.
  const selectedElementId = selectedElementIds.at(-1) ?? null;

  // Единственный выделенный элемент — данные панели атрибутов (T-041). Любой
  // вид элемента (ADR-17); при наборе из нескольких панель не показывается.
  const selectedElement = useMemo<SelectedElementInfo | null>(() => {
    if (selectedElementIds.length !== 1 || !selectedElementId) {
      return null;
    }
    const location = findElementLocation(graph, selectedElementId);
    const component = location?.list[location.index];
    return component ? { component } : null;
  }, [graph, selectedElementId, selectedElementIds.length]);

  return {
    selectedNodeId,
    selectedElementId,
    selectedElementIds,
    selectElements,
    selectedStepId,
    selectedElement,
    selectNode,
    selectElement,
    clearSelection,
    forgetNode,
  };
}
