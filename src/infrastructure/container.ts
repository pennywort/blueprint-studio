import { asClass, asValue, createContainer, InjectionMode, type AwilixContainer } from 'awilix';
import type { ServiceGraph } from '@domain/model/service-graph';
import type { IElementSchemaProvider } from '@application/ports/element-schema-provider';
import type { IIdGenerator } from '@application/ports/id-generator';
import type { IClock } from '@application/ports/clock';
import type { IGraphRepository } from '@application/ports/graph-repository';
import type { IGraphFileCodec } from '@application/ports/graph-file-codec';
import type { IKeybindingsStorage } from '@application/ports/keybindings-storage';
import { CommandBus } from '@application/commands/command-bus';
import { ManifestSchemaProvider } from './element-schemas/manifest-schema-provider';
import manifestJson from './element-schemas/element-manifest.json';
import pageElementManifestJson from './element-schemas/page-element-manifest.json';
import { UuidIdGenerator } from './misc/uuid-id-generator';
import { SystemClock } from './misc/system-clock';
import { IndexedDbGraphRepository } from './persistence/indexed-db-graph-repository';
import { JsonGraphFileCodec } from './persistence/json-graph-file-codec';
import { LocalStorageKeybindingsStorage } from './persistence/local-storage-keybindings-storage';

// Composition root (конституция, железные правила 6–7):
// единственный контейнер, создаётся явно вызовом buildContainer() в bootstrap.tsx.
// Только InjectionMode.PROXY + конструкторы с деструктуризацией: CLASSIC-режим
// ломается минификацией production-сборки.

export interface Cradle {
  idGenerator: IIdGenerator;
  clock: IClock;
  elementSchemaProvider: IElementSchemaProvider;
  commandBus: CommandBus;
  graphRepository: IGraphRepository;
  // Экспорт/импорт файла проекта JSON [owner 2026-10-15].
  graphFileCodec: IGraphFileCodec;
  // Пользовательские хоткеи поверх умолчаний [owner 2026-10-15].
  keybindingsStorage: IKeybindingsStorage;
  // Начальный граф редактора, пока карта не загружена из хранилища: по
  // projectId из роута — демо-граф, нагрузочный граф (проект «Стенд
  // производительности») или пустой граф сохранённого проекта; search —
  // query роута с параметрами размера графа.
  graphSeed: GraphSeed;
}

export type GraphSeed = (projectId: string | null, search: string) => ServiceGraph;

export type ContainerOptions = {
  graphSeed: GraphSeed;
};

export function buildContainer(options: ContainerOptions): AwilixContainer<Cradle> {
  const container = createContainer<Cradle>({ injectionMode: InjectionMode.PROXY, strict: true });

  container.register({
    idGenerator: asClass(UuidIdGenerator).singleton(),
    clock: asClass(SystemClock).singleton(),
    // Манифест передаётся через inject: иначе PROXY-режим подставит cradle-proxy
    // первым аргументом конструктора вместо данных. Stub-схемы List item/
    // Widget card (T-041, ADR-07) — первыми: порядок меню добавления.
    elementSchemaProvider: asClass(ManifestSchemaProvider)
      .inject(() => ({ rawManifest: [...pageElementManifestJson, ...manifestJson] }))
      .singleton(),
    commandBus: asClass(CommandBus).singleton(),
    graphRepository: asClass(IndexedDbGraphRepository).singleton(),
    graphFileCodec: asClass(JsonGraphFileCodec).singleton(),
    keybindingsStorage: asClass(LocalStorageKeybindingsStorage).singleton(),
    graphSeed: asValue(options.graphSeed),
  });

  return container;
}
