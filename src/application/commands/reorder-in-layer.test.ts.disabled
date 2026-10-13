import { describe, expect, it } from 'vitest';
import { toApplicationFormId, toScenarioId } from '@domain/model/ids';
import { ReorderInLayer } from './reorder-in-layer';
import { expectUndoRedoRoundtrip, makeBus, makeCanvasGraph } from './canvas-graph.fixture';

// Порядок страниц фикстуры: home-1 (0), sc-1 (1), sc-2 (2), sc-3 (3), form-1 (4).
const orderOf = (graph: ReturnType<typeof makeCanvasGraph>) =>
  [
    ...(graph.homePage ? [graph.homePage] : []),
    ...graph.subScenarios.flatMap((scenario) => [scenario, ...(scenario.children ?? [])]),
    ...graph.applicationForms,
  ]
    .sort((left, right) => left.orderIndex - right.orderIndex)
    .map((page) => page.id);

describe('ReorderInLayer (T-035)', () => {
  it('переносит страницу на целевую позицию, остальные сдвигаются без дыр (D13)', () => {
    const bus = makeBus();
    const before = makeCanvasGraph();

    const after = bus.execute(before, new ReorderInLayer(toScenarioId('sc-1'), 3));

    expect(orderOf(after)).toEqual(['home-1', 'sc-2', 'sc-3', 'sc-1', 'form-1']);
    // Исходный граф не мутирует.
    expect(orderOf(before)).toEqual(['home-1', 'sc-1', 'sc-2', 'sc-3', 'form-1']);
  });

  it('работает с формой заявки — страница в слоях на общих основаниях (D12)', () => {
    const bus = makeBus();
    const before = makeCanvasGraph();

    const after = bus.execute(before, new ReorderInLayer(toApplicationFormId('form-1'), 0));

    expect(orderOf(after)).toEqual(['form-1', 'home-1', 'sc-1', 'sc-2', 'sc-3']);
  });

  it('позиция за пределами диапазона прижимается к краю', () => {
    const bus = makeBus();
    const before = makeCanvasGraph();

    const after = bus.execute(before, new ReorderInLayer(toScenarioId('sc-1'), 99));

    expect(orderOf(after)).toEqual(['home-1', 'sc-2', 'sc-3', 'form-1', 'sc-1']);
  });

  it('перенос на ту же позицию — порядок не меняется', () => {
    const bus = makeBus();
    const before = makeCanvasGraph();

    const after = bus.execute(before, new ReorderInLayer(toScenarioId('sc-2'), 2));

    expect(orderOf(after)).toEqual(orderOf(before));
  });

  it('несуществующая страница — понятная ошибка, состояние не трогается', () => {
    const bus = makeBus();
    const before = makeCanvasGraph();

    expect(() => bus.execute(before, new ReorderInLayer(toScenarioId('sc-404'), 0))).toThrow(
      /Страница не найдена/,
    );
    expect(bus.canUndo()).toBe(false);
  });

  it('execute → undo → redo возвращает исходный граф', () => {
    const bus = makeBus();
    const before = makeCanvasGraph();
    expectUndoRedoRoundtrip(bus, before, new ReorderInLayer(toScenarioId('sc-1'), 3));
  });
});
