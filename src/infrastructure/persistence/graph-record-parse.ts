import { ServiceGraphSchema, type ServiceGraph } from '@domain/model/service-graph';
import { migrateGraphRecord, replaceLegacyKinds } from './graph-record-migration';

/** Устаревший kind элемента → актуальный (из схем фреймворка, container.ts). */
export type LegacyKinds = Readonly<Record<string, string>>;

// Запись карты (из IndexedDB или файла проекта) → валидный граф: миграция
// старых версий формата (ревью A11), замена устаревших kind, затем Zod-схема.
// Повреждённая запись не попадает в редактор молча — ошибка с первым нарушением схемы.
export function parseServiceGraph(raw: unknown, legacyKinds: LegacyKinds): ServiceGraph {
  const parsed = ServiceGraphSchema.safeParse(replaceLegacyKinds(migrateGraphRecord(raw), legacyKinds));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue && issue.path.length > 0 ? ` (${issue.path.join('.')}: ${issue.message})` : '';
    throw new Error(`Карта повреждена или устарела и не может быть загружена${where}`);
  }
  return parsed.data;
}
