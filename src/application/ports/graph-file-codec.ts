import type { ServiceGraph } from '@domain/model/service-graph';

// Файл проекта (JSON) [owner 2026-10-15]: экспорт текущего графа и импорт
// из файла. Формат записи и миграции старых версий — забота адаптера
// (infrastructure/persistence, ревью A11), редактор видит только граф.
export interface IGraphFileCodec {
  /** Граф → текст файла проекта. */
  serialize(graph: ServiceGraph): string;
  /** Текст файла → валидный граф; ошибка с человекочитаемым сообщением, если файл не карта. */
  parse(text: string): ServiceGraph;
}
