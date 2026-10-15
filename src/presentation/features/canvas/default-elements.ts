import type { FormComponent, FormComponentKind } from '@domain/model/form-components';
import { toElementId, toFormComponentId, type FormComponentId } from '@domain/model/ids';
import {
  DEFAULT_COMMENT_AUDIENCE,
  isCommentKind,
  isPageElementKind,
  type CanvasElement,
  type CanvasElementKind,
} from '@domain/model/canvas-element';

// Фабрики элементов по умолчанию для меню добавления (Epic 002, T-034):
// новый элемент создаётся с минимально валидными значениями полей
// (Zod-схемы — domain/model/form-components.ts), осмысленные значения
// пользователь задаёт позже в панели атрибутов (T-041+).

export const NEW_LIST_ITEM_TITLE = 'Новый элемент';
export const NEW_COMMENT_TEXT = 'Комментарий';
export const NEW_SCENARIO_TITLE = 'Новый подсценарий';
export const NEW_FORM_TITLE = 'Новая форма заявки';

// Минимально валидный элемент любого вида — любой элемент добавляется в
// любой блок [owner 2026-10-13, ADR-17]. rawId — значение IIdGenerator.
export function createDefaultElement(kind: CanvasElementKind, rawId: string): CanvasElement {
  if (isCommentKind(kind)) {
    // Комментарий-элемент [owner 2026-10-15]: адресат по умолчанию — разработчик.
    return { id: toElementId(rawId), kind, text: NEW_COMMENT_TEXT, audience: DEFAULT_COMMENT_AUDIENCE };
  }
  return isPageElementKind(kind)
    ? { id: toElementId(rawId), kind, title: NEW_LIST_ITEM_TITLE }
    : createDefaultFormComponent(kind, toFormComponentId(rawId));
}

// Минимально валидный форм-компонент каждого kind: обязательные поля
// заполняются нейтральными значениями, опциональные не задаются.
export function createDefaultFormComponent(kind: FormComponentKind, id: FormComponentId): FormComponent {
  switch (kind) {
    case 'textField':
      return { id, kind, label: 'Текстовое поле', required: false, multiline: false };
    case 'infoBlock':
      return { id, kind, text: 'Информационный блок', links: [] };
    case 'datePeriod':
      return { id, kind, label: 'Период', required: false, withTime: false, restrictions: {} };
    case 'attachment':
      return { id, kind, label: 'Файл', required: false, allowedTypes: [] };
    case 'checkbox':
      return { id, kind, label: 'Чекбокс', required: false };
    case 'configurationItemPicker':
      return {
        id,
        kind,
        label: 'Элемент конфигурации',
        required: false,
        multiSelect: false,
        ciTypes: [],
        disabled: false,
      };
    case 'employeeSearch':
      return { id, kind, label: 'Сотрудник', required: false, searchType: 'colleagues' };
    case 'selectList':
      return {
        id,
        kind,
        label: 'Список',
        required: false,
        displayType: 'dropdown',
        multiSelect: false,
        options: [],
      };
    case 'typography':
      return { id, kind, label: 'Заголовок', displayType: 'heading' };
    case 'button':
      return { id, kind, label: 'Кнопка', displayType: 'secondary', position: 'standalone' };
    case 'addressPicker':
      return { id, kind, label: 'Адрес', required: false, displayParts: [] };
    case 'employeeLoginField':
      return { id, kind, label: 'Логин сотрудника', required: false };
  }
}
