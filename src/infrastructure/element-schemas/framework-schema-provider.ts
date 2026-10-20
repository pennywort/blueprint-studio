import {
  SchemaNotFoundError,
  type ElementSchema,
  type IElementSchemaProvider,
} from '@application/ports/element-schema-provider';
import type { CanvasElementKind } from '@domain/model/canvas-element';
import { assembleElementSchemas, type SchemaSources } from './assemble-element-schemas';

// Адаптер порта IElementSchemaProvider (этап 3 docs/schemas/PLAN.md): схемы
// фреймворка (копия пакета — `npm run schemas:import`: элементы и компоненты),
// схемы проекта (комментарий) и политика редактора собираются в описания
// элементов при старте. Сломанная политика или несовместимая версия формата
// падают сразу, а не при первом обращении (критерий приёма 6 спеки 001).
// Переход на npm-пакет схем меняет только источник JSON в container.ts.

export class FrameworkSchemaProvider implements IElementSchemaProvider {
  private readonly schemas: readonly ElementSchema[];
  private readonly byKind: ReadonlyMap<string, ElementSchema>;

  // Деструктуризация в конструкторе обязательна: Awilix PROXY (конституция,
  // железное правило 7). Сырые JSON — параметр (inject в container.ts).
  constructor({ sources }: { sources: SchemaSources }) {
    this.schemas = assembleElementSchemas(sources);
    this.byKind = new Map(this.schemas.map((schema) => [schema.kind, schema]));
  }

  getSchema(kind: CanvasElementKind): ElementSchema {
    const schema = this.byKind.get(kind);
    if (!schema) {
      throw new SchemaNotFoundError(kind);
    }
    return schema;
  }

  listSchemas(): readonly ElementSchema[] {
    return this.schemas;
  }
}
