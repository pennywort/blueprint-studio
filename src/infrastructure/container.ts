import { asClass, asValue, createContainer, InjectionMode, type AwilixContainer } from 'awilix';
import type { ServiceGraph } from '@domain/model/service-graph';
import type { IElementSchemaProvider } from '@application/ports/element-schema-provider';
import type { IIdGenerator } from '@application/ports/id-generator';
import type { IClock } from '@application/ports/clock';
import type { IGraphRepository } from '@application/ports/graph-repository';
import type { IGraphFileCodec } from '@application/ports/graph-file-codec';
import type { IAdminSettingsSource, IUserSettingsStorage } from '@application/ports/settings-sources';
import type { AnySettingsSection } from '@application/settings/settings-section';
import { EditorSettings } from '@application/settings/editor-settings';
import { rulesSettings } from '@application/settings/rules-settings';
import { CommandBus } from '@application/commands/command-bus';
import { FrameworkSchemaProvider } from './element-schemas/framework-schema-provider';
import { legacyKindReplacements } from './element-schemas/assemble-element-schemas';
import { editorPolicySettings } from './element-schemas/editor-policy-settings';
import type { LegacyKinds } from './persistence/graph-record-parse';
import frameworkSchemasJson from './element-schemas/framework/schemas-bundle.json';
import { UuidIdGenerator } from './misc/uuid-id-generator';
import { SystemClock } from './misc/system-clock';
import { IndexedDbGraphRepository } from './persistence/indexed-db-graph-repository';
import { JsonGraphFileCodec } from './persistence/json-graph-file-codec';
import {
  HttpAdminSettingsSource,
  type HttpAdminSettingsOptions,
} from './settings/http-admin-settings-source';
import { LocalStorageUserSettingsStorage } from './settings/local-storage-user-settings-storage';

// Composition root (конституция, железные правила 6–7):
// единственный контейнер, создаётся явно вызовом buildContainer() в bootstrap.tsx.
// Только InjectionMode.PROXY + конструкторы с деструктуризацией: CLASSIC-режим
// ломается минификацией production-сборки.

export interface Cradle {
  idGenerator: IIdGenerator;
  clock: IClock;
  elementSchemaProvider: IElementSchemaProvider;
  legacyKinds: LegacyKinds;
  commandBus: CommandBus;
  graphRepository: IGraphRepository;
  // Экспорт/импорт файла проекта JSON [owner 2026-10-15].
  graphFileCodec: IGraphFileCodec;
  // Настройки редактора (R-ADM, [owner 2026-10-22]): секции владельцев,
  // слой администратора (для всех) и слой пользователя (свои хоткеи и т. п.).
  settingsSections: readonly AnySettingsSection[];
  adminSettingsOptions: HttpAdminSettingsOptions;
  adminSettingsSource: IAdminSettingsSource;
  userSettingsStorage: IUserSettingsStorage;
  editorSettings: EditorSettings;
  // Начальный граф редактора, пока карта не загружена из хранилища: по
  // projectId из роута — демо-граф, нагрузочный граф (проект «Стенд
  // производительности») или пустой граф сохранённого проекта; search —
  // query роута с параметрами размера графа.
  graphSeed: GraphSeed;
}

export type GraphSeed = (projectId: string | null, search: string) => ServiceGraph;

export type ContainerOptions = {
  graphSeed: GraphSeed;
  /** Где лежат настройки администратора и как часто их перечитывать (R-ADM). */
  adminSettings: HttpAdminSettingsOptions;
  /**
   * Секции слоя presentation (хоткеи…): composition root их не импортирует
   * (границы слоёв), их передаёт bootstrap.
   */
  settingsSections: readonly AnySettingsSection[];
};

export function buildContainer(options: ContainerOptions): AwilixContainer<Cradle> {
  const container = createContainer<Cradle>({ injectionMode: InjectionMode.PROXY, strict: true });

  container.register({
    idGenerator: asClass(UuidIdGenerator).singleton(),
    clock: asClass(SystemClock).singleton(),
    // Описания элементов — из схем и секции настроек editorPolicy (R-ADM;
    // порядок меню добавления — порядок политики).
    elementSchemaProvider: asClass(FrameworkSchemaProvider).singleton(),
    // Замены устаревших kind (x-replaced-by схем фреймворка) — для загрузки карт
    legacyKinds: asValue(legacyKindReplacements(frameworkSchemasJson)),
    commandBus: asClass(CommandBus).singleton(),
    graphRepository: asClass(IndexedDbGraphRepository).singleton(),
    graphFileCodec: asClass(JsonGraphFileCodec).singleton(),
    // Порядок секций — порядок разделов будущей панели настроек.
    settingsSections: asValue([rulesSettings, editorPolicySettings, ...options.settingsSections]),
    adminSettingsOptions: asValue(options.adminSettings),
    // Сейчас — файл public/config; бэкенд — тот же адаптер с другим URL
    // (или новый адаптер порта), остальной код не меняется.
    adminSettingsSource: asClass(HttpAdminSettingsSource).singleton(),
    userSettingsStorage: asClass(LocalStorageUserSettingsStorage).singleton(),
    editorSettings: asClass(EditorSettings).singleton(),
    graphSeed: asValue(options.graphSeed),
  });

  return container;
}
