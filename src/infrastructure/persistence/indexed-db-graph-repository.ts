import type { GraphSummary, IGraphRepository } from '@application/ports/graph-repository';
import type { IClock } from '@application/ports/clock';
import type { ServiceGraph } from '@domain/model/service-graph';
import { BlueprintIdSchema, type BlueprintId } from '@domain/model/ids';
import { toGraphRecord } from './graph-record-migration';
import { parseServiceGraph } from './graph-record-parse';

// Адаптер IGraphRepository поверх IndexedDB (T-053): одна object store,
// ключ — id карты. Запись хранит номер версии формата; при чтении старые
// версии мигрируются (ревью A11), затем валидируются Zod-схемой: повреждённая
// запись не попадает в редактор молча, а даёт ошибку.

const DB_NAME = 'blueprint-studio';
const DB_VERSION = 1;
const STORE = 'graphs';
// Служебное поле записи: время сохранения для списка проектов [owner 2026-10-15].
// Доменная схема его не знает и при чтении отбрасывает.
const SAVED_AT_FIELD = 'savedAt';

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Ошибка IndexedDB'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Операция IndexedDB прервана'));
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Ошибка IndexedDB'));
  });
}

export class IndexedDbGraphRepository implements IGraphRepository {
  private database: Promise<IDBDatabase> | null = null;
  private readonly clock: IClock;

  constructor({ clock }: { clock: IClock }) {
    this.clock = clock;
  }

  private open(): Promise<IDBDatabase> {
    if (!this.database) {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE)) {
          request.result.createObjectStore(STORE, { keyPath: 'id' });
        }
      };
      this.database = requestToPromise(request);
      // Неудачное открытие не кэшируется — следующая попытка откроет заново.
      this.database.catch(() => {
        this.database = null;
      });
    }
    return this.database;
  }

  async load(blueprintId: BlueprintId): Promise<ServiceGraph | null> {
    const database = await this.open();
    const raw: unknown = await requestToPromise(
      database.transaction(STORE, 'readonly').objectStore(STORE).get(blueprintId),
    );
    return raw === undefined ? null : parseServiceGraph(raw);
  }

  async save(graph: ServiceGraph): Promise<void> {
    const database = await this.open();
    const transaction = database.transaction(STORE, 'readwrite');
    transaction
      .objectStore(STORE)
      .put({ ...toGraphRecord(graph), [SAVED_AT_FIELD]: this.clock.now().toISOString() });
    await transactionDone(transaction);
  }

  async list(): Promise<GraphSummary[]> {
    const database = await this.open();
    const records: unknown[] = await requestToPromise(
      database.transaction(STORE, 'readonly').objectStore(STORE).getAll(),
    );
    return records
      .flatMap((record): GraphSummary[] => {
        if (typeof record !== 'object' || record === null) {
          return [];
        }
        const { id, title, [SAVED_AT_FIELD]: savedAt } = record as Record<string, unknown>;
        const parsedId = BlueprintIdSchema.safeParse(id);
        if (!parsedId.success) {
          return [];
        }
        return [
          {
            id: parsedId.data,
            title: typeof title === 'string' && title ? title : 'Без названия',
            savedAt: typeof savedAt === 'string' ? savedAt : null,
          },
        ];
      })
      .sort((left, right) => (right.savedAt ?? '').localeCompare(left.savedAt ?? ''));
  }

  async remove(blueprintId: BlueprintId): Promise<void> {
    const database = await this.open();
    const transaction = database.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).delete(blueprintId);
    await transactionDone(transaction);
  }
}
