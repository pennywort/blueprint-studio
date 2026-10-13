import { describe, expect, it } from 'vitest';
import { toApplicationFormId, toFormStepId } from '@domain/model/ids';
import { AddForm } from './add-form';
import { expectUndoRedoRoundtrip, makeBus, makeCanvasGraph } from './canvas-graph.fixture';

describe('AddForm (T-035)', () => {
  it('добавляет форму со следующим orderIndex — форма в слоях на общих основаниях (D12/D13)', () => {
    const bus = makeBus();
    const before = makeCanvasGraph();

    const after = bus.execute(
      before,
      new AddForm({
        id: toApplicationFormId('form-2'),
        title: 'Вторая форма',
        steps: [{ id: toFormStepId('step-2-1'), elements: [] }],
      }),
    );

    expect(after.applicationForms).toHaveLength(2);
    expect(after.applicationForms[1]?.orderIndex).toBe(5);
    expect(before.applicationForms).toHaveLength(1);
  });

  it('одностраничный МИП (D8): единственная форма пустой карты получает orderIndex 0', () => {
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
      new AddForm({ id: toApplicationFormId('form-1'), title: 'Заявка', steps: [] }),
    );

    expect(after.applicationForms[0]?.orderIndex).toBe(0);
    expect(after.homePage).toBeUndefined();
  });

  it('execute → undo → redo возвращает исходный граф', () => {
    const bus = makeBus();
    const before = makeCanvasGraph();
    expectUndoRedoRoundtrip(
      bus,
      before,
      new AddForm({ id: toApplicationFormId('form-2'), title: 'Вторая форма', steps: [] }),
    );
  });
});
