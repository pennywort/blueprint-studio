import type { ServiceGraph } from '@domain/model/service-graph';
import type { BlueprintId } from '@domain/model/ids';

// Краткая запись карты для списка проектов [owner 2026-10-15]: без чтения
// и валидации всего графа.
export type GraphSummary = {
  id: BlueprintId;
  title: string;
  /** ISO-время последнего сохранения; null — запись сохранена до появления поля. */
  savedAt: string | null;
};

// Порт хранения карты (T-053, конституция — железное правило 2): редактор
// не знает, где лежит граф. Сейчас адаптер — IndexedDB браузера; серверное
// хранилище по контракту (Q-5, handoff §5.6) подключается новым адаптером.
export interface IGraphRepository {
  /** Сохранённая карта; null — карта ещё не сохранялась. */
  load(blueprintId: BlueprintId): Promise<ServiceGraph | null>;
  save(graph: ServiceGraph): Promise<void>;
  /** Все сохранённые карты, сначала свежие [owner 2026-10-15]. */
  list(): Promise<GraphSummary[]>;
  remove(blueprintId: BlueprintId): Promise<void>;
}
