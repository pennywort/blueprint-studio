import { describe, expect, it } from 'vitest';
import { toElementId, toFormComponentId } from '@domain/model/ids';
import { RemoveElement } from './remove-element';
import { expectUndoRedoRoundtrip, makeBus, makeCanvasGraph } from './canvas-graph.fixture';

describe('RemoveElement (T-035)', () => {
  it('удаляет элемент страницы с каскадом его исходящих связей', () => {
    const bus = makeBus();
    const before = makeCanvasGraph();

    const after = bus.execute(before, new RemoveElement(toElementId('el-home-1')));

    expect(after.homePage?.elements.map((element) => element.id)).toEqual(['el-widget-1']);
    // link-1 исходила из el-home-1 — ушла каскадом.
    expect(after.links.map((link) => link.id)).toEqual(['link-2', 'link-3']);
    expect(before.homePage?.elements).toHaveLength(2);
  });

  it('удаляет элемент вложенного подсценария (children) с каскадом связей', () => {
    const bus = makeBus();
    const before = makeCanvasGraph();

    const after = bus.execute(before, new RemoveElement(toElementId('el-sc-3')));

    expect(after.subScenarios[1]?.children?.[0]?.elements).toEqual([]);
    expect(after.links.map((link) => link.id)).toEqual(['link-1', 'link-2']);
  });

  it('удаляет компонент формы с шага', () => {
    const bus = makeBus();
    const before = makeCanvasGraph();

    const after = bus.execute(before, new RemoveElement(toFormComponentId('cmp-1')));

    expect(after.applicationForms[0]?.steps[0]?.elements).toEqual([]);
  });

  it('несуществующий элемент — понятная ошибка, состояние не трогается', () => {
    const bus = makeBus();
    const before = makeCanvasGraph();

    expect(() => bus.execute(before, new RemoveElement(toElementId('el-404')))).toThrow(/Элемент не найден/);
    expect(bus.canUndo()).toBe(false);
  });

  it('execute → undo → redo возвращает исходный граф (включая каскад связей)', () => {
    const bus = makeBus();
    const before = makeCanvasGraph();
    expectUndoRedoRoundtrip(bus, before, new RemoveElement(toElementId('el-home-1')));
  });
});
