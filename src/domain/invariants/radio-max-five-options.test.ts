import { describe, expect, it } from 'vitest';
import type { ServiceGraph } from '@domain/model/service-graph';
import type { SelectList, SelectOption } from '@domain/model/form-components';
import {
  toApplicationFormId,
  toBlueprintId,
  toFormComponentId,
  toFormStepId,
  toPageId,
} from '@domain/model/ids';
import { checkRadioMaxFiveOptions, RADIO_MAX_OPTIONS_RULE } from './radio-max-five-options';

const options = (count: number): SelectOption[] =>
  Array.from({ length: count }, (_, index) => ({ label: `Вариант ${index + 1}`, value: `${index + 1}` }));

const selectList = (id: string, displayType: SelectList['displayType'], count: number): SelectList => ({
  id: toFormComponentId(id),
  kind: 'selectList',
  label: 'Выбор',
  required: false,
  displayType,
  multiSelect: false,
  options: options(count),
});

const graphWith = (component: SelectList): ServiceGraph => ({
  id: toBlueprintId('bp-1'),
  title: 'Тестовая карта',
  homePage: { id: toPageId('home-1'), orderIndex: 0, elements: [] },
  subScenarios: [],
  applicationForms: [
    {
      id: toApplicationFormId('form-1'),
      title: 'Форма',
      orderIndex: 0,
      steps: [{ id: toFormStepId('step-1'), elements: [component] }],
    },
  ],
  links: [],
  logicRules: [],
});

describe('checkRadioMaxFiveOptions (инвариант #2)', () => {
  it('радио-группа с 5 вариантами — граничный валидный случай', () => {
    expect(checkRadioMaxFiveOptions(graphWith(selectList('cmp-1', 'radio', 5)))).toEqual([]);
  });

  it('радио-группа с 6 вариантами — нарушение', () => {
    const violations = checkRadioMaxFiveOptions(graphWith(selectList('cmp-1', 'radio', 6)));
    expect(violations).toHaveLength(1);
    expect(violations[0]?.rule).toBe(RADIO_MAX_OPTIONS_RULE);
    expect(violations[0]?.message).toContain('6');
  });

  it('выпадающий список с 10 вариантами — без нарушений (лимит только для radio)', () => {
    expect(checkRadioMaxFiveOptions(graphWith(selectList('cmp-1', 'dropdown', 10)))).toEqual([]);
  });

  it('радио-группа с 1 вариантом — без нарушений', () => {
    expect(checkRadioMaxFiveOptions(graphWith(selectList('cmp-1', 'radio', 1)))).toEqual([]);
  });
});
