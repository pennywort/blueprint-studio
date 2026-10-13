// Миграция сохранённых карт к текущей модели (вход — сырые данные до
// Zod-валидации). Элементы равноправны [owner 2026-10-13]: раньше Главная
// хранила listItems/widgetCards, подсценарий — listItems, шаг — components,
// и у List item/Widget card не было kind. Теперь у любого контейнера один
// список `elements` любых элементов. Карта в новом формате не меняется.

type Raw = Record<string, unknown>;

const isObject = (value: unknown): value is Raw => typeof value === 'object' && value !== null;

const withKind = (items: unknown, kind: string): unknown[] =>
  Array.isArray(items)
    ? items.map((item) => (isObject(item) && !('kind' in item) ? { ...item, kind } : item))
    : [];

function migratePage(page: Raw): Raw {
  if ('elements' in page) {
    return page;
  }
  const { listItems, widgetCards, ...rest } = page;
  return { ...rest, elements: [...withKind(listItems, 'listItem'), ...withKind(widgetCards, 'widgetCard')] };
}

function migrateScenarios(scenarios: unknown): unknown {
  return Array.isArray(scenarios)
    ? scenarios.map((scenario) =>
        isObject(scenario)
          ? {
              ...migratePage(scenario),
              ...(scenario.children ? { children: migrateScenarios(scenario.children) } : null),
            }
          : scenario,
      )
    : scenarios;
}

function migrateForm(form: unknown): unknown {
  if (!isObject(form) || !Array.isArray(form.steps)) {
    return form;
  }
  return {
    ...form,
    steps: form.steps.map((step) => {
      if (!isObject(step) || 'elements' in step) {
        return step;
      }
      const { components, ...rest } = step;
      return { ...rest, elements: Array.isArray(components) ? components : [] };
    }),
  };
}

export function migrateServiceGraph(raw: unknown): unknown {
  if (!isObject(raw)) {
    return raw;
  }
  return {
    ...raw,
    ...(isObject(raw.homePage) ? { homePage: migratePage(raw.homePage) } : null),
    subScenarios: migrateScenarios(raw.subScenarios),
    applicationForms: Array.isArray(raw.applicationForms)
      ? raw.applicationForms.map(migrateForm)
      : raw.applicationForms,
  };
}
