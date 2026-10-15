import type { IKeybindingsStorage } from '@application/ports/keybindings-storage';

// Адаптер IKeybindingsStorage поверх localStorage (система хоткеев [owner
// 2026-10-15]): пользовательские переопределения — JSON под одним ключом.
// Хранилище недоступно (приватный режим, запрет сайта) или запись битая —
// работаем на хоткеях по умолчанию, а не падаем.
const STORAGE_KEY = 'blueprint-studio.keybindings';

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export class LocalStorageKeybindingsStorage implements IKeybindingsStorage {
  load(): unknown {
    try {
      const raw = storage()?.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as unknown) : null;
    } catch {
      return null;
    }
  }

  save(keybindings: unknown): void {
    try {
      storage()?.setItem(STORAGE_KEY, JSON.stringify(keybindings, null, 2));
    } catch {
      // Нет хранилища — переопределения живут до перезагрузки страницы.
    }
  }
}
