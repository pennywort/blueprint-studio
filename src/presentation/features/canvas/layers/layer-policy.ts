import { CANVAS_LAYOUT, FORM_STEP_LAYOUT } from '../canvas-layout';
import type { ElementDndKind } from '../element-dnd';
import type { CanvasNodeType } from '../graph-flow-adapter';

// Политика слоя [owner 2026-10-13]: всё, чем слои редактора отличаются друг
// от друга, — данные, а не ветвления в ядре (layer-columns.ts). Сейчас
// отличия — размеры/зазоры и состав перетаскиваемого; новое отличие (иной
// каскад связей, запрет нового уровня, своя раскладка) — новое поле политики.
// Каскад связей при переносе — доменное правило команд: страница рвёт только
// несмежные связи (N4), элемент шага — все свои правила (перенос одного
// элемента без группы, MoveElement).

export type LayerPolicy<TKind extends string = string> = {
  /** Ширина колонки (пустого слота) в координатах слоя. */
  columnWidth: number;
  /** Горизонтальный зазор между колонками. */
  columnGap: number;
  /** Пустая колонка справа от последней — перенос на новый уровень. */
  allowNewLayer: boolean;
  /** Что можно переносить между уровнями этого слоя. */
  movableKinds: readonly TKind[];
};

export function canMoveToLayer<TKind extends string>(policy: LayerPolicy<TKind>, kind: string): boolean {
  return (policy.movableKinds as readonly string[]).includes(kind);
}

// Канвас страниц: Главная закреплена на нулевом уровне (переносится только
// порядок), подсценарии и формы — между уровнями навигации (F6).
export const PAGE_LAYER_POLICY: LayerPolicy<CanvasNodeType> = {
  columnWidth: CANVAS_LAYOUT.nodeWidth,
  columnGap: CANVAS_LAYOUT.columnGap,
  allowNewLayer: true,
  movableKinds: ['subScenario', 'form'],
};

// Шаг формы: колонки по правилам «Сложной логики», карточки меньше.
// Переносится любой элемент карты [owner 2026-10-13].
export const FORM_STEP_LAYER_POLICY: LayerPolicy<ElementDndKind> = {
  columnWidth: FORM_STEP_LAYOUT.elementWidth,
  columnGap: FORM_STEP_LAYOUT.columnGap,
  allowNewLayer: true,
  movableKinds: ['element'],
};

// Список элементов страницы (Главная, подсценарий): что принимает drop.
// Слой колонок у страниц пока не строится — элементы идут списком.
export const PAGE_ELEMENTS_ACCEPTED_KINDS: readonly ElementDndKind[] = ['element'];
