import { describe, expect, it } from 'vitest';
import type { ServiceGraph } from '@domain/model/service-graph';
import {
  toApplicationFormId,
  toBlueprintId,
  toFormComponentId,
  toFormStepId,
  toPageId,
  toScenarioId,
} from '@domain/model/ids';
import { validateGraph } from './index';

const emptyGraph = (): ServiceGraph => ({
  id: toBlueprintId('bp-1'),
  title: 'Тестовая карта',
  homePage: { id: toPageId('home-1'), orderIndex: 0, listItems: [], widgetCards: [] },
  subScenarios: [],
  applicationForms: [],
  links: [],
  logicRules: [],
});

describe('validateGraph (оркестратор инвариантов)', () => {
  it('пустой валидный граф — без нарушений', () => {
    expect(validateGraph(emptyGraph())).toEqual([]);
  });

  it('агрегирует нарушения нескольких правил', () => {
    const graph = emptyGraph();
    graph.applicationForms.push({
      id: toApplicationFormId('form-1'),
      title: 'Форма',
      orderIndex: 0,
      steps: [
        {
          id: toFormStepId('step-1'),
          components: [
            {
              id: toFormComponentId('cmp-1'),
              kind: 'attachment',
              label: 'Файл 1',
              required: false,
              allowedTypes: [],
            },
            {
              id: toFormComponentId('cmp-2'),
              kind: 'attachment',
              label: 'Файл 2',
              required: false,
              allowedTypes: [],
            },
            {
              id: toFormComponentId('cmp-3'),
              kind: 'selectList',
              label: 'Радио',
              required: false,
              displayType: 'radio',
              multiSelect: false,
              options: Array.from({ length: 6 }, (_, i) => ({ label: `${i}`, value: `${i}` })),
            },
          ],
        },
      ],
    });

    const violations = validateGraph(graph);
    const rules = violations.map((violation) => violation.rule);
    expect(rules).toContain('single-attachment-per-form');
    expect(rules).toContain('radio-max-five-options');
  });

  it('находит нарушения типов сценариев', () => {
    const graph = emptyGraph();
    graph.subScenarios.push({
      id: toScenarioId('sc-1'),
      type: 'link',
      title: 'Ссылка',
      orderIndex: 0,
      listItems: [],
      link: { url: 'https://example.com' },
      infoBlock: { content: 'Лишнее', position: 'right' },
    });

    const violations = validateGraph(graph);
    expect(violations.map((violation) => violation.rule)).toContain('scenario-type-fields');
  });

  it('каждое нарушение содержит rule, path и message', () => {
    const graph = emptyGraph();
    graph.applicationForms.push({
      id: toApplicationFormId('form-1'),
      title: 'Форма',
      orderIndex: 0,
      steps: [
        {
          id: toFormStepId('step-1'),
          components: [
            {
              id: toFormComponentId('cmp-1'),
              kind: 'attachment',
              label: 'Файл 1',
              required: false,
              allowedTypes: [],
            },
            {
              id: toFormComponentId('cmp-2'),
              kind: 'attachment',
              label: 'Файл 2',
              required: false,
              allowedTypes: [],
            },
          ],
        },
      ],
    });

    const violations = validateGraph(graph);
    expect(violations.length).toBeGreaterThan(0);
    violations.forEach((violation) => {
      expect(violation.rule).toBeTruthy();
      expect(violation.path).toBeTruthy();
      expect(violation.message).toBeTruthy();
    });
  });
});
