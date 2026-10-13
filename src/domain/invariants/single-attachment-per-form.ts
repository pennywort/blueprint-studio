import type { ServiceGraph } from '@domain/model/service-graph';
import type { InvariantViolation } from './index';

// Инвариант #1 (конституция, раздел 4): Вложение (Attachment) — только ОДНО поле на форму.

export const SINGLE_ATTACHMENT_RULE = 'single-attachment-per-form';

export function checkSingleAttachmentPerForm(graph: ServiceGraph): InvariantViolation[] {
  const violations: InvariantViolation[] = [];

  // Считаем по всей форме: вложение допустимо один раз на форму, а не на шаг.
  graph.applicationForms.forEach((form) => {
    const totalAttachments = form.steps.reduce(
      (count, step) => count + step.elements.filter((component) => component.kind === 'attachment').length,
      0,
    );

    if (totalAttachments > 1) {
      violations.push({
        rule: SINGLE_ATTACHMENT_RULE,
        path: `applicationForms[${form.id}]`,
        message: `Форма содержит ${totalAttachments} полей вложения — допустимо только одно`,
      });
    }
  });

  return violations;
}
