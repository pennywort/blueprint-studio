// Dnd шагов формы заявки [owner 2026-10-14]: перенос шага внутри своей формы
// за заголовок — нативный HTML5 dnd, как у карточек (element-dnd.ts), но свой
// MIME-тип: зона приёма шагов не реагирует на карточки, а слой элементов
// шага — на шаги. Колонка (уровень) — по X общим ядром слоёв (layers/), как у
// узлов канваса; шаги уровня идут друг под другом, поэтому якорь — по Y.

/** Основной MIME-тип: в данных — JSON payload (форма и шаг). */
export const STEP_DND_MIME = 'application/x-blueprint-form-step';

// Маркер формы: в dragover данные недоступны — только типы; шаг переносится
// лишь внутри своей формы. Браузер приводит MIME-типы к нижнему регистру.
const STEP_DND_FORM_PREFIX = `${STEP_DND_MIME}-form-`;
// Маркер шага: зоне приёма нужен перетаскиваемый, чтобы не показывать
// индикатор там, где порядок не изменится.
const STEP_DND_ID_PREFIX = `${STEP_DND_MIME}-step-`;

export type StepDragPayload = { formId: string; stepId: string };

export function writeStepDrag(dataTransfer: DataTransfer, { formId, stepId }: StepDragPayload): void {
  dataTransfer.setData(STEP_DND_MIME, JSON.stringify({ formId, stepId }));
  dataTransfer.setData(`${STEP_DND_FORM_PREFIX}${formId.toLowerCase()}`, '');
  dataTransfer.setData(`${STEP_DND_ID_PREFIX}${stepId.toLowerCase()}`, '');
  dataTransfer.effectAllowed = 'move';
}

// Идёт drag шага этой формы (по типам drag-события, доступным в dragover).
export function isStepDragOfForm(types: readonly string[] | DOMStringList, formId: string): boolean {
  const marker = `${STEP_DND_FORM_PREFIX}${formId.toLowerCase()}`;
  return Array.from(types).some((type) => type.toLowerCase() === marker);
}

// Id перетаскиваемого шага (в нижнем регистре); null — не drag шага.
export function readStepDragId(types: readonly string[] | DOMStringList): string | null {
  const marker = Array.from(types).find((type) => type.toLowerCase().startsWith(STEP_DND_ID_PREFIX));
  return marker ? marker.toLowerCase().slice(STEP_DND_ID_PREFIX.length) : null;
}

export function readStepDrag(dataTransfer: DataTransfer): StepDragPayload | null {
  const raw = dataTransfer.getData(STEP_DND_MIME);
  if (!raw) {
    return null;
  }
  try {
    const { formId, stepId } = JSON.parse(raw) as Partial<StepDragPayload>;
    return formId && stepId ? { formId, stepId } : null;
  } catch {
    return null;
  }
}

/** Якорь вставки шага: до/после шага-соседа. */
export type StepAnchorPosition = { stepId: string; placement: 'before' | 'after' };

// Шаг-якорь в колонке по вертикали курсора: шаг под курсором, сторона — по
// его середине; выше первого — до первого, ниже последнего — после
// последнего; null — колонка пуста (новый уровень).
export function stepAnchorFromPoint(column: HTMLElement | null, clientY: number): StepAnchorPosition | null {
  const steps = column ? Array.from(column.querySelectorAll<HTMLElement>('[data-form-step-id]')) : [];
  for (const step of steps) {
    const rect = step.getBoundingClientRect();
    if (clientY < rect.bottom) {
      return {
        stepId: step.dataset.formStepId!,
        placement: clientY < rect.top + rect.height / 2 ? 'before' : 'after',
      };
    }
  }
  const last = steps[steps.length - 1];
  return last ? { stepId: last.dataset.formStepId!, placement: 'after' } : null;
}

// Якорь, который действительно меняет порядок в колонке stepIds; null — шаг
// останется на месте (якорь — сам шаг или его сосед с «внутренней»
// стороны). Шаг из другой колонки встаёт к якорю как есть. Id — без учёта
// регистра: id перетаскиваемого читается из MIME-типа.
export function effectiveStepAnchor(
  stepIds: readonly string[],
  draggedId: string,
  anchor: StepAnchorPosition | null,
): StepAnchorPosition | null {
  if (!anchor) {
    return null;
  }
  const lowered = stepIds.map((id) => id.toLowerCase());
  const from = lowered.indexOf(draggedId.toLowerCase());
  const anchorIndex = lowered.indexOf(anchor.stepId.toLowerCase());
  if (anchorIndex < 0) {
    return null;
  }
  if (from < 0) {
    return anchor;
  }
  const to = anchor.placement === 'before' ? anchorIndex : anchorIndex + 1;
  return to === from || to === from + 1 ? null : anchor;
}
