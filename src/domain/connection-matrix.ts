import type { CanvasElement } from './model/canvas-element';
import type { ElementContainer } from './element-containers';
import { isLogicSource } from './element-kinds';
import type { EditorRules } from './editor-rules';

// Матрица связей (R-CFG-2, [owner 2026-10-16]) — ЕДИНСТВЕННЫЙ источник
// правды «кто, откуда и куда может строить связи». Данные, а не ветвления
// `container.kind === 'formStep'` / `complexLogic && optionId`: изменить
// или вернуть поведение = поправить строку; новый вид источника, цели или
// блока — новая строка/значение, проверки не меняются. Таблица ниже —
// умолчания; действующая приходит в EditorRules из настроек редактора (R-ADM).
//
// Читают: подсветка целей при протягивании (connection-rules), инварианты
// (step-transitions, invariants/logic-rules), команды и UI — через выводимые
// ниже возможности блока. Что умеет ВИД элемента (connectable, logicSource,
// logicTarget) — другое измерение, реестр element-kinds.

export type ElementContainerKind = ElementContainer['kind'];

/** Блок шага формы: у него есть форма и шаг-владелец. */
export type FormStepContainer = Extract<ElementContainer, { kind: 'formStep' }>;

/**
 * Роль источника связи:
 * - `element` — элемент целиком (handle элемента);
 * - `option` — вариант Select'а без «Сложной логики»;
 * - `logicOption` — вариант Select'а с включённой «Сложной логикой» (L4).
 */
export type ConnectionSourceRole = 'element' | 'option' | 'logicOption';

/**
 * Цель связи → блоки, ИЗ которых источник этой роли до неё дотягивается:
 * - `page` — страница следующих уровней (навигация, D9);
 * - `step` — шаг следующих уровней той же формы (переход [owner 2026-10-14]);
 *   по смыслу только из шага формы — это закреплено типом;
 * - `element` — элемент того же блока (правило видимости, L-I5/ADR-14).
 * Нет ключа — связь недопустима.
 */
export type ConnectionReach = {
  readonly page?: readonly ElementContainerKind[];
  readonly step?: readonly FormStepContainer['kind'][];
  readonly element?: readonly ElementContainerKind[];
};

export type ConnectionTargetKind = keyof ConnectionReach;

// Значения = сегодняшнее поведение. Вариант с логикой — только внутри своего
// шага [owner 2026-10-16; раньше — ещё и переход на шаг]; вариант без логики —
// источник перехода [owner 2026-10-14]; логика и переходы — только в шаге формы.
export const DEFAULT_CONNECTION_MATRIX: Readonly<Record<ConnectionSourceRole, ConnectionReach>> = {
  element: { page: ['page', 'formStep'], step: ['formStep'] },
  option: { step: ['formStep'] },
  logicOption: { element: ['formStep'] },
};

const ROLES: readonly ConnectionSourceRole[] = ['element', 'option', 'logicOption'];

export function connectionSourceRole(
  rules: EditorRules,
  element: CanvasElement,
  optionId?: string,
): ConnectionSourceRole {
  return optionId === undefined ? 'element' : variantRole(rules, element);
}

/** Роль вариантов элемента выбора: с включённой «Сложной логикой» — logicOption (L4). */
function variantRole(rules: EditorRules, element: CanvasElement): ConnectionSourceRole {
  return isLogicSource(rules, element) ? 'logicOption' : 'option';
}

/**
 * Карточки вариантов элемента видны в блоке, если из варианта в его роли
 * есть куда протянуть связь ([owner 2026-10-27]): вариант без связей на канвасе
 * не нужен. Сегодня — в шаге формы всегда (option → step), на странице —
 * нигде. «Варианты только при сложной логике» без кода = убрать переходы
 * вариантов в настройках администратора (null удаляет ключ при слиянии):
 * `{ "rules": { "connections": { "option": { "step": null } } } }`.
 */
export function variantsVisible(
  rules: EditorRules,
  element: CanvasElement,
  kind: ElementContainerKind,
): boolean {
  const reach: ConnectionReach = rules.connections[variantRole(rules, element)];
  return (Object.values(reach) as (readonly ElementContainerKind[] | undefined)[]).some(
    (from) => from?.includes(kind) ?? false,
  );
}

/** Может ли источник роли `role` из блока вида `from` вести на цель `target`. */
export function canConnect(
  rules: EditorRules,
  role: ConnectionSourceRole,
  target: ConnectionTargetKind,
  from: ElementContainerKind,
): boolean {
  return (
    (rules.connections[role][target] as readonly ElementContainerKind[] | undefined)?.includes(from) ?? false
  );
}

// Возможности блока — производные матрицы, а не отдельная таблица.

export interface ContainerCapabilities {
  /** «Сложная логика»: правила видимости между элементами блока (L-I5, ADR-14). */
  readonly logic: boolean;
  /** Переходы между шагами от элементов блока и их вариантов [owner 2026-10-14]. */
  readonly stepTransitions: boolean;
}

export function containerCapabilities(rules: EditorRules, kind: ElementContainerKind): ContainerCapabilities {
  return {
    logic: canConnect(rules, 'logicOption', 'element', kind),
    stepTransitions: ROLES.some((role) => canConnect(rules, role, 'step', kind)),
  };
}

export function supportsLogic(rules: EditorRules, container: ElementContainer): boolean {
  return containerCapabilities(rules, container.kind).logic;
}

// Сужение до шага формы держится на типе ConnectionReach.step: цель «шаг»
// разрешима только из блока вида formStep.
export function supportsStepTransitions(
  rules: EditorRules,
  container: ElementContainer,
): container is FormStepContainer {
  return containerCapabilities(rules, container.kind).stepTransitions;
}
