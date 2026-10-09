import { describe, expect, it } from 'vitest';
import type { ServiceGraph } from '@domain/model/service-graph';
import type { SubScenario } from '@domain/model/scenario';
import { toApplicationFormId, toBlueprintId, toScenarioId } from '@domain/model/ids';
import { checkScenarioTypeFields, SCENARIO_TYPE_FIELDS_RULE } from './scenario-type-fields';

const scenario = (partial: Partial<SubScenario> & Pick<SubScenario, 'type'>): SubScenario => ({
  id: toScenarioId(`sc-${partial.type}`),
  title: 'Сценарий',
  listItems: [],
  ...partial,
});

const graphWith = (subScenarios: SubScenario[]): ServiceGraph => ({
  id: toBlueprintId('bp-1'),
  title: 'Тестовая карта',
  homePage: { listItems: [], widgetCards: [] },
  subScenarios,
  applicationForms: [],
});

describe('checkScenarioTypeFields (инвариант формы сценария)', () => {
  it('navigation с infoBlock и children — валидно', () => {
    const graph = graphWith([
      scenario({
        type: 'navigation',
        infoBlock: { content: 'Подсказка', position: 'right' },
        children: [scenario({ type: 'link', link: { url: 'https://example.com' } })],
      }),
    ]);
    expect(checkScenarioTypeFields(graph)).toEqual([]);
  });

  it('link с полем link — валидно', () => {
    const graph = graphWith([scenario({ type: 'link', link: { url: 'https://example.com' } })]);
    expect(checkScenarioTypeFields(graph)).toEqual([]);
  });

  it('application с applicationFormId — валидно', () => {
    const graph = graphWith([
      scenario({ type: 'application', applicationFormId: toApplicationFormId('form-1') }),
    ]);
    expect(checkScenarioTypeFields(graph)).toEqual([]);
  });

  it('link с infoBlock — нарушение', () => {
    const graph = graphWith([
      scenario({
        type: 'link',
        link: { url: 'https://example.com' },
        infoBlock: { content: 'Лишнее', position: 'right' },
      }),
    ]);
    const violations = checkScenarioTypeFields(graph);
    expect(violations).toHaveLength(1);
    expect(violations[0]?.rule).toBe(SCENARIO_TYPE_FIELDS_RULE);
    expect(violations[0]?.path).toContain('infoBlock');
  });

  it('application с link — нарушение', () => {
    const graph = graphWith([
      scenario({
        type: 'application',
        applicationFormId: toApplicationFormId('form-1'),
        link: { url: 'https://example.com' },
      }),
    ]);
    expect(checkScenarioTypeFields(graph)).toHaveLength(1);
  });

  it('link с children — нарушение', () => {
    const graph = graphWith([
      scenario({
        type: 'link',
        link: { url: 'https://example.com' },
        children: [scenario({ type: 'link', link: { url: 'https://example.com/2' } })],
      }),
    ]);
    expect(checkScenarioTypeFields(graph)).toHaveLength(1);
  });

  it('navigation с applicationFormId — нарушение', () => {
    const graph = graphWith([
      scenario({ type: 'navigation', applicationFormId: toApplicationFormId('form-1') }),
    ]);
    expect(checkScenarioTypeFields(graph)).toHaveLength(1);
  });

  it('нарушение во вложенном сценарии находится рекурсивно', () => {
    const graph = graphWith([
      scenario({
        type: 'navigation',
        children: [
          scenario({
            type: 'navigation',
            children: [
              scenario({
                type: 'application',
                applicationFormId: toApplicationFormId('form-1'),
                infoBlock: { content: 'Лишнее', position: 'right' },
              }),
            ],
          }),
        ],
      }),
    ]);
    const violations = checkScenarioTypeFields(graph);
    expect(violations).toHaveLength(1);
    expect(violations[0]?.path).toBe('subScenarios[0].children[0].children[0].infoBlock');
  });
});
