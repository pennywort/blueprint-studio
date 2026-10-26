import {
  SchemaNotFoundError,
  type ElementSchema,
  type IElementSchemaProvider,
} from '@application/ports/element-schema-provider';
import type { EditorSettings } from '@application/settings/editor-settings';
import type { CanvasElementKind } from '@domain/model/canvas-element';
import { assembleElementSchemas } from './assemble-element-schemas';
import { editorPolicySettings, SCHEMA_BUNDLES } from './editor-policy-settings';

// Адаптер порта IElementSchemaProvider (этап 3 docs/schemas/PLAN.md): схемы
// фреймворка (копия пакета — `npm run schemas:import`: элементы и компоненты),
// схемы проекта (комментарий) и политика редактора собираются в описания
// элементов. Политика — секция настроек editorPolicy (R-ADM): умолчание из
// editor-policy.json или политика администратора; сменилась на лету —
// описания пересобираются при следующем обращении. Сломанная встроенная
// политика падает на старте (критерий приёма 6 спеки 001); политика
// администратора проверяется секцией и до провайдера не доходит.
// Переход на npm-пакет схем меняет только источник JSON (editor-policy-settings).

type Assembled = {
  policy: unknown;
  schemas: readonly ElementSchema[];
  byKind: ReadonlyMap<string, ElementSchema>;
};

export class FrameworkSchemaProvider implements IElementSchemaProvider {
  private assembled: Assembled;

  // Деструктуризация в конструкторе обязательна: Awilix PROXY (конституция,
  // железное правило 7).
  constructor(private readonly deps: { editorSettings: EditorSettings }) {
    this.assembled = assemble(editorPolicySettings.defaults);
  }

  getSchema(kind: CanvasElementKind): ElementSchema {
    const schema = this.current().byKind.get(kind);
    if (!schema) {
      throw new SchemaNotFoundError(kind);
    }
    return schema;
  }

  listSchemas(): readonly ElementSchema[] {
    return this.current().schemas;
  }

  // Пересборка только при смене объекта политики: EditorSettings сохраняет
  // объект неизменившейся секции.
  private current(): Assembled {
    const policy = this.deps.editorSettings.get(editorPolicySettings);
    if (policy !== this.assembled.policy) {
      this.assembled = assemble(policy);
    }
    return this.assembled;
  }
}

function assemble(policy: unknown): Assembled {
  const schemas = assembleElementSchemas({ ...SCHEMA_BUNDLES, policy });
  return { policy, schemas, byKind: new Map(schemas.map((schema) => [schema.kind, schema])) };
}
