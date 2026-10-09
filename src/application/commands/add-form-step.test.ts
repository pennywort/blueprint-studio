import { describe, expect, it } from 'vitest';
import { toApplicationFormId, toFormStepId } from '@domain/model/ids';
import { AddFormStep } from './add-form-step';
import { expectUndoRedoRoundtrip, makeBus, makeCanvasGraph } from './canvas-graph.fixture';

describe('AddFormStep (T-035)', () => {
  it('без index добавляет шаг в конец формы', () => {
    const bus = makeBus();
    const before = makeCanvasGraph();

    const after = bus.execute(
      before,
      new AddFormStep(toApplicationFormId('form-1'), {
        id: toFormStepId('step-3'),
        title: 'Шаг 3',
        components: [],
      }),
    );

    expect(after.applicationForms[0]?.steps.map((step) => step.id)).toEqual(['step-1', 'step-2', 'step-3']);
    expect(before.applicationForms[0]?.steps).toHaveLength(2);
  });

  it('с index вставляет шаг в указанную позицию', () => {
    const bus = makeBus();
    const before = makeCanvasGraph();

    const after = bus.execute(
      before,
      new AddFormStep(toApplicationFormId('form-1'), { id: toFormStepId('step-0'), components: [] }, 0),
    );

    expect(after.applicationForms[0]?.steps.map((step) => step.id)).toEqual(['step-0', 'step-1', 'step-2']);
  });

  it('index вне диапазона — понятная ошибка', () => {
    const bus = makeBus();
    const before = makeCanvasGraph();

    expect(() =>
      bus.execute(
        before,
        new AddFormStep(toApplicationFormId('form-1'), { id: toFormStepId('step-x'), components: [] }, 10),
      ),
    ).toThrow(/вне диапазона/);
  });

  it('несуществующая форма — понятная ошибка', () => {
    const bus = makeBus();
    const before = makeCanvasGraph();

    expect(() =>
      bus.execute(
        before,
        new AddFormStep(toApplicationFormId('form-404'), { id: toFormStepId('step-x'), components: [] }),
      ),
    ).toThrow(/Форма не найдена/);
  });

  it('execute → undo → redo возвращает исходный граф', () => {
    const bus = makeBus();
    const before = makeCanvasGraph();
    expectUndoRedoRoundtrip(
      bus,
      before,
      new AddFormStep(toApplicationFormId('form-1'), { id: toFormStepId('step-3'), components: [] }),
    );
  });
});
