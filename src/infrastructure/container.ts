import { asClass, createContainer, InjectionMode, type AwilixContainer } from 'awilix';
import type { IElementSchemaProvider } from '@application/ports/element-schema-provider';
import type { IIdGenerator } from '@application/ports/id-generator';
import type { IClock } from '@application/ports/clock';
import type { IGraphRepository } from '@application/ports/graph-repository';
import { CommandBus } from '@application/commands/command-bus';
import { ManifestSchemaProvider } from './element-schemas/manifest-schema-provider';
import manifestJson from './element-schemas/element-manifest.json';
import pageElementManifestJson from './element-schemas/page-element-manifest.json';
import { UuidIdGenerator } from './misc/uuid-id-generator';
import { SystemClock } from './misc/system-clock';
import { IndexedDbGraphRepository } from './persistence/indexed-db-graph-repository';

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
}

export function buildContainer(): AwilixContainer<Cradle> {
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
  });

  return container;
}
