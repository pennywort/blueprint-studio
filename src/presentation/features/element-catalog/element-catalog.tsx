import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { ElementCardChip, ElementSchema } from '@application/ports/element-schema-provider';
import type { CanvasElement, CanvasElementKind } from '@domain/model/canvas-element';
import { useContainer } from '@presentation/app/App';
import { useSettingsSnapshot } from '@presentation/features/settings/use-settings';

// Каталог элементов редактора (этап 3 docs/schemas/PLAN.md): описания из
// IElementSchemaProvider (схема + политика) — единственный источник подписей
// видов, текста карточек и формы атрибутов. Канвас, меню, поиск и панель
// атрибутов читают его, а не таблицы по kind (§4b AGENTS.md).

export type ElementCatalog = {
  /** Элементы политики в её порядке (порядок меню добавления). */
  readonly schemas: readonly ElementSchema[];
  schema(kind: CanvasElementKind): ElementSchema | null;
  /** Подпись вида; вид вне политики (карта старше политики) — его имя. */
  kindLabel(kind: CanvasElementKind): string;
  /** Основной текст карточки: props[card.title], иначе подпись вида. */
  title(element: CanvasElement): string;
  subtitle(element: CanvasElement): string | undefined;
  badge(element: CanvasElement): string | undefined;
  /** Имя иконки фреймворка на карточке: props[card.icon] [owner 2026-10-28]. */
  icon(element: CanvasElement): string | undefined;
  /** У вида есть место иконки на карточке (card.icon политики) [owner 2026-11-19]. */
  hasIcon(kind: CanvasElementKind): boolean;
  /** Чипы карточки по значениям атрибутов (card.chips политики) [owner 2026-11-19]. */
  chips(element: CanvasElement): readonly CardChip[];
};

export type CardChip = { text: string; tone: NonNullable<ElementCardChip['tone']> };

// Чип по значению атрибута: bool — при значении when (не заданное = false),
// enum — короткая подпись или подпись варианта; нет значения — чипа нет.
function chipOf(chip: ElementCardChip, schema: ElementSchema, element: CanvasElement): CardChip | null {
  const attribute = schema.attributes.find((item) => item.key === chip.key);
  if (!attribute) {
    return null;
  }
  const value = (attribute.store === 'props' ? element.props : element.ext)?.[chip.key];
  const tone = chip.tone ?? 'default';
  if (attribute.type === 'bool') {
    return chip.label && (value === true) === (chip.when ?? true) ? { text: chip.label, tone } : null;
  }
  const text =
    typeof value === 'string'
      ? (chip.labels?.[value] ?? attribute.options?.find((option) => option.value === value)?.label)
      : undefined;
  return text ? { text, tone } : null;
}

const NO_CHIPS: readonly CardChip[] = [];

const textProp = (element: CanvasElement, key: string | undefined): string | undefined => {
  const value = key === undefined ? undefined : element.props[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
};

export function createElementCatalog(schemas: readonly ElementSchema[]): ElementCatalog {
  const byKind = new Map(schemas.map((schema) => [schema.kind, schema]));
  const catalog: ElementCatalog = {
    schemas,
    schema: (kind) => byKind.get(kind) ?? null,
    kindLabel: (kind) => byKind.get(kind)?.label ?? kind,
    title: (element) =>
      textProp(element, byKind.get(element.kind)?.card.title) ?? catalog.kindLabel(element.kind),
    subtitle: (element) => textProp(element, byKind.get(element.kind)?.card.subtitle),
    badge: (element) => textProp(element, byKind.get(element.kind)?.card.badge),
    icon: (element) => textProp(element, byKind.get(element.kind)?.card.icon),
    hasIcon: (kind) => byKind.get(kind)?.card.icon !== undefined,
    chips: (element) => {
      const schema = byKind.get(element.kind);
      return schema?.card.chips
        ? schema.card.chips
            .map((chip) => chipOf(chip, schema, element))
            .filter((chip): chip is CardChip => chip !== null)
        : NO_CHIPS;
    },
  };
  return catalog;
}

const ElementCatalogContext = createContext<ElementCatalog>(createElementCatalog([]));

// Провайдер на корне редактора: описания — от провайдера схем (singleton
// контейнера). Политика элементов — секция настроек (R-ADM): подписка на
// снимок настроек перечитывает список, каталог пересоздаётся только при
// смене описаний (провайдер отдаёт тот же массив, пока политика прежняя).
export function ElementCatalogProvider({ children }: { children: ReactNode }) {
  const provider = useContainer().cradle.elementSchemaProvider;
  useSettingsSnapshot();
  const schemas = provider.listSchemas();
  const catalog = useMemo(() => createElementCatalog(schemas), [schemas]);
  return <ElementCatalogContext.Provider value={catalog}>{children}</ElementCatalogContext.Provider>;
}

export function useElementCatalog(): ElementCatalog {
  return useContext(ElementCatalogContext);
}
