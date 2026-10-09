import type { FormComponentKind } from '@domain/model/form-components';

// Порт доступа к схемам элементов (конституция, железное правило 2).
// Внутренний нормализованный формат — ElementSchema; внешний формат пакета
// element-schemas (lib-app-core) нормализуется адаптером в infrastructure.

export type ElementAttributeType = 'bool' | 'text' | 'number' | 'radio' | 'select' | 'stringList';

export type ElementAttribute = {
  key: string;
  type: ElementAttributeType;
  required: boolean;
};

export type ElementSchema = {
  kind: FormComponentKind;
  version: number;
  attributes: readonly ElementAttribute[];
};

export class SchemaNotFoundError extends Error {
  constructor(public readonly kind: string) {
    super(`Схема элемента не найдена: ${kind}`);
    this.name = 'SchemaNotFoundError';
  }
}

export interface IElementSchemaProvider {
  // Бросает SchemaNotFoundError для неизвестного kind.
  getSchema(kind: FormComponentKind): ElementSchema;
  listSchemas(): readonly ElementSchema[];
}
