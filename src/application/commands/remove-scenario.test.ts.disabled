import { describe, expect, it } from 'vitest';
import { toScenarioId } from '@domain/model/ids';
import { RemoveScenario } from './remove-scenario';
import { expectUndoRedoRoundtrip, makeBus, makeCanvasGraph } from './canvas-graph.fixture';

describe('RemoveScenario (T-035)', () => {
  it('удаляет подсценарий с каскадом входящих и исходящих связей', () => {
    const bus = makeBus();
    const before = makeCanvasGraph();

    const after = bus.execute(before, new RemoveScenario(toScenarioId('sc-1')));

    expect(after.subScenarios.map((scenario) => scenario.id)).not.toContain('sc-1');
    // Каскад уносит всё, что связано со sc-1: link-1 и link-3 направлены на
    // sc-1, link-2 исходит из его элемента el-sc-1.
    expect(after.links).toEqual([]);
    expect(before.subScenarios).toHaveLength(2);
    expect(before.links).toHaveLength(3);
  });

  it('удаляет подсценарий вместе с вложенными children и их связями', () => {
    const bus = makeBus();
    const before = makeCanvasGraph();

    const after = bus.execute(before, new RemoveScenario(toScenarioId('sc-2')));

    expect(after.subScenarios.map((scenario) => scenario.id)).toEqual(['sc-1']);
    // link-3 исходит из элемента el-sc-3 вложенного подсценария — каскад.
    expect(after.links.map((link) => link.id)).toEqual(['link-1', 'link-2']);
  });

  it('удаляет вложенный подсценарий из children родителя', () => {
    const bus = makeBus();
    const before = makeCanvasGraph();

    const after = bus.execute(before, new RemoveScenario(toScenarioId('sc-3')));

    expect(after.subScenarios[1]?.children).toEqual([]);
    expect(after.links.map((link) => link.id)).toEqual(['link-1', 'link-2']);
  });

  it('несуществующий подсценарий — понятная ошибка, состояние не трогается', () => {
    const bus = makeBus();
    const before = makeCanvasGraph();

    expect(() => bus.execute(before, new RemoveScenario(toScenarioId('sc-404')))).toThrow(/не найден/);
    expect(bus.canUndo()).toBe(false);
  });

  it('execute → undo → redo возвращает исходный граф (включая каскад связей)', () => {
    const bus = makeBus();
    const before = makeCanvasGraph();
    expectUndoRedoRoundtrip(bus, before, new RemoveScenario(toScenarioId('sc-1')));
  });
});
