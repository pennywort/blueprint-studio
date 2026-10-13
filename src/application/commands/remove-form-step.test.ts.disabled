import { describe, expect, it } from 'vitest';
import { toApplicationFormId, toFormStepId } from '@domain/model/ids';
import { RemoveFormStep } from './remove-form-step';
import { expectUndoRedoRoundtrip, makeBus, makeCanvasGraph } from './canvas-graph.fixture';

describe('RemoveFormStep (T-035)', () => {
  it('удаляет шаг вместе с его компонентами', () => {
    const bus = makeBus();
    const before = makeCanvasGraph();

    const after = bus.execute(
      before,
      new RemoveFormStep(toApplicationFormId('form-1'), toFormStepId('step-1')),
    );

    expect(after.applicationForms[0]?.steps.map((step) => step.id)).toEqual(['step-2']);
    expect(before.applicationForms[0]?.steps).toHaveLength(2);
  });

  it('несуществующие форма или шаг — понятные ошибки, состояние не трогается', () => {
    const bus = makeBus();
    const before = makeCanvasGraph();

    expect(() =>
      bus.execute(before, new RemoveFormStep(toApplicationFormId('form-404'), toFormStepId('step-1'))),
    ).toThrow(/Форма не найдена/);
    expect(() =>
      bus.execute(before, new RemoveFormStep(toApplicationFormId('form-1'), toFormStepId('step-404'))),
    ).toThrow(/Шаг не найден/);
    expect(bus.canUndo()).toBe(false);
  });

  it('execute → undo → redo возвращает исходный граф (включая компоненты шага)', () => {
    const bus = makeBus();
    const before = makeCanvasGraph();
    expectUndoRedoRoundtrip(
      bus,
      before,
      new RemoveFormStep(toApplicationFormId('form-1'), toFormStepId('step-1')),
    );
  });
});
