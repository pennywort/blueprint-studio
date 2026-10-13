import type { CanvasElementKind } from '@domain/model/canvas-element';

// Порт доступа к схемам элементов (конституция, железное правило 2).
// Внутренний нормализованный формат — ElementSchema; внешний формат пакета
// element-schemas (lib-app-core) нормализуется адаптером в infrastructure.

// optionList — массив SelectOption (варианты выбора), linkList — массив
// MarkdownLink (ссылки): структурные списки с собственными редакторами.
export type ElementAttributeType =
  'bool' | 'text' | 'number' | 'radio' | 'select' | 'stringList' | 'optionList' | 'linkList';

export type ElementAttribute = {
  key: string;
  type: ElementAttributeType;
  required: boolean;
};

// Схема — у любого элемента канваса (ADR-17): компоненты форм и List item/
// Widget card (T-041, stub-схемы проекта до пакета element-schemas, ADR-07).
export type ElementSchema = {
  kind: CanvasElementKind;
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
  getSchema(kind: CanvasElementKind): ElementSchema;
  listSchemas(): readonly ElementSchema[];
}
