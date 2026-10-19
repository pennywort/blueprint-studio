import { toElementId } from '@domain/model/ids';
import type { CanvasElement, CanvasElementKind } from '@domain/model/canvas-element';

// Фабрики элементов по умолчанию для меню добавления (Epic 002, T-034):
// props нового элемента — `defaults` из описания элемента (политика
// редактора, этап 3 docs/schemas/PLAN.md), осмысленные значения пользователь
// задаёт позже в панели атрибутов (T-041+).

export const NEW_SCENARIO_TITLE = 'Новый подсценарий';
export const NEW_FORM_TITLE = 'Новая форма заявки';

// Новый элемент любого вида — любой элемент добавляется в любой блок
// [owner 2026-10-13, ADR-17]. rawId — значение IIdGenerator.
export function createDefaultElement(
  kind: CanvasElementKind,
  rawId: string,
  defaults: Readonly<Record<string, unknown>>,
): CanvasElement {
  return { id: toElementId(rawId), kind, props: structuredClone({ ...defaults }) };
}

// Копия элемента под новым id — вставка из буфера (хоткеи Ctrl+C/X/V
// [owner 2026-10-15]). Явная колонка шага не копируется: вставленный элемент
// раскладывается в блоке-приёмнике заново (AddElement). Связи и правила
// «Сложной логики» живут в графе, а не в элементе, — копия их не несёт.
export function cloneElementWithId(element: CanvasElement, rawId: string): CanvasElement {
  const copy = structuredClone(element);
  delete copy.layerDepth;
  copy.id = toElementId(rawId);
  return copy;
}
