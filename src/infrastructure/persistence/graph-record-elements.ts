import { DEVELOPER_COMMENT_KEY } from '@domain/element-kinds';
import { GROUP_TYPE, GROUP_TYPE_KEY, VARIANTS_SOURCE, VARIANTS_SOURCE_KEY } from '@domain/variant-source';

// Общее для шагов миграции записи карты (ревью A11, R4): обход списков
// элементов всех блоков. Вынесено из graph-record-migration — файл > 400 строк.

export type LegacyRecord = Record<string, unknown>;

export const isRecord = (value: unknown): value is LegacyRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// Списки элементов всех блоков карты (Главная, подсценарии, шаги форм) → fn.
export function mapGraphElements(raw: unknown, fn: (elements: unknown) => unknown): unknown {
  if (!isRecord(raw)) {
    return raw;
  }
  const page = (value: unknown) => (isRecord(value) ? { ...value, elements: fn(value.elements) } : value);
  return {
    ...raw,
    ...(isRecord(raw.homePage) ? { homePage: page(raw.homePage) } : null),
    subScenarios: Array.isArray(raw.subScenarios) ? raw.subScenarios.map(page) : raw.subScenarios,
    applicationForms: Array.isArray(raw.applicationForms)
      ? raw.applicationForms.map((form: unknown) =>
          isRecord(form) && Array.isArray(form.steps) ? { ...form, steps: form.steps.map(page) } : form,
        )
      : raw.applicationForms,
  };
}

// Версия 7 → 8 [owner 2026-11-19]: комментарий для разработчика — общий
// атрибут всех элементов в ext (extensions.all схем проекта), а не метаданные
// comment. Пустой комментарий не переносится.
function migrateDeveloperComment(element: unknown): unknown {
  if (!isRecord(element) || !('comment' in element)) {
    return element;
  }
  const { comment, ...rest } = element;
  if (typeof comment !== 'string' || comment === '') {
    return rest;
  }
  const ext = isRecord(rest.ext) ? rest.ext : {};
  return { ...rest, ext: { ...ext, [DEVELOPER_COMMENT_KEY]: comment } };
}

export const migrateDeveloperCommentToExt = (raw: unknown): unknown =>
  mapGraphElements(raw, (elements) =>
    Array.isArray(elements) ? elements.map(migrateDeveloperComment) : elements,
  );

// Версия 8 → 9 [owner 2026-11-19]: Select стал Selection list — тип группы и
// способ заполнения вариантов в ext. Прежний Select — обычный выпадающий
// список, варианты которого заданы вручную; заданные значения не меняются.
const SELECTION_LIST_KIND = 'select';
const LEGACY_SELECT_EXT = {
  [GROUP_TYPE_KEY]: GROUP_TYPE.select,
  [VARIANTS_SOURCE_KEY]: VARIANTS_SOURCE.manual,
};

function migrateSelect(element: unknown): unknown {
  if (!isRecord(element) || element.kind !== SELECTION_LIST_KIND) {
    return element;
  }
  return { ...element, ext: { ...LEGACY_SELECT_EXT, ...(isRecord(element.ext) ? element.ext : {}) } };
}

export const migrateSelectToSelectionList = (raw: unknown): unknown =>
  mapGraphElements(raw, (elements) => (Array.isArray(elements) ? elements.map(migrateSelect) : elements));
