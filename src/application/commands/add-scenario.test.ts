import { describe, expect, it } from 'vitest';
import { toScenarioId } from '@domain/model/ids';
import { InvariantViolationError } from './errors';
import { AddScenario } from './add-scenario';
import { expectUndoRedoRoundtrip, makeBus, makeCanvasGraph } from './canvas-graph.fixture';

describe('AddScenario (T-035)', () => {
  it('добавляет подсценарий со следующим orderIndex по порядку создания (D13)', () => {
    const bus = makeBus();
    const before = makeCanvasGraph();

    const after = bus.execute(
      before,
      new AddScenario({
        id: toScenarioId('sc-new'),
        type: 'link',
        title: 'Новый',
        elements: [],
        link: { url: 'https://example.com' },
      }),
    );

    // В фикстуре заняты orderIndex 0..4 — следующий 5.
    expect(after.subScenarios.map((scenario) => scenario.id)).toContain('sc-new');
    expect(after.subScenarios.find((scenario) => scenario.id === 'sc-new')?.orderIndex).toBe(5);
    // Исходный граф не мутирует.
    expect(before.subScenarios).toHaveLength(2);
  });

  it('первый узел пустой карты получает orderIndex 0', () => {
    const bus = makeBus();
    const empty = {
      ...makeCanvasGraph(),
      homePage: undefined,
      subScenarios: [],
      applicationForms: [],
      links: [],
    };

    const after = bus.execute(
      empty,
      new AddScenario({
        id: toScenarioId('sc-1'),
        type: 'link',
        title: 'Первый',
        elements: [],
        link: { url: 'https://example.com' },
      }),
    );

    expect(after.subScenarios[0]?.orderIndex).toBe(0);
  });

  it('execute → undo → redo возвращает исходный граф', () => {
    const bus = makeBus();
    const before = makeCanvasGraph();
    expectUndoRedoRoundtrip(
      bus,
      before,
      new AddScenario({
        id: toScenarioId('sc-new'),
        type: 'link',
        title: 'Новый',
        elements: [],
        link: { url: 'https://example.com' },
      }),
    );
  });

  it('сценарий с полем чужого типа — InvariantViolationError, состояние не трогается', () => {
    const bus = makeBus();
    const before = makeCanvasGraph();

    expect(() =>
      bus.execute(
        before,
        // infoBlock допустим только у type=navigation (инвариант scenario-type-fields).
        new AddScenario({
          id: toScenarioId('sc-bad'),
          type: 'link',
          title: 'Битый',
          elements: [],
          link: { url: 'https://example.com' },
          infoBlock: { content: 'Инфо', position: 'right' },
        }),
      ),
    ).toThrow(InvariantViolationError);
    expect(bus.canUndo()).toBe(false);
  });
});
