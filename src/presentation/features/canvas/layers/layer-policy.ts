import { useMemo } from 'react';
import { CANVAS_LAYOUT, FORM_STEP_LAYOUT } from '../canvas-layout';
import type { LayerCapacity, LayerCapacityTable } from '@domain/layer-capacity';
import type { EditorRules } from '@domain/editor-rules';
import { useEditorRules } from '@presentation/features/settings/use-settings';
import type { CanvasNodeType } from '../graph-flow-adapter';

// Политика слоя [owner 2026-10-13]: всё, чем слои редактора отличаются друг
// от друга, — данные, а не ветвления в ядре (layer-columns.ts). Сейчас
// отличия — размеры/зазоры, состав перетаскиваемого и ёмкость уровней
// (доменная таблица EditorRules.layerCapacity — её же проверяет инвариант
// графа, [owner 2026-10-16]; значение — из настроек редактора, R-ADM); новое
// отличие (иной каскад связей, запрет нового уровня, своя раскладка) — новое
// поле политики.
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
  /** Что можно переносить между уровнями этого слоя; не задано — всё. */
  movableKinds?: readonly TKind[];
  /** Ёмкость уровней — доменная таблица (EditorRules), та же, что у инварианта. */
  capacity: LayerCapacity;
};

export function canMoveToLayer<TKind extends string>(policy: LayerPolicy<TKind>, kind: string): boolean {
  return policy.movableKinds === undefined || (policy.movableKinds as readonly string[]).includes(kind);
}

// Описание слоя: геометрия — здесь, ёмкость — ключ таблицы правил.
type LayerPolicyDefinition<TKind extends string> = Omit<LayerPolicy<TKind>, 'capacity'> & {
  capacity: keyof LayerCapacityTable;
};

// Канвас страниц: Главная закреплена на нулевом уровне (переносится только
// порядок), подсценарии и формы — между уровнями навигации (F6).
const PAGE_LAYER: LayerPolicyDefinition<CanvasNodeType> = {
  columnWidth: CANVAS_LAYOUT.nodeWidth,
  columnGap: CANVAS_LAYOUT.columnGap,
  allowNewLayer: true,
  movableKinds: ['subScenario', 'form'],
  capacity: 'pages',
};

// Шаг формы: колонки по правилам «Сложной логики», карточки меньше.
// Переносится любой элемент канваса (ADR-17) — ограничения состава нет.
const FORM_STEP_LAYER: LayerPolicyDefinition<string> = {
  columnWidth: FORM_STEP_LAYOUT.elementWidth,
  columnGap: FORM_STEP_LAYOUT.columnGap,
  allowNewLayer: true,
  capacity: 'stepElements',
};

// Шаги формы заявки [owner 2026-10-14]: колонки — уровни шагов, тот же dnd,
// что у узлов канваса (своя колонка — порядок, другая — перенос на уровень,
// пустая справа — новый уровень). Переносится только шаг.
const FORM_STEPS_LAYER: LayerPolicyDefinition<'formStep'> = {
  columnWidth: CANVAS_LAYOUT.formStepWidth,
  columnGap: CANVAS_LAYOUT.formStepGap,
  allowNewLayer: true,
  movableKinds: ['formStep'],
  capacity: 'formSteps',
};

export type LayerPolicies = {
  /** Канвас страниц. */
  page: LayerPolicy<CanvasNodeType>;
  /** Элементы внутри шага формы. */
  formStep: LayerPolicy;
  /** Шаги формы заявки. */
  formSteps: LayerPolicy<'formStep'>;
};

const bind = <TKind extends string>(
  definition: LayerPolicyDefinition<TKind>,
  rules: EditorRules,
): LayerPolicy<TKind> => ({ ...definition, capacity: rules.layerCapacity[definition.capacity] });

export function resolveLayerPolicies(rules: EditorRules): LayerPolicies {
  return {
    page: bind(PAGE_LAYER, rules),
    formStep: bind(FORM_STEP_LAYER, rules),
    formSteps: bind(FORM_STEPS_LAYER, rules),
  };
}

/** Политики слоёв с ёмкостью по действующим правилам; объект меняется только со сменой правил. */
export function useLayerPolicies(): LayerPolicies {
  const rules = useEditorRules();
  return useMemo(() => resolveLayerPolicies(rules), [rules]);
}
