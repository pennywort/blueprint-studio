import { z } from 'zod';
import { ApplicationFormIdSchema, ElementIdSchema, PageLinkIdSchema, ScenarioIdSchema } from './ids';

// Связь на канвасе (Epic 002, T-004): ребро от элемента страницы к странице-цели.
//
// - Источник — конкретный элемент (карточка со source-handle на правом краю, D9),
//   а не узел целиком.
// - Цель — страница МИПа: подсценарий (D13) или форма заявки — форма участвует
//   в слоях на общих основаниях и может иметь входящие связи (D12).
// - Связь — самостоятельная сущность со стабильным id: оба конца переназначаются
//   в любой момент (reconnect, D7/D13) обновлением полей, без пересоздания сущности.
// - Координат здесь нет и не будет: раскладка вычисляется layout-движком из графа
//   связей (D2), персистентен только orderIndex страниц.

export const PageLinkTargetIdSchema = z.union([ScenarioIdSchema, ApplicationFormIdSchema]);
export type PageLinkTargetId = z.infer<typeof PageLinkTargetIdSchema>;

export const PageLinkSchema = z.object({
  id: PageLinkIdSchema,
  sourceElementId: ElementIdSchema,
  targetId: PageLinkTargetIdSchema,
});
export type PageLink = z.infer<typeof PageLinkSchema>;
