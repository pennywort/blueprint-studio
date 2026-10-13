import type { CanvasElementKind } from '@domain/model/canvas-element';

// Метаинформация проектных схем (D4): label, helperText, placeholder, секции,
// опции enum и условная видимость атрибутов — слой проекта поверх схем
// element-schemas (читает типы панель, читает мету — отсюда). Расширение под
// новые kind'ы/атрибуты — добавлением записи, без правки PropertyRenderer.

export type AttributeOption = {
  value: string;
  label: string;
};

// Условная видимость (кейс D4: «Вложение*» показывается при «Загрузка
// файлом» = true): атрибут рендерится только когда значение другого
// свойства элемента равно заданному.
export type AttributeVisibilityRule = {
  key: string;
  equals: unknown;
};

export type AttributeMeta = {
  /** Подпись поля; без меты — ключ атрибута. */
  label?: string;
  /** Текст под полем. */
  helperText?: string;
  /** Placeholder-пример в поле ввода. */
  placeholder?: string;
  /** Секция панели («Настройки»); без секции поле идёт в общий поток. */
  section?: string;
  /** Опции выбора для radio/select. */
  options?: readonly AttributeOption[];
  visibleWhen?: AttributeVisibilityRule;
};

export type ElementAttributeMeta = {
  /** Категория под заголовком панели (по макетам: «Сценарий», «Форма»). */
  category: string;
  /** Описание типа под заголовком. */
  description?: string;
  attributes: Record<string, AttributeMeta>;
};

const META: Record<CanvasElementKind, ElementAttributeMeta> = {
  // List item/Widget card (ADR-17, T-041): минимальная мета под stub-схемы;
  // остальные атрибуты (иконка, ссылка, настройки) — со схемами позже [owner 2026-10-13].
  listItem: {
    category: 'Сценарий',
    description: 'Строка списка',
    attributes: {
      title: { label: 'Название', placeholder: 'Например, Задать вопрос' },
      secondaryText: { label: 'Дополнительный текст', placeholder: 'Например, По методологии' },
    },
  },
  widgetCard: {
    category: 'Сценарий',
    description: 'Карточка-виджет',
    attributes: {
      title: { label: 'Название', placeholder: 'Например, Мои заявки' },
      secondaryText: { label: 'Дополнительный текст', placeholder: 'Например, Статусы и сроки' },
    },
  },
  textField: {
    category: 'Форма',
    description: 'Текстовое поле для ввода значения',
    attributes: {
      label: { label: 'Название', placeholder: 'Например, Сумма вклада' },
      required: { label: 'Обязательное поле', section: 'Настройки' },
      multiline: { label: 'Многострочное', section: 'Настройки' },
      maxLength: { label: 'Максимальная длина', helperText: 'Целое число, символов' },
      placeholder: { label: 'Подсказка внутри поля', placeholder: 'Например, 100 000 ₽' },
      caption: { label: 'Подпись под полем' },
      tooltip: { label: 'Текст подсказки' },
    },
  },
  infoBlock: {
    category: 'Форма',
    description: 'Информационный блок с текстом и ссылками',
    attributes: {
      text: { label: 'Текст', placeholder: 'Текст блока' },
      links: { label: 'Ссылки', helperText: 'Ссылки, которые показываются под текстом блока' },
    },
  },
  datePeriod: {
    category: 'Форма',
    description: 'Выбор периода дат',
    attributes: {
      label: { label: 'Название', placeholder: 'Например, Период действия' },
      required: { label: 'Обязательное поле', section: 'Настройки' },
      withTime: { label: 'Со временем', section: 'Настройки' },
      noPast: { label: 'Запрет прошедших дат', section: 'Настройки' },
      noFuture: { label: 'Запрет будущих дат', section: 'Настройки' },
      customLogic: { label: 'Пользовательская логика' },
    },
  },
  attachment: {
    category: 'Форма',
    description: 'Поле загрузки файлов (одно на форму)',
    attributes: {
      label: { label: 'Название', placeholder: 'Например, Справка о доходах' },
      required: { label: 'Обязательное поле', section: 'Настройки' },
      allowedTypes: { label: 'Типы файлов', helperText: 'Расширения через запятую: pdf, png' },
    },
  },
  checkbox: {
    category: 'Форма',
    description: 'Флажок согласия/подтверждения',
    attributes: {
      label: { label: 'Название', placeholder: 'Например, Согласен с условиями' },
      required: { label: 'Обязательное поле', section: 'Настройки' },
    },
  },
  configurationItemPicker: {
    category: 'Форма',
    description: 'Выбор конфигурационной единицы',
    attributes: {
      label: { label: 'Название', placeholder: 'Например, Сервис' },
      required: { label: 'Обязательное поле', section: 'Настройки' },
      multiSelect: { label: 'Множественный выбор', section: 'Настройки' },
      ciTypes: { label: 'Типы КЕ', helperText: 'Коды типов конфигурационных единиц' },
      disabled: { label: 'Отключено', section: 'Настройки' },
      tooltip: { label: 'Текст подсказки' },
      emptyResult: { label: 'Текст пустого результата' },
      helperText: { label: 'Подсказка под полем' },
      disableCloseOnSelect: { label: 'Не закрывать при выборе', section: 'Настройки' },
    },
  },
  employeeSearch: {
    category: 'Форма',
    description: 'Поиск сотрудника',
    attributes: {
      label: { label: 'Название', placeholder: 'Например, Ответственный' },
      required: { label: 'Обязательное поле', section: 'Настройки' },
      searchType: {
        label: 'Тип поиска',
        options: [
          { value: 'colleagues', label: 'Коллеги' },
          { value: 'all', label: 'Все сотрудники' },
        ],
      },
    },
  },
  selectList: {
    category: 'Форма',
    description: 'Список выбора значения',
    attributes: {
      label: { label: 'Название', placeholder: 'Например, Срок вклада' },
      displayType: {
        label: 'Тип отображения',
        section: 'Тип',
        options: [
          { value: 'radio', label: 'Переключатели' },
          { value: 'dropdown', label: 'Выпадающий список' },
          { value: 'list', label: 'Список' },
        ],
      },
      required: { label: 'Обязательное поле', section: 'Настройки' },
      multiSelect: { label: 'Множественный выбор', section: 'Настройки' },
      options: {
        label: 'Варианты выбора',
        helperText: 'Название варианта; значение для правил и маршрутизации генерируется автоматически',
      },
      search: {
        label: 'С поиском',
        section: 'Настройки',
        visibleWhen: { key: 'displayType', equals: 'dropdown' },
      },
    },
  },
  typography: {
    category: 'Форма',
    description: 'Текстовая вёрстка (заголовок)',
    attributes: {
      label: { label: 'Текст', placeholder: 'Например, Паспортные данные' },
      displayType: {
        label: 'Тип',
        section: 'Тип',
        options: [{ value: 'heading', label: 'Заголовок' }],
      },
    },
  },
  button: {
    category: 'Форма',
    description: 'Кнопка действия',
    attributes: {
      label: { label: 'Текст кнопки', placeholder: 'Например, Отправить' },
      displayType: {
        label: 'Тип',
        section: 'Тип',
        options: [
          { value: 'text', label: 'Текстовая' },
          { value: 'secondary', label: 'Вторичная' },
        ],
      },
      position: {
        label: 'Расположение',
        section: 'Тип',
        options: [
          { value: 'inline', label: 'В строке' },
          { value: 'standalone', label: 'Отдельным блоком' },
        ],
      },
    },
  },
  addressPicker: {
    category: 'Форма',
    description: 'Выбор адреса (этаж, кабинет…)',
    attributes: {
      label: { label: 'Название', placeholder: 'Например, Адрес офиса' },
      required: { label: 'Обязательное поле', section: 'Настройки' },
      displayParts: { label: 'Отображаемые части', helperText: 'Части адреса через запятую' },
    },
  },
  employeeLoginField: {
    category: 'Форма',
    description: 'Поле логина сотрудника',
    attributes: {
      label: { label: 'Название', placeholder: 'Например, Логин заявителя' },
      required: { label: 'Обязательное поле', section: 'Настройки' },
      isHidden: { label: 'Скрытое поле', section: 'Настройки' },
    },
  },
};

export function getElementAttributeMeta(kind: CanvasElementKind): ElementAttributeMeta {
  return META[kind];
}
