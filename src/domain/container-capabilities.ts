import type { ElementContainer } from './element-containers';

// Возможности блоков-контейнеров (R-CFG-2, F03, [owner 2026-10-16]): что
// умеет блок — данные, а не ветвления `container.kind === 'formStep'`.
// Изменить возможность блока = поправить строку таблицы; новый вид блока —
// новая строка, проверки не меняются. Сейчас это stub конфига редактора (R-CFG-9).

export type ElementContainerKind = ElementContainer['kind'];

/** Блок шага формы: у него есть форма и шаг-владелец. */
export type FormStepContainer = Extract<ElementContainer, { kind: 'formStep' }>;

export interface ContainerCapabilities {
  /** «Сложная логика»: правила видимости между элементами блока (L-I5, ADR-14). */
  readonly logic: boolean;
  /** Переходы между шагами от элементов блока и их вариантов [owner 2026-10-14]. */
  readonly stepTransitions: boolean;
}

// Значения = сегодняшнее поведение: логика и переходы — только в шаге формы.
export const CONTAINER_CAPABILITIES: Readonly<Record<ElementContainerKind, ContainerCapabilities>> = {
  page: { logic: false, stepTransitions: false },
  formStep: { logic: true, stepTransitions: true },
};

export function containerCapabilities(kind: ElementContainerKind): ContainerCapabilities {
  return CONTAINER_CAPABILITIES[kind];
}

// Тонкие обёртки над таблицей. Сужение до шага формы держится на том, что
// обе возможности сейчас включены только у шага: логика сравнивает шаги
// (L-I5), переходы считают уровни шагов формы (form-step-depths).

export function supportsLogic(container: ElementContainer): container is FormStepContainer {
  return containerCapabilities(container.kind).logic;
}

export function supportsStepTransitions(container: ElementContainer): container is FormStepContainer {
  return containerCapabilities(container.kind).stepTransitions;
}
