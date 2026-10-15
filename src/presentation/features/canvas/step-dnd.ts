// Dnd шагов формы заявки [owner 2026-10-14]: перенос шага внутри своей формы
// за заголовок — нативный HTML5 dnd, как у карточек (element-dnd.ts), но свой
// MIME-тип: зона приёма шагов не реагирует на карточки, а слой элементов
// шага — на шаги. Перетаскиваемый шаг в dragover берётся из модульного
// состояния текущего drag (ревью A9, R4), а не из MIME-типов в нижнем регистре.

/** MIME-тип drag шага: в данных — JSON payload (форма и шаг). */
export const STEP_DND_MIME = 'application/x-blueprint-form-step';

export type StepDragPayload = { formId: string; stepId: string };

// Текущий drag шага в этом документе; сбрасывается по dragend ручки шага.
// Устаревшее значение не мешает: читается только при нашем MIME-типе в событии.
let currentDrag: StepDragPayload | null = null;

export function writeStepDrag(dataTransfer: DataTransfer, payload: StepDragPayload): void {
  dataTransfer.setData(STEP_DND_MIME, JSON.stringify(payload));
  dataTransfer.effectAllowed = 'move';
  currentDrag = payload;
}

export function endStepDrag(): void {
  currentDrag = null;
}

// Перетаскиваемый шаг во время dragover; null — это не drag шага.
export function draggedStep(dataTransfer: DataTransfer): StepDragPayload | null {
  return Array.from(dataTransfer.types).includes(STEP_DND_MIME) ? currentDrag : null;
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
// стороны). Шаг из другой колонки встаёт к якорю как есть.
export function effectiveStepAnchor(
  stepIds: readonly string[],
  draggedId: string,
  anchor: StepAnchorPosition | null,
): StepAnchorPosition | null {
  if (!anchor) {
    return null;
  }
  const from = stepIds.indexOf(draggedId);
  const anchorIndex = stepIds.indexOf(anchor.stepId);
  if (anchorIndex < 0) {
    return null;
  }
  if (from < 0) {
    return anchor;
  }
  const to = anchor.placement === 'before' ? anchorIndex : anchorIndex + 1;
  return to === from || to === from + 1 ? null : anchor;
}
