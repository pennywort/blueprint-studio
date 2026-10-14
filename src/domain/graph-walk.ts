import type { HomePage, ServiceGraph } from './model/service-graph';
import type { ApplicationForm, SubScenario } from './model/scenario';

// Единый обход страниц карты (ревью A5, R4): раньше рекурсия по подсценариям
// была скопирована в семь модулей. Чистые функции — работают и на
// замороженном состоянии, и на черновике Immer внутри команд.

/** Сущность-страница карты: Главная, подсценарий или форма заявки (D12/D13). */
export type PageEntity = HomePage | SubScenario | ApplicationForm;

// Страница с дискриминатором вида (ревью A6, R4): у Главной нет layerDepth
// (закреплена на нулевом уровне, ADR-15), у подсценария и формы — есть;
// сужение по kind вместо кастов `(page as { layerDepth?: number })`.
export type PageEntry =
  | { kind: 'home'; page: HomePage }
  | { kind: 'subScenario'; page: SubScenario }
  | { kind: 'form'; page: ApplicationForm };

// Вложенность подсценариев через children не ограничена (БТ, раздел 7) —
// обход всегда рекурсивный, иначе вложенные страницы «теряются».
export function* walkSubScenarios(subScenarios: SubScenario[]): Generator<SubScenario> {
  for (const subScenario of subScenarios) {
    yield subScenario;
    if (subScenario.children) {
      yield* walkSubScenarios(subScenario.children);
    }
  }
}

// Все страницы карты с видом: Главная (если есть, D8), подсценарии
// (рекурсивно), формы заявок (D12 — в слоях на общих основаниях).
export function* walkPageEntries(graph: ServiceGraph): Generator<PageEntry> {
  if (graph.homePage) {
    yield { kind: 'home', page: graph.homePage };
  }
  for (const page of walkSubScenarios(graph.subScenarios)) {
    yield { kind: 'subScenario', page };
  }
  for (const page of graph.applicationForms) {
    yield { kind: 'form', page };
  }
}

// Все страницы карты в том же порядке, без вида.
export function* walkPages(graph: ServiceGraph): Generator<PageEntity> {
  for (const entry of walkPageEntries(graph)) {
    yield entry.page;
  }
}

export function findPageEntry(graph: ServiceGraph, pageId: string): PageEntry | null {
  for (const entry of walkPageEntries(graph)) {
    if (entry.page.id === pageId) {
      return entry;
    }
  }
  return null;
}

// Явная колонка страницы (ADR-15): у Главной поля нет — она всегда на
// нулевом уровне, поэтому запись для неё не выполняется.
export function setPageLayerDepth(entry: PageEntry, layerDepth: number | undefined): void {
  if (entry.kind !== 'home') {
    entry.page.layerDepth = layerDepth;
  }
}
