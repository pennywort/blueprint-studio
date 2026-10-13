import { z } from 'zod';
import { ElementIdSchema } from './ids';

// Ссылки на иконки/изображения — строковые ключи из перечня платформы (БТ 6.1).
export const IconRefSchema = z.string();
export type IconRef = z.infer<typeof IconRefSchema>;
export const ImageRefSchema = z.string();
export type ImageRef = z.infer<typeof ImageRefSchema>;

// Общие поля любого элемента карты [owner 2026-10-13]: элементы равноправны —
// List item, Widget card, кнопка, Select… отличаются только своими атрибутами
// и живут в любом контейнере (Главная, подсценарий, шаг формы).
export const elementCommonFields = {
  // Стабильный id: элемент — источник связи на канвасе (Epic 002, T-004/D9).
  id: ElementIdSchema,
  // Явная колонка элемента внутри шага формы (ADR-16): перенос dnd в другую
  // колонку и закрепление элемента, потерявшего правило (ADR-15); без него
  // колонка — производная правил «Сложной логики» (step-element-depths).
  // Метаданные раскладки редактора, не часть element-schemas движка (D4).
  layerDepth: z.number().int().nonnegative().optional(),
};
