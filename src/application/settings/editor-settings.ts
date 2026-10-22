import type { IAdminSettingsSource, IUserSettingsStorage } from '@application/ports/settings-sources';
import type { AnySettingsSection, SettingsSection } from './settings-section';
import {
  resolveSettings,
  toSettingsDocument,
  type SettingsDocument,
  type SettingsIssue,
} from './resolve-settings';

// Действующие настройки редактора (R-ADM, [owner 2026-10-22]) — singleton
// DI-контейнера. Единственный читатель слоёв: команды (CommandBus), провайдер
// схем элементов, хоткеи и UI берут значения секций отсюда. Смена любого
// слоя (администратор поменял файл/базу, пользователь — свои хоткеи) даёт
// новый снимок и уведомляет подписчиков — правила применяются на лету, без
// перезагрузки и пересборки.

/** Неизменяемый снимок: новый объект на каждое изменение (useSyncExternalStore). */
export type SettingsSnapshot = {
  readonly revision: number;
  readonly values: ReadonlyMap<string, unknown>;
  /** Документы слоёв как есть — для панели настроек (что переопределено). */
  readonly admin: SettingsDocument;
  readonly user: SettingsDocument;
  readonly issues: readonly SettingsIssue[];
};

type Deps = {
  settingsSections: readonly AnySettingsSection[];
  adminSettingsSource: IAdminSettingsSource;
  userSettingsStorage: IUserSettingsStorage;
};

export class EditorSettings {
  private readonly sections: readonly AnySettingsSection[];
  private readonly adminSource: IAdminSettingsSource;
  private readonly userStorage: IUserSettingsStorage;
  private readonly listeners = new Set<() => void>();
  private rawAdmin: unknown = null;
  private rawUser: unknown;
  private current: SettingsSnapshot;

  // Деструктуризация в конструкторе обязательна: Awilix PROXY (конституция,
  // железное правило 7). До load() действуют умолчания и слой пользователя.
  constructor({ settingsSections, adminSettingsSource, userSettingsStorage }: Deps) {
    const keys = settingsSections.map((section) => section.key);
    const duplicate = keys.find((key, index) => keys.indexOf(key) !== index);
    if (duplicate !== undefined) {
      throw new Error(`Секция настроек объявлена дважды: ${duplicate}`);
    }
    this.sections = settingsSections;
    this.adminSource = adminSettingsSource;
    this.userStorage = userSettingsStorage;
    this.rawUser = userSettingsStorage.load();
    this.current = this.resolve(0);
  }

  /** Значение секции по действующим слоям. */
  get<T>(section: SettingsSection<T>): T {
    if (!this.current.values.has(section.key)) {
      throw new Error(`Секция настроек не зарегистрирована: ${section.key}`);
    }
    return this.current.values.get(section.key) as T;
  }

  snapshot(): SettingsSnapshot {
    return this.current;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Загрузить слой администратора (старт редактора). Ошибка сети — работают умолчания. */
  async load(): Promise<void> {
    try {
      this.applyAdmin(await this.adminSource.load());
    } catch (error) {
      this.publish([{ layer: 'admin', section: '', message: `не загружены: ${String(error)}` }]);
    }
  }

  /** Применять изменения администратора на лету. Возвращает отписку. */
  watch(): () => void {
    return this.adminSource.watch((raw) => this.applyAdmin(raw));
  }

  /**
   * Переопределение пользователя для секции (undefined — вернуть общее
   * значение). Секцию со scope `admin` пользователь не меняет.
   */
  setUserOverride(section: AnySettingsSection, override: unknown): void {
    if (section.scope !== 'user') {
      throw new Error(`Секцию «${section.title}» переопределяет только администратор`);
    }
    const document: Record<string, unknown> = { ...toSettingsDocument('user', this.rawUser, []) };
    if (override === undefined) {
      delete document[section.key];
    } else {
      document[section.key] = override;
    }
    this.rawUser = document;
    this.userStorage.save(document);
    this.publish();
  }

  /** Все зарегистрированные секции — для панели настроек. */
  listSections(): readonly AnySettingsSection[] {
    return this.sections;
  }

  private applyAdmin(raw: unknown): void {
    this.rawAdmin = raw;
    this.publish();
  }

  private resolve(revision: number, extraIssues: readonly SettingsIssue[] = []): SettingsSnapshot {
    const issues: SettingsIssue[] = [...extraIssues];
    const admin = toSettingsDocument('admin', this.rawAdmin, issues);
    const user = toSettingsDocument('user', this.rawUser, issues);
    const { values } = resolveSettings(this.sections, { admin, user }, issues);
    // Неизменившаяся секция сохраняет прежний объект: подписчики по
    // значению секции (useMemo, кэш провайдера схем) не пересчитываются.
    const previous = this.current as SettingsSnapshot | undefined;
    const stable = new Map(
      [...values].map(([key, value]) => {
        const old = previous?.values.get(key);
        return [key, old !== undefined && JSON.stringify(old) === JSON.stringify(value) ? old : value];
      }),
    );
    return { revision, values: stable, admin, user, issues };
  }

  private publish(extraIssues: readonly SettingsIssue[] = []): void {
    this.current = this.resolve(this.current.revision + 1, extraIssues);
    for (const listener of this.listeners) {
      listener();
    }
  }
}
