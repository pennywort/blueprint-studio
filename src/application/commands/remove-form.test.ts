import { describe, expect, it } from 'vitest';
import { toApplicationFormId } from '@domain/model/ids';
import { RemoveForm } from './remove-form';
import { expectUndoRedoRoundtrip, makeBus, makeCanvasGraph } from './canvas-graph.fixture';

describe('RemoveForm (T-035)', () => {
  it('удаляет форму с каскадом входящих связей', () => {
    const bus = makeBus();
    const before = makeCanvasGraph();

    const after = bus.execute(before, new RemoveForm(toApplicationFormId('form-1')));

    expect(after.applicationForms).toHaveLength(0);
    // link-2 направлена на форму — ушла каскадом; link-1 и link-3 остались.
    expect(after.links.map((link) => link.id)).toEqual(['link-1', 'link-3']);
    expect(before.applicationForms).toHaveLength(1);
  });

  it('несуществующая форма — понятная ошибка, состояние не трогается', () => {
    const bus = makeBus();
    const before = makeCanvasGraph();

    expect(() => bus.execute(before, new RemoveForm(toApplicationFormId('form-404')))).toThrow(
      /Форма не найдена/,
    );
    expect(bus.canUndo()).toBe(false);
  });

  it('execute → undo → redo возвращает исходный граф (включая каскад связей)', () => {
    const bus = makeBus();
    const before = makeCanvasGraph();
    expectUndoRedoRoundtrip(bus, before, new RemoveForm(toApplicationFormId('form-1')));
  });
});
