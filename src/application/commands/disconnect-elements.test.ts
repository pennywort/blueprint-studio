import { describe, expect, it } from 'vitest';
import { toPageLinkId } from '@domain/model/ids';
import { DisconnectElements } from './disconnect-elements';
import { expectUndoRedoRoundtrip, makeBus, makeCanvasGraph } from './canvas-graph.fixture';

describe('DisconnectElements (T-035)', () => {
  it('удаляет связь; страница-цель остаётся на своей позиции (orderIndex не меняется, D7/D13)', () => {
    const bus = makeBus();
    const before = makeCanvasGraph();

    const after = bus.execute(before, new DisconnectElements(toPageLinkId('link-1')));

    expect(after.links.map((link) => link.id)).toEqual(['link-2', 'link-3']);
    expect(after.subScenarios[0]?.orderIndex).toBe(1);
    expect(before.links).toHaveLength(3);
  });

  it('несуществующая связь — понятная ошибка, состояние не трогается', () => {
    const bus = makeBus();
    const before = makeCanvasGraph();

    expect(() => bus.execute(before, new DisconnectElements(toPageLinkId('link-404')))).toThrow(
      /Связь не найдена/,
    );
    expect(bus.canUndo()).toBe(false);
  });

  it('execute → undo → redo возвращает исходный граф', () => {
    const bus = makeBus();
    const before = makeCanvasGraph();
    expectUndoRedoRoundtrip(bus, before, new DisconnectElements(toPageLinkId('link-1')));
  });
});
