// Версии формата записи карты в хранилище (ревью A11, R4). Запись без
// номера — формат до миграции «универсальные элементы» (версия 1).
// Каждая следующая версия добавляет шаг миграции в MIGRATIONS.
export const GRAPH_RECORD_VERSION = 3;

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

/** Шаг миграции: с версии (ключ) на следующую. */
const MIGRATIONS: Readonly<Record<number, (raw: unknown) => unknown>> = {
  1: migrateUniversalElements,
  2: migrateFormStepLevels,
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

// Граф → запись хранилища с номером версии формата.
export function toGraphRecord<T extends object>(graph: T): T & { [VERSION_FIELD]: number } {
  return { ...graph, [VERSION_FIELD]: GRAPH_RECORD_VERSION };
}
