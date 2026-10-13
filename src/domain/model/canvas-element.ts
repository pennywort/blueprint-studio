import { z } from 'zod';
import { ElementIdSchema } from './ids';
import { FormComponentSchema, type FormComponentKind } from './form-components';

// Универсальный элемент канваса [owner 2026-10-13: «элемент может быть в
// любом блоке»]: List item, Widget card и 12 форм-компонентов — один
// discriminated union по `kind`. Любой блок — Главная, подсценарий, шаг
// формы — хранит единый упорядоченный список `elements` этого типа; вид
// блока больше не ограничивает вид элемента (ранее List item/Widget card —
// только страницы, компоненты форм — только шаги, спека 5.1).

// Ссылки на иконки/изображения — строковые ключи из перечня платформы (БТ 6.1).
export const IconRefSchema = z.string();
export type IconRef = z.infer<typeof IconRefSchema>;
export const ImageRefSchema = z.string();
export type ImageRef = z.infer<typeof ImageRefSchema>;

const redirectFields = {
  isRedirect: z.boolean().optional(),
  redirectUrl: z.string().optional(),
};

// Мета-поля редактора, общие с компонентами форм (form-components baseFields):
// комментарий для разработки (D4) и явная колонка внутри шага формы (ADR-16) —
// карточка страницы, перенесённая в шаг, раскладывается по тем же правилам.
const pageElementMetaFields = {
  comment: z.string().optional(),
  layerDepth: z.number().int().nonnegative().optional(),
};

export const ListItemSchema = z.object({
  // Стабильный id: элемент — источник связи на канвасе (Epic 002, T-004/D9).
  id: ElementIdSchema,
  kind: z.literal('listItem'),
  title: z.string(),
  secondaryText: z.string().optional(),
  icon: IconRefSchema.optional(),
  ...redirectFields,
  ...pageElementMetaFields,
});
export type ListItem = z.infer<typeof ListItemSchema>;

export const WidgetCardSchema = z.object({
  id: ElementIdSchema,
  kind: z.literal('widgetCard'),
  title: z.string(),
  secondaryText: z.string().optional(),
  icon: IconRefSchema.optional(),
  image: ImageRefSchema.optional(),
  ...redirectFields,
  ...pageElementMetaFields,
});
export type WidgetCard = z.infer<typeof WidgetCardSchema>;

export const CanvasElementSchema = z.discriminatedUnion('kind', [
  ListItemSchema,
  WidgetCardSchema,
  ...FormComponentSchema.options,
]);
export type CanvasElement = z.infer<typeof CanvasElementSchema>;
export type CanvasElementKind = CanvasElement['kind'];
export type CanvasElementId = CanvasElement['id'];

// Поле есть в доменной схеме элемента данного вида (в том числе
// необязательное и ещё не заданное) — панель атрибутов показывает его
// пустым, а не скрывает (T-041).
export function hasElementField(kind: CanvasElementKind, key: string): boolean {
  const option = CanvasElementSchema.options.find((candidate) => candidate.shape.kind.value === kind);
  return option !== undefined && Object.prototype.hasOwnProperty.call(option.shape, key);
}

export type PageElementKind = 'listItem' | 'widgetCard';

export function isPageElementKind(kind: CanvasElementKind): kind is PageElementKind {
  return kind === 'listItem' || kind === 'widgetCard';
}

// Kind'ы форм-компонентов — для мест, которым нужен именно компонент формы
// (провайдер схем ADR-07, меню «+» шага).
export function isFormComponentKind(kind: CanvasElementKind): kind is FormComponentKind {
  return !isPageElementKind(kind);
}
