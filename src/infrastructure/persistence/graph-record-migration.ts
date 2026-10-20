// Версии формата записи карты в хранилище (ревью A11, R4). Запись без
// номера — формат до миграции «универсальные элементы» (версия 1).
// Каждая следующая версия добавляет шаг миграции в MIGRATIONS.
export const GRAPH_RECORD_VERSION = 5;

const VERSION_FIELD = 'schemaVersion';

// Модель «универсальные элементы» [owner 2026-10-13], версия 1 → 2.
// Графы, сохранённые до миграции (IndexedDB, T-053), хранят элементы по
// видам: homePage.listItems/widgetCards, subScenario.listItems,
// step.components, а у List item/Widget card нет дискриминатора kind.
// Миграция приводит такую запись к текущей форме до валидации; запись в
// новой форме проходит без изменений.

type LegacyRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is LegacyRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function withKind(items: unknown, kind: 'listItem' | 'widgetCard'): unknown[] {
  return Array.isArray(items)
    ? items.map((item) => (isRecord(item) && !('kind' in item) ? { ...item, kind } : item))
    : [];
}

function migrateLegacyPage(page: LegacyRecord): LegacyRecord {
  if ('elements' in page || !('listItems' in page || 'widgetCards' in page)) {
    return page;
  }
  const { listItems, widgetCards, ...rest } = page;
  return { ...rest, elements: [...withKind(listItems, 'listItem'), ...withKind(widgetCards, 'widgetCard')] };
}

function migrateLegacySubScenarios(subScenarios: unknown): unknown {
  if (!Array.isArray(subScenarios)) {
    return subScenarios;
  }
  return subScenarios.map((scenario) => {
    if (!isRecord(scenario)) {
      return scenario;
    }
    const migrated = migrateLegacyPage(scenario);
    return 'children' in migrated
      ? { ...migrated, children: migrateLegacySubScenarios(migrated.children) }
      : migrated;
  });
}

function migrateLegacyForms(forms: unknown): unknown {
  if (!Array.isArray(forms)) {
    return forms;
  }
  return forms.map((form) => {
    if (!isRecord(form) || !Array.isArray(form.steps)) {
      return form;
    }
    const steps = form.steps.map((step: unknown) => {
      if (!isRecord(step) || 'elements' in step || !('components' in step)) {
        return step;
      }
      const { components, ...rest } = step;
      return { ...rest, elements: components };
    });
    return { ...form, steps };
  });
}

function migrateUniversalElements(raw: unknown): unknown {
  if (!isRecord(raw)) {
    return raw;
  }
  return {
    ...raw,
    ...(isRecord(raw.homePage) ? { homePage: migrateLegacyPage(raw.homePage) } : null),
    subScenarios: migrateLegacySubScenarios(raw.subScenarios),
    applicationForms: migrateLegacyForms(raw.applicationForms),
  };
}

// Уровни шагов формы [owner 2026-10-14], версия 2 → 3. Шаги шли подряд слева
// направо по порядку массива; теперь шаг без входящего перехода — корень
// уровня 0, и сохранённые формы схлопнулись бы в одну колонку. Шагам без
// входящих переходов выставляется прежний уровень — индекс в массиве; цели
// переходов получают уровень из переходов (form-step-depths).
function migrateFormStepLevels(raw: unknown): unknown {
  if (!isRecord(raw) || !Array.isArray(raw.applicationForms)) {
    return raw;
  }
  const transitionTargets = new Set<unknown>(
    Array.isArray(raw.stepTransitions)
      ? raw.stepTransitions.map((transition: unknown) =>
          isRecord(transition) ? transition.targetStepId : undefined,
        )
      : [],
  );
  const applicationForms = raw.applicationForms.map((form: unknown) => {
    if (!isRecord(form) || !Array.isArray(form.steps)) {
      return form;
    }
    const steps = form.steps.map((step: unknown, index: number) =>
      isRecord(step) && !('layerDepth' in step) && !transitionTargets.has(step.id)
        ? { ...step, layerDepth: index }
        : step,
    );
    return { ...form, steps };
  });
  return { ...raw, applicationForms };
}

// Переход — только стрелка канваса [owner 2026-10-19, R-SCH-7], версия 3 → 4.
// Поля спеки 001 удалены: вложенные подсценарии (`children`) выносятся в
// общий список в порядке прежнего обхода (родитель, затем его потомки) —
// канвас их и так показывал плоско; `type`, `link`, `applicationFormId`
// снимаются (UI их не задавал).
function flattenSubScenarios(subScenarios: unknown): unknown[] {
  if (!Array.isArray(subScenarios)) {
    return [];
  }
  return subScenarios.flatMap((scenario: unknown) => {
    if (!isRecord(scenario)) {
      return [scenario];
    }
    const { children, type: _type, link: _link, applicationFormId: _formId, ...page } = scenario;
    return [page, ...flattenSubScenarios(children)];
  });
}

function migrateTransitionsToLinks(raw: unknown): unknown {
  if (!isRecord(raw) || !Array.isArray(raw.subScenarios)) {
    return raw;
  }
  return { ...raw, subScenarios: flattenSubScenarios(raw.subScenarios) };
}

// Элементы по схемам фреймворка [owner 2026-10-19, этап 3 docs/schemas/PLAN.md],
// версия 4 → 5. Элемент был zod-объектом своего вида с полями в корне; теперь
// kind — имя элемента во фреймворке, атрибуты — в props по его схеме,
// в корне — только метаданные редактора. Поля без пары во фреймворке
// теряются: maxLength поля ввода, «со временем» периода дат, иконка List
// item, расположение кнопки, поиск списка; «пользовательская логика» периода
// дат уходит в комментарий для разработчика, ссылки инфоблока — в текст
// (markdown). Компоненты (CI picker, поиск сотрудника, адрес, логин) и
// комментарий сохраняют kind — их схемы в проекте.

/** Метаданные редактора — остаются в корне элемента. */
const ELEMENT_META_KEYS = ['id', 'comment', 'layerDepth', 'routing', 'hasDynamicContent', 'hasComplexLogic'];

// Значения без undefined: props содержит только заданные атрибуты.
const defined = (props: LegacyRecord): LegacyRecord =>
  Object.fromEntries(Object.entries(props).filter(([, value]) => value !== undefined));

const legacyOptions = (element: LegacyRecord): LegacyRecord[] =>
  Array.isArray(element.options) ? element.options.filter(isRecord) : [];

const defaultValues = (element: LegacyRecord): unknown[] =>
  legacyOptions(element)
    .filter((option) => option.isDefault === true)
    .map((option) => option.value);

const linksMarkdown = (links: unknown): string =>
  (Array.isArray(links) ? links.filter(isRecord) : [])
    .map((link) => `\n[${String(link.label ?? '')}](${String(link.url ?? '')})`)
    .join('');

type ElementMigration = (element: LegacyRecord) => { kind: string; props: LegacyRecord; comment?: string };

const ELEMENT_MIGRATIONS: Readonly<Record<string, ElementMigration>> = {
  listItem: (e) => ({
    kind: 'list-item',
    props: { primaryText: e.title, secondaryText: e.secondaryText, linkHref: e.redirectUrl },
  }),
  widgetCard: (e) => ({
    kind: 'widget-card',
    props: { title: e.title, subtitle: e.secondaryText, icon: e.icon, bgImg: e.image, href: e.redirectUrl },
  }),
  comment: (e) => ({ kind: 'comment', props: { text: e.text, audience: e.audience } }),
  textField: (e) => ({
    kind: 'text-field',
    props: {
      label: e.label,
      required: e.required,
      multiline: e.multiline,
      placeholder: e.placeholder,
      helperText: e.caption,
      tooltipTextIcon: e.tooltip,
    },
  }),
  // message-strip устарел во фреймворке → alert [owner 2026-10-20]
  infoBlock: (e) => ({
    kind: 'alert',
    props: { label: `${String(e.text ?? '')}${linksMarkdown(e.links)}`, variant: 'info' },
  }),
  datePeriod: (e) => {
    const restrictions = isRecord(e.restrictions) ? e.restrictions : {};
    const comment = [e.comment, e.customLogic].filter((text) => typeof text === 'string' && text).join('\n');
    return {
      kind: 'date-range-field-picker',
      props: {
        label: e.label,
        required: e.required,
        disablePast: restrictions.noPast,
        disableFuture: restrictions.noFuture,
      },
      ...(comment ? { comment } : null),
    };
  },
  attachment: (e) => ({
    kind: 'attachment',
    props: { label: e.label, required: e.required, validExtensions: e.allowedTypes },
  }),
  checkbox: (e) => ({ kind: 'checkbox', props: { label: e.label, required: e.required } }),
  selectList: (e) => {
    const defaults = defaultValues(e);
    if (e.displayType === 'radio') {
      return {
        kind: 'radio-group',
        props: {
          label: e.label,
          required: e.required,
          value: defaults[0],
          items: legacyOptions(e).map((option) => ({
            label: option.label,
            value: option.value,
            disabled: false,
            required: false,
            error: false,
          })),
        },
      };
    }
    return {
      kind: 'select',
      props: {
        label: e.label,
        required: e.required,
        multiselect: e.multiSelect,
        value: e.multiSelect === true ? defaults : defaults[0],
        options: legacyOptions(e).map((option) => ({ id: option.value, label: option.label })),
      },
    };
  },
  typography: (e) => ({ kind: 'typography', props: { label: e.label, variant: 'h3' } }),
  button: (e) => ({
    kind: 'button',
    props: {
      label: e.label,
      variant: e.displayType === 'text' ? 'text' : 'contained',
      color: e.displayType === 'secondary' ? 'secondary' : undefined,
    },
  }),
};

// Компоненты проекта: kind прежний, все поля вида — в props.
const keepKindMigration: ElementMigration = (e) => ({
  kind: String(e.kind),
  props: Object.fromEntries(
    Object.entries(e).filter(([key]) => key !== 'kind' && !ELEMENT_META_KEYS.includes(key)),
  ),
});

function migrateElement(element: unknown): unknown {
  if (!isRecord(element) || 'props' in element || typeof element.kind !== 'string') {
    return element;
  }
  const migrate = ELEMENT_MIGRATIONS[element.kind] ?? keepKindMigration;
  const { kind, props, comment } = migrate(element);
  const meta = Object.fromEntries(
    ELEMENT_META_KEYS.filter((key) => key in element).map((key) => [key, element[key]]),
  );
  return defined({ ...meta, kind, props: defined(props), ...(comment ? { comment } : null) });
}

const migrateElementList = (elements: unknown): unknown =>
  Array.isArray(elements) ? elements.map(migrateElement) : elements;

const migrateElementsToFrameworkSchemas = (raw: unknown): unknown =>
  mapGraphElements(raw, migrateElementList);

// Списки элементов всех блоков карты (Главная, подсценарии, шаги форм) → fn.
function mapGraphElements(raw: unknown, fn: (elements: unknown) => unknown): unknown {
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

/** Шаг миграции: с версии (ключ) на следующую. */
const MIGRATIONS: Readonly<Record<number, (raw: unknown) => unknown>> = {
  1: migrateUniversalElements,
  2: migrateFormStepLevels,
  3: migrateTransitionsToLinks,
  4: migrateElementsToFrameworkSchemas,
};

// Запись хранилища → данные для доменной схемы: шаги миграции от версии
// записи до текущей, служебное поле версии снимается.
export function migrateGraphRecord(raw: unknown): unknown {
  if (!isRecord(raw)) {
    return raw;
  }
  const { [VERSION_FIELD]: stored, ...record } = raw;
  let version = typeof stored === 'number' ? stored : 1;
  let migrated: unknown = record;
  while (version < GRAPH_RECORD_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) {
      throw new Error(`Нет миграции записи карты с версии ${version}`);
    }
    migrated = step(migrated);
    version += 1;
  }
  return migrated;
}

// Устаревшие kind элементов → актуальные (замены — из схем фреймворка,
// x-replaced-by). Не шаг версии: таблица растёт вместе с фреймворком, поэтому
// применяется при каждой загрузке и идемпотентна [owner 2026-10-20].
export function replaceLegacyKinds(raw: unknown, replacements: Readonly<Record<string, string>>): unknown {
  if (Object.keys(replacements).length === 0) {
    return raw;
  }
  const replace = (element: unknown): unknown => {
    if (!isRecord(element) || typeof element.kind !== 'string') {
      return element;
    }
    const next = replacements[element.kind];
    return next ? { ...element, kind: next } : element;
  };
  return mapGraphElements(raw, (elements) => (Array.isArray(elements) ? elements.map(replace) : elements));
}

// Граф → запись хранилища с номером версии формата.
export function toGraphRecord<T extends object>(graph: T): T & { [VERSION_FIELD]: number } {
  return { ...graph, [VERSION_FIELD]: GRAPH_RECORD_VERSION };
}
