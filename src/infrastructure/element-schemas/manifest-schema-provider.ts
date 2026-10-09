import { z } from 'zod';
import {
  SchemaNotFoundError,
  type ElementSchema,
  type IElementSchemaProvider,
} from '@application/ports/element-schema-provider';
import type { FormComponentKind } from '@domain/model/form-components';
import manifestJson from './element-manifest.json';

// Stub-адаптер порта IElementSchemaProvider: читает JSON-манифест из репозитория.
// Когда появится доступ к реальному пакету element-schemas (lib-app-core),
// этот адаптер заменяется новым — внутренний формат ElementSchema не меняется
// (конституция, железное правило 2).

const ManifestEntrySchema = z.object({
  kind: z.string(),
  version: z.number().int().positive(),
  attributes: z.array(
    z.object({
      key: z.string().min(1),
      type: z.enum(['bool', 'text', 'number', 'radio', 'select', 'stringList']),
      required: z.boolean(),
    }),
  ),
});

const ManifestSchema = z.array(ManifestEntrySchema).min(1);

export class ManifestSchemaProvider implements IElementSchemaProvider {
  private readonly schemas = new Map<string, ElementSchema>();

  // Деструктуризация в конструкторе обязательна: Awilix PROXY (конституция,
  // железное правило 7). Сырые данные — параметр, чтобы контрактные тесты
  // могли подсовывать сломанный манифест без манипуляций с файлами.
  constructor({ rawManifest }: { rawManifest?: unknown } = {}) {
    // Манифест валидируется при старте: сломанный файл должен падать сразу,
    // а не в момент первого обращения (критерий приёма 6 спеки 001).
    const parsed = ManifestSchema.parse(rawManifest ?? manifestJson);
    parsed.forEach((entry) => {
      this.schemas.set(entry.kind, {
        kind: entry.kind as FormComponentKind,
        version: entry.version,
        attributes: entry.attributes,
      });
    });
  }

  getSchema(kind: FormComponentKind): ElementSchema {
    const schema = this.schemas.get(kind);
    if (!schema) {
      throw new SchemaNotFoundError(kind);
    }
    return schema;
  }

  listSchemas(): readonly ElementSchema[] {
    return [...this.schemas.values()];
  }
}
