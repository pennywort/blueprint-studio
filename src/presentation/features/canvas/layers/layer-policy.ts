import { CANVAS_LAYOUT, FORM_STEP_LAYOUT } from '../canvas-layout';
import { ELEMENT_DND_KINDS, type ElementDndKind } from '../element-dnd';
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
// Состав — любые элементы канваса (универсальные элементы [owner 2026-10-13]:
// List item/Widget card переносятся в шаг наравне с компонентами форм).
export const FORM_STEP_LAYER_POLICY: LayerPolicy<ElementDndKind> = {
  columnWidth: FORM_STEP_LAYOUT.elementWidth,
  columnGap: FORM_STEP_LAYOUT.columnGap,
  allowNewLayer: true,
  movableKinds: ELEMENT_DND_KINDS,
};

// Шаги формы заявки [owner 2026-10-14]: колонки — уровни шагов, тот же dnd,
// что у узлов канваса (своя колонка — порядок, другая — перенос на уровень,
// пустая справа — новый уровень). Переносится только шаг.
export const FORM_STEPS_LAYER_POLICY: LayerPolicy<'formStep'> = {
  columnWidth: CANVAS_LAYOUT.formStepWidth,
  columnGap: CANVAS_LAYOUT.formStepGap,
  allowNewLayer: true,
  movableKinds: ['formStep'],
};
