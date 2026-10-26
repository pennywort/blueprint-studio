import type { AnySettingsSection } from './settings-section';

// Сборка действующих настроек из слоёв (R-ADM): умолчания секций ←
// документ администратора ← документ пользователя. Чистая функция: тот же
// вход — то же значение (переопределение на лету = новый вызов).
//
// Документ слоя — JSON-объект `{ "<ключ секции>": переопределение }`.
// Ключи на `$` (`$comment`, `$schema`) и `version` — служебные, не секции.
// Ошибка в одной секции не ломает остальные: секция остаётся на значении
// нижнего слоя, ошибка попадает в issues (видна администратору).

export type SettingsLayer = 'admin' | 'user';

export type SettingsIssue = {
  readonly layer: SettingsLayer;
  /** Ключ секции; пусто — ошибка документа целиком. */
  readonly section: string;
  readonly message: string;
};

/** Документ слоя: секция → переопределение. */
export type SettingsDocument = Readonly<Record<string, unknown>>;

export type ResolvedSettings = {
  readonly values: ReadonlyMap<string, unknown>;
  readonly issues: readonly SettingsIssue[];
};

const isServiceKey = (key: string) => key.startsWith('$') || key === 'version';

/** Сырой документ слоя → документ; null/undefined — слой пуст. */
export function toSettingsDocument(
  layer: SettingsLayer,
  raw: unknown,
  issues: SettingsIssue[],
): SettingsDocument {
  if (raw === null || raw === undefined) {
    return {};
  }
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    issues.push({ layer, section: '', message: 'документ настроек должен быть JSON-объектом' });
    return {};
  }
  return raw as SettingsDocument;
}

export function resolveSettings(
  sections: readonly AnySettingsSection[],
  layers: { readonly admin: SettingsDocument; readonly user: SettingsDocument },
  issues: SettingsIssue[] = [],
): ResolvedSettings {
  const known = new Set(sections.map((section) => section.key));
  for (const layer of ['admin', 'user'] as const) {
    for (const key of Object.keys(layers[layer])) {
      if (!known.has(key) && !isServiceKey(key)) {
        issues.push({ layer, section: key, message: 'неизвестная секция настроек' });
      }
    }
  }

  const values = new Map<string, unknown>();
  for (const section of sections) {
    let value = section.defaults;
    for (const layer of ['admin', 'user'] as const) {
      if (!(section.key in layers[layer])) {
        continue;
      }
      if (layer === 'user' && section.scope !== 'user') {
        issues.push({ layer, section: section.key, message: 'секцию переопределяет только администратор' });
        continue;
      }
      try {
        value = section.apply(value, layers[layer][section.key]);
      } catch (error) {
        issues.push({
          layer,
          section: section.key,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
    values.set(section.key, value);
  }
  return { values, issues };
}
