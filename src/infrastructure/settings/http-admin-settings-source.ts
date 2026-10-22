import type { IAdminSettingsSource } from '@application/ports/settings-sources';

// Адаптер слоя администратора (R-ADM, [owner 2026-10-22]): документ
// настроек по HTTP. Сейчас URL — JSON-файл рядом со сборкой
// (public/config/editor-settings.json): правка файла на стенде применяется у
// всех пользователей без пересборки. Бэкенд отдаст тот же документ JSON-
// строкой из базы — достаточно сменить URL в bootstrap: тело-строка
// разбирается вторым JSON.parse.
//
// На лету: опрос раз в pollIntervalMs; подписчик получает документ, только
// если текст ответа изменился. Без записи в `window` (конституция §7):
// fetch и таймеры — из globalThis.

export type HttpAdminSettingsOptions = {
  /** Адрес документа; относительный — от страницы редактора. */
  url: string;
  /** Период опроса изменений; 0 — не следить. */
  pollIntervalMs: number;
};

export class HttpAdminSettingsSource implements IAdminSettingsSource {
  private lastText: string | null = null;

  // Деструктуризация в конструкторе обязательна: Awilix PROXY (конституция,
  // железное правило 7). Опции — через inject в container.ts.
  constructor(private readonly deps: { adminSettingsOptions: HttpAdminSettingsOptions }) {}

  async load(): Promise<unknown> {
    const text = await this.fetchText();
    this.lastText = text;
    return decode(text);
  }

  watch(onChange: (raw: unknown) => void): () => void {
    const { pollIntervalMs } = this.deps.adminSettingsOptions;
    if (pollIntervalMs <= 0) {
      return () => {};
    }
    const timer = globalThis.setInterval(() => {
      this.fetchText().then(
        (text) => {
          if (text === this.lastText) {
            return;
          }
          this.lastText = text;
          try {
            onChange(decode(text));
          } catch {
            // Битый JSON при правке файла — остаются прежние настройки;
            // ошибку покажет следующая загрузка редактора (load).
          }
        },
        // Сеть недоступна — остаются прежние настройки, следующий опрос повторит.
        () => {},
      );
    }, pollIntervalMs);
    return () => globalThis.clearInterval(timer);
  }

  // Нет файла (404) — администратор ничего не переопределял: пустой документ.
  private async fetchText(): Promise<string | null> {
    const response = await globalThis.fetch(this.deps.adminSettingsOptions.url, { cache: 'no-store' });
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.text();
  }
}

// Текст ответа → документ: JSON-объект или JSON-строка с объектом (бэкенд).
// Битый JSON — SyntaxError: load() отдаёт его ядру настроек (issues).
function decode(text: string | null): unknown {
  if (text === null || text.trim() === '') {
    return null;
  }
  const parsed: unknown = JSON.parse(text);
  return typeof parsed === 'string' ? (JSON.parse(parsed) as unknown) : parsed;
}
