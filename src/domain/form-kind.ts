import type { ApplicationForm } from './model/scenario';

// Тип формы заявки (D1, D8): одностраничная или степперная (пошаговое
// заполнение). Отдельного поля в модели нет — тип выводится из числа шагов.
// Правило — данные (AGENTS.md §4a, обратимость): сменить порог = поправить
// FORM_KIND_RULE; читают его и канвас (чип формы), и будущий генератор UI.

/** Тип формы заявки. Подписи — presentation/labels (FORM_KIND_LABELS). */
export type FormKind = 'single' | 'stepper';

export const FORM_KIND_RULE = {
  // С этого числа шагов форма считается степперной.
  stepperMinSteps: 2,
} as const;

/** Тип формы по её шагам (D1). Пустая форма — одностраничная. */
export function formKindOf(form: Pick<ApplicationForm, 'steps'>): FormKind {
  return form.steps.length >= FORM_KIND_RULE.stepperMinSteps ? 'stepper' : 'single';
}
