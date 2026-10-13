import { describe, expect, it } from 'vitest';
import type { ServiceGraph } from '@domain/model/service-graph';
import type { Attachment } from '@domain/model/form-components';
import {
  toApplicationFormId,
  toBlueprintId,
  toFormComponentId,
  toFormStepId,
  toPageId,
} from '@domain/model/ids';
import { checkSingleAttachmentPerForm, SINGLE_ATTACHMENT_RULE } from './single-attachment-per-form';

const attachment = (id: string): Attachment => ({
  id: toFormComponentId(id),
  kind: 'attachment',
  label: 'Файл',
  required: false,
  allowedTypes: ['.pdf'],
});

const graphWithForms = (
  forms: { id: string; steps: { id: string; elements: Attachment[] }[] }[],
): ServiceGraph => ({
  id: toBlueprintId('bp-1'),
  title: 'Тестовая карта',
  homePage: { id: toPageId('home-1'), orderIndex: 0, elements: [] },
  subScenarios: [],
  applicationForms: forms.map((form) => ({
    id: toApplicationFormId(form.id),
    title: form.id,
    orderIndex: 0,
    steps: form.steps.map((step) => ({
      id: toFormStepId(step.id),
      elements: step.elements,
    })),
  })),
  links: [],
  logicRules: [],
});

describe('checkSingleAttachmentPerForm (инвариант #1)', () => {
  it('форма без вложений — без нарушений', () => {
    const graph = graphWithForms([{ id: 'form-1', steps: [{ id: 'step-1', elements: [] }] }]);
    expect(checkSingleAttachmentPerForm(graph)).toEqual([]);
  });

  it('одно вложение на форму — без нарушений', () => {
    const graph = graphWithForms([
      { id: 'form-1', steps: [{ id: 'step-1', elements: [attachment('cmp-1')] }] },
    ]);
    expect(checkSingleAttachmentPerForm(graph)).toEqual([]);
  });

  it('два вложения в одном шаге — нарушение', () => {
    const graph = graphWithForms([
      { id: 'form-1', steps: [{ id: 'step-1', elements: [attachment('cmp-1'), attachment('cmp-2')] }] },
    ]);
    const violations = checkSingleAttachmentPerForm(graph);
    expect(violations).toHaveLength(1);
    expect(violations[0]?.rule).toBe(SINGLE_ATTACHMENT_RULE);
  });

  it('два вложения в разных шагах одной формы — нарушение', () => {
    const graph = graphWithForms([
      {
        id: 'form-1',
        steps: [
          { id: 'step-1', elements: [attachment('cmp-1')] },
          { id: 'step-2', elements: [attachment('cmp-2')] },
        ],
      },
    ]);
    expect(checkSingleAttachmentPerForm(graph)).toHaveLength(1);
  });

  it('две формы по одному вложению в каждой — без нарушений', () => {
    const graph = graphWithForms([
      { id: 'form-1', steps: [{ id: 'step-1', elements: [attachment('cmp-1')] }] },
      { id: 'form-2', steps: [{ id: 'step-2', elements: [attachment('cmp-2')] }] },
    ]);
    expect(checkSingleAttachmentPerForm(graph)).toEqual([]);
  });

  it('три вложения на форму — одно нарушение с указанием количества', () => {
    const graph = graphWithForms([
      {
        id: 'form-1',
        steps: [{ id: 'step-1', elements: [attachment('cmp-1'), attachment('cmp-2'), attachment('cmp-3')] }],
      },
    ]);
    const violations = checkSingleAttachmentPerForm(graph);
    expect(violations).toHaveLength(1);
    expect(violations[0]?.message).toContain('3');
  });
});
