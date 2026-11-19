import type { FormKind } from '@domain/form-kind';

// Единый словарь подписей редактора (R-CFG-6, [owner 2026-10-16]): названия
// узлов, «Шаг N», уровни навигации — один источник для канваса, меню и
// панели атрибутов. Формат словаря пока не утверждён — это stub: при
// переходе на конфиг (R-CFG-10) меняется только этот модуль. Подписи видов
// элементов — в политике редактора (каталог элементов, этап 3 docs/schemas/PLAN.md).

// Названия видов узлов канваса: шапки узлов и меню добавления узлов (T-034).
// У Главной нет собственного заголовка в доменной модели — имя из макетов.
export const NODE_KIND_LABELS = {
  home: 'Главная',
  subScenario: 'Подсценарий',
  form: 'Форма заявки',
} as const;

// Чип типа формы в шапке узла формы (D1); тип — domain/form-kind.
export const FORM_KIND_LABELS: Readonly<Record<FormKind, string>> = {
  single: 'Одностраничная',
  stepper: 'Степперная',
};

// Подзаголовки узлов (макеты редактора).
export const NODE_SUBTITLES = {
  home: 'Стартовая страница сервиса',
  form: 'Поля для заполнения пользователем',
} as const;

// Порядковые номера уровней навигации для подписи подсценария (макеты:
// «Первый уровень навигации», «Второй уровень навигации»).
const NAVIGATION_LEVEL_ORDINALS = ['Первый', 'Второй', 'Третий', 'Четвёртый', 'Пятый'];

export function navigationLevelLabel(level: number): string {
  const ordinal = NAVIGATION_LEVEL_ORDINALS[level - 1];
  return ordinal ? `${ordinal} уровень навигации` : `Уровень навигации ${level}`;
}

// Подпись шага формы без своего названия [owner 2026-10-14]: номер — номер
// колонки (уровня) шага в форме, у шагов одного уровня (ветвление) номер общий.
export function formStepLabel(level: number): string {
  return `Шаг ${level}`;
}

// Варианты элемента выбора (Selection list) [owner 2026-11-19]: кнопка под
// элементом, номер значения на карточке варианта, загрузка списка файлом.
export const VARIANT_LABELS = {
  addOnCanvas: 'Значение',
  isDefault: 'Предвыбор',
  fileTemplate: 'Шаблон для заполнения',
  fileTemplateFormat: 'csv',
  fileTemplateDownload: 'Скачать шаблон',
  fileTemplateName: 'шаблон-списка.csv',
  /** Заголовок колонки шаблона CSV; при загрузке строка-заголовок пропускается. */
  fileTemplateHeader: 'Значение',
  fileAttachment: 'Вложение',
  fileChoose: 'Выберите файл',
  fileLoaded: 'Загружено',
  fileRemove: 'Удалить файл',
  fileEmpty: 'В файле нет значений',
  /** Карточка вложения после перезагрузки: имени файла в карте нет, только значения. */
  fileFromMap: 'Список из файла',
} as const;

/** Подпись нового варианта и номер значения на карточке варианта. */
export function variantNumberLabel(index: number): string {
  return `Значение ${index}`;
}

/** Размер файла для карточки вложения. */
export function fileSizeLabel(bytes: number): string {
  return bytes < 1024 ? `${bytes} Б` : `${Math.round(bytes / 1024)} КБ`;
}

/** Число значений, загруженных из файла. */
export function variantCountLabel(count: number): string {
  return `Значений: ${count}`;
}
