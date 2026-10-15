import { ServiceGraphSchema, type ServiceGraph } from '@domain/model/service-graph';
import { migrateGraphRecord } from './graph-record-migration';

// Запись карты (из IndexedDB или файла проекта) → валидный граф: миграция
// старых версий формата (ревью A11), затем Zod-схема. Повреждённая запись
// не попадает в редактор молча — ошибка с первым нарушением схемы.
export function parseServiceGraph(raw: unknown): ServiceGraph {
  const parsed = ServiceGraphSchema.safeParse(migrateGraphRecord(raw));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue && issue.path.length > 0 ? ` (${issue.path.join('.')}: ${issue.message})` : '';
    throw new Error(`Карта повреждена или устарела и не может быть загружена${where}`);
  }
  return parsed.data;
}
