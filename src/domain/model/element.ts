import { z } from 'zod';
import { elementCommonFields, IconRefSchema, ImageRefSchema } from './element-common';
import { FormComponentSchema, type FormComponent } from './form-components';

// Элемент карты [owner 2026-10-13]: универсальный редактор — List item,
// Widget card и компоненты форм (кнопка, Select, Text field…) равноправны.
// Вид элемента определяет только его атрибуты; контейнер (Главная,
// подсценарий, шаг формы) хранит любые элементы в одном списке `elements`.
// Исключения, если появятся, — инвариантами домена, а не типами контейнеров.

const redirectFields = {
  isRedirect: z.boolean().optional(),
  redirectUrl: z.string().optional(),
};

export const ListItemSchema = z.object({
  ...elementCommonFields,
  kind: z.literal('listItem'),
  title: z.string(),
  secondaryText: z.string().optional(),
  icon: IconRefSchema.optional(),
  ...redirectFields,
});
export type ListItem = z.infer<typeof ListItemSchema>;

export const WidgetCardSchema = z.object({
  ...elementCommonFields,
  kind: z.literal('widgetCard'),
  title: z.string(),
  secondaryText: z.string().optional(),
  icon: IconRefSchema.optional(),
  image: ImageRefSchema.optional(),
  ...redirectFields,
});
export type WidgetCard = z.infer<typeof WidgetCardSchema>;

export const MapElementSchema = z.discriminatedUnion('kind', [
  ListItemSchema,
  WidgetCardSchema,
  ...FormComponentSchema.options,
]);
export type MapElement = z.infer<typeof MapElementSchema>;
export type MapElementKind = MapElement['kind'];

// Компонент формы — элемент с атрибутами полей ввода (спека 5.4).
export function isFormComponent(element: MapElement): element is FormComponent {
  return element.kind !== 'listItem' && element.kind !== 'widgetCard';
}
