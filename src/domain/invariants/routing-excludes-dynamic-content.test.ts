import { describe, expect, it } from 'vitest';
import type { ServiceGraph } from '@domain/model/service-graph';
import type { FormComponent } from '@domain/model/form-components';
import {
  toApplicationFormId,
  toBlueprintId,
  toFormComponentId,
  toFormStepId,
  toPageId,
} from '@domain/model/ids';
import {
  checkRoutingExcludesDynamicContent,
  CI_PICKER_ROUTING_RULE,
  ROUTING_EXCLUDES_DYNAMIC_CONTENT_RULE,
  SELECT_LIST_ROUTING_RULE,
} from './routing-excludes-dynamic-content';

const base = {
  label: 'Поле',
  required: false,
  routing: { targetStepId: toFormStepId('step-2') },
  hasDynamicContent: true,
};

const components: Record<string, FormComponent> = {
  textField: { ...base, id: toFormComponentId('cmp-1'), kind: 'textField', multiline: false },
  selectList: {
    ...base,
    id: toFormComponentId('cmp-2'),
    kind: 'selectList',
    displayType: 'dropdown',
    multiSelect: false,
    options: [{ label: 'A', value: 'a' }],
  },
  ciPicker: {
    ...base,
    id: toFormComponentId('cmp-3'),
    kind: 'configurationItemPicker',
    multiSelect: false,
    ciTypes: ['service'],
    disabled: false,
  },
};

const graphWith = (component: FormComponent): ServiceGraph => ({
  id: toBlueprintId('bp-1'),
  title: 'Тестовая карта',
  homePage: { id: toPageId('home-1'), orderIndex: 0, listItems: [], widgetCards: [] },
  subScenarios: [],
  applicationForms: [
    {
      id: toApplicationFormId('form-1'),
      title: 'Форма',
      orderIndex: 0,
      steps: [{ id: toFormStepId('step-1'), components: [component] }],
    },
  ],
  links: [],
});

describe('checkRoutingExcludesDynamicContent (инварианты #3–5)', () => {
  it('произвольный компонент с маршрутизацией и динамическим контентом — правило #3', () => {
    const violations = checkRoutingExcludesDynamicContent(graphWith(components.textField!));
    expect(violations).toHaveLength(1);
    expect(violations[0]?.rule).toBe(ROUTING_EXCLUDES_DYNAMIC_CONTENT_RULE);
  });

  it('selectList с маршрутизацией и динамическим контентом — правило #4', () => {
    const violations = checkRoutingExcludesDynamicContent(graphWith(components.selectList!));
    expect(violations).toHaveLength(1);
    expect(violations[0]?.rule).toBe(SELECT_LIST_ROUTING_RULE);
  });

  it('configurationItemPicker с маршрутизацией и динамическим контентом — правило #5', () => {
    const violations = checkRoutingExcludesDynamicContent(graphWith(components.ciPicker!));
    expect(violations).toHaveLength(1);
    expect(violations[0]?.rule).toBe(CI_PICKER_ROUTING_RULE);
  });

  it('маршрутизация без динамического контента — без нарушений', () => {
    const component = { ...components.selectList!, hasDynamicContent: false };
    expect(checkRoutingExcludesDynamicContent(graphWith(component))).toEqual([]);
  });

  it('динамический контент без маршрутизации — без нарушений', () => {
    const { routing: _routing, ...withoutRouting } = components.selectList!;
    expect(checkRoutingExcludesDynamicContent(graphWith(withoutRouting))).toEqual([]);
  });

  it('ни маршрутизации, ни динамического контента — без нарушений', () => {
    const { routing: _routing, ...withoutRouting } = components.ciPicker!;
    const component = { ...withoutRouting, hasDynamicContent: false };
    expect(checkRoutingExcludesDynamicContent(graphWith(component))).toEqual([]);
  });
});
