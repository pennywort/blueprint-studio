import type { IGraphFileCodec } from '@application/ports/graph-file-codec';
import type { ServiceGraph } from '@domain/model/service-graph';
import { toGraphRecord } from './graph-record-migration';
import { parseServiceGraph } from './graph-record-parse';

// Файл проекта [owner 2026-10-15] — та же запись, что лежит в IndexedDB
// (граф + schemaVersion), в виде JSON с отступами: файл читается глазами и
// диффается. Импорт идёт через те же миграции, что и чтение хранилища.
export class JsonGraphFileCodec implements IGraphFileCodec {
  serialize(graph: ServiceGraph): string {
    return `${JSON.stringify(toGraphRecord(graph), null, 2)}\n`;
  }

  parse(text: string): ServiceGraph {
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      throw new Error('Файл не является JSON');
    }
    return parseServiceGraph(raw);
  }
}
