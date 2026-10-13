import type { IGraphRepository } from '@application/ports/graph-repository';
import { ServiceGraphSchema, type ServiceGraph } from '@domain/model/service-graph';
import type { BlueprintId } from '@domain/model/ids';

// Адаптер IGraphRepository поверх IndexedDB (T-053): одна object store,
// ключ — id карты. Данные валидируются Zod-схемой при чтении: повреждённая
// или устаревшая запись не попадает в редактор молча, а даёт ошибку.

const DB_NAME = 'blueprint-studio';
const DB_VERSION = 1;
const STORE = 'graphs';

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Ошибка IndexedDB'));
  });
}

export class IndexedDbGraphRepository implements IGraphRepository {
  private database: Promise<IDBDatabase> | null = null;

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
    if (raw === undefined) {
      return null;
    }
    const parsed = ServiceGraphSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error('Сохранённая карта повреждена или устарела и не может быть загружена');
    }
    return parsed.data;
  }

  async save(graph: ServiceGraph): Promise<void> {
    const database = await this.open();
    const transaction = database.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).put(graph);
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('Ошибка сохранения в IndexedDB'));
      transaction.onabort = () => reject(transaction.error ?? new Error('Сохранение прервано'));
    });
  }
}
