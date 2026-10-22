import type { IUserSettingsStorage } from '@application/ports/settings-sources';

// Адаптер личных настроек пользователя (R-ADM) поверх localStorage: документ
// `{ "<секция>": переопределение }` под одним ключом. Заменил отдельное
// хранилище хоткеев (система хоткеев [owner 2026-10-15]): хоткеи — секция
// `keybindings` этого документа, старый ключ переносится при первом чтении.
// Хранилище недоступно (приватный режим, запрет сайта) или запись битая —
// работаем на общих настройках, а не падаем.
const STORAGE_KEY = 'blueprint-studio.settings';
const LEGACY_KEYBINDINGS_KEY = 'blueprint-studio.keybindings';

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function readJson(key: string): unknown {
  const raw = storage()?.getItem(key);
  return raw ? (JSON.parse(raw) as unknown) : null;
}

export class LocalStorageUserSettingsStorage implements IUserSettingsStorage {
  load(): unknown {
    try {
      const document = readJson(STORAGE_KEY);
      if (document !== null) {
        return document;
      }
      const keybindings = readJson(LEGACY_KEYBINDINGS_KEY);
      return keybindings === null ? null : { keybindings };
    } catch {
      return null;
    }
  }

  save(raw: unknown): void {
    try {
      storage()?.setItem(STORAGE_KEY, JSON.stringify(raw, null, 2));
      storage()?.removeItem(LEGACY_KEYBINDINGS_KEY);
    } catch {
      // Нет хранилища — переопределения живут до перезагрузки страницы.
    }
  }
}
