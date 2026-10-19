import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { ElementSchema } from '@application/ports/element-schema-provider';
import type { CanvasElement, CanvasElementKind } from '@domain/model/canvas-element';
import { useContainer } from '@presentation/app/App';

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
};

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
  };
  return catalog;
}

const ElementCatalogContext = createContext<ElementCatalog>(createElementCatalog([]));

// Провайдер на корне редактора: описания собираются один раз (провайдер
// схем — singleton контейнера).
export function ElementCatalogProvider({ children }: { children: ReactNode }) {
  const container = useContainer();
  const catalog = useMemo(
    () => createElementCatalog(container.cradle.elementSchemaProvider.listSchemas()),
    [container],
  );
  return <ElementCatalogContext.Provider value={catalog}>{children}</ElementCatalogContext.Provider>;
}

export function useElementCatalog(): ElementCatalog {
  return useContext(ElementCatalogContext);
}
