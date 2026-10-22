// Секция настроек редактора (R-ADM, [owner 2026-10-22]): единица, которую
// можно включить, отключить или переопределить без правки кода. Секцию
// объявляет модуль-владелец рядом со своими умолчаниями (правила домена,
// политика элементов, хоткеи); ядро настроек о содержимом секций не знает —
// новая настройка = новая секция, ядро не правится (Open/Closed).
//
// Слои значений (resolve-settings): умолчания ← администратор (для всех
// пользователей стенда) ← пользователь (только секции со scope `user`).

/**
 * Кто может переопределять секцию:
 * - `admin` — только администратор, для всех пользователей;
 * - `user` — администратор и пользователь (свои значения поверх общих).
 */
export type SettingsScope = 'admin' | 'user';

export interface SettingsSection<T> {
  /** Ключ секции в документе настроек (`{ "rules": …, "keybindings": … }`). */
  readonly key: string;
  /** Название для панели настроек и сообщений об ошибках. */
  readonly title: string;
  readonly scope: SettingsScope;
  readonly defaults: T;
  /**
   * Наложить переопределение слоя на значение. Бросает Error с понятным
   * текстом, если переопределение неверно: слой тогда не применяется к
   * секции, остаётся прежнее значение.
   */
  apply(base: T, override: unknown): T;
}

/** Секция без типа значения — для реестра секций и ядра. */
export type AnySettingsSection = SettingsSection<unknown>;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Глубокое слияние переопределения: объекты сливаются по ключам, массивы и
 * значения заменяются целиком, `null` удаляет ключ (снять лимит = `null`).
 */
export function deepMerge(base: unknown, override: unknown): unknown {
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return override;
  }
  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value === null) {
      delete result[key];
    } else {
      result[key] = deepMerge(base[key], value);
    }
  }
  return result;
}

type SectionHead<T> = Pick<SettingsSection<T>, 'key' | 'title' | 'scope' | 'defaults'>;

/**
 * Секция-объект: переопределение сливается с текущим значением (deepMerge),
 * результат проверяет parse (zod-схема владельца). Частичное переопределение —
 * только изменённые поля.
 */
export function mergeSection<T>(head: SectionHead<T> & { parse(raw: unknown): T }): SettingsSection<T> {
  return {
    key: head.key,
    title: head.title,
    scope: head.scope,
    defaults: head.defaults,
    apply: (base, override) => head.parse(deepMerge(base, override)),
  };
}

/**
 * Секция-список с дописыванием (как keybindings.json VS Code): записи слоя
 * идут после записей нижних слоёв, при совпадении побеждает последняя.
 * parseItems отбрасывает битые записи по одной, а не весь слой.
 */
export function appendSection<Item>(
  head: SectionHead<readonly Item[]> & { parseItems(raw: unknown): readonly Item[] },
): SettingsSection<readonly Item[]> {
  return {
    key: head.key,
    title: head.title,
    scope: head.scope,
    defaults: head.defaults,
    apply: (base, override) => {
      if (!Array.isArray(override)) {
        throw new Error('ожидается массив записей');
      }
      return [...base, ...head.parseItems(override)];
    },
  };
}

/**
 * Секция с заменой целиком: переопределение — полное значение (порядок и
 * состав важны, как у политики элементов). parse проверяет его.
 */
export function replaceSection<T>(head: SectionHead<T> & { parse(raw: unknown): T }): SettingsSection<T> {
  return {
    key: head.key,
    title: head.title,
    scope: head.scope,
    defaults: head.defaults,
    apply: (_base, override) => head.parse(override),
  };
}
