import { describe, expect, it } from 'vitest';
import type { ServiceGraph } from '@domain/model/service-graph';
import type { Attachment, TextField } from '@domain/model/form-components';
import { toApplicationFormId, toBlueprintId, toFormComponentId, toFormStepId } from '@domain/model/ids';
import type { IClock } from '@application/ports/clock';
import { CommandBus } from './command-bus';
import { AddFormComponent } from './add-form-component';
import { InvariantViolationError } from './errors';

class FixedClock implements IClock {
  now(): Date {
    return new Date('2026-10-09T12:00:00Z');
  }
}

const textField = (id: string): TextField => ({
  id: toFormComponentId(id),
  kind: 'textField',
  label: 'Поле',
  required: false,
  multiline: false,
});

const attachment = (id: string): Attachment => ({
  id: toFormComponentId(id),
  kind: 'attachment',
  label: 'Файл',
  required: false,
  allowedTypes: ['.pdf'],
});

const graphWithForm = (): ServiceGraph => ({
  id: toBlueprintId('bp-1'),
  title: 'Карта',
  homePage: { listItems: [], widgetCards: [] },
  subScenarios: [],
  applicationForms: [
    {
      id: toApplicationFormId('form-1'),
      title: 'Форма',
      steps: [{ id: toFormStepId('step-1'), components: [] }],
    },
  ],
});

const makeBus = () => new CommandBus({ clock: new FixedClock() });

describe('AddFormComponent', () => {
  it('добавляет компонент на указанный шаг формы', () => {
    const bus = makeBus();
    const before = graphWithForm();

    const after = bus.execute(
      before,
      new AddFormComponent(toApplicationFormId('form-1'), toFormStepId('step-1'), textField('cmp-1')),
    );

    expect(after.applicationForms[0]?.steps[0]?.components).toHaveLength(1);
    expect(after.applicationForms[0]?.steps[0]?.components[0]?.kind).toBe('textField');
    // Исходное состояние не мутирует.
    expect(before.applicationForms[0]?.steps[0]?.components).toHaveLength(0);
  });

  it('execute → undo → redo с добавленным компонентом', () => {
    const bus = makeBus();
    const before = graphWithForm();
    const command = new AddFormComponent(
      toApplicationFormId('form-1'),
      toFormStepId('step-1'),
      textField('cmp-1'),
    );

    const after = bus.execute(before, command);
    const undone = bus.undo(after);
    expect(undone).toEqual(before);
    const redone = bus.redo(undone!);
    expect(redone).toEqual(after);
  });

  it('второй attachment на форму — InvariantViolationError, состояние не меняется', () => {
    const bus = makeBus();
    const before = graphWithForm();
    const withFirst = bus.execute(
      before,
      new AddFormComponent(toApplicationFormId('form-1'), toFormStepId('step-1'), attachment('cmp-1')),
    );

    expect(() =>
      bus.execute(
        withFirst,
        new AddFormComponent(toApplicationFormId('form-1'), toFormStepId('step-1'), attachment('cmp-2')),
      ),
    ).toThrow(InvariantViolationError);

    // Неудачная команда не попадает в историю: откатывается только первая.
    expect(bus.canUndo()).toBe(true);
    expect(bus.undo(withFirst)).toEqual(before);
  });

  it('ошибка содержит детали нарушения', () => {
    const bus = makeBus();
    const before = graphWithForm();
    const withFirst = bus.execute(
      before,
      new AddFormComponent(toApplicationFormId('form-1'), toFormStepId('step-1'), attachment('cmp-1')),
    );

    try {
      bus.execute(
        withFirst,
        new AddFormComponent(toApplicationFormId('form-1'), toFormStepId('step-1'), attachment('cmp-2')),
      );
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(InvariantViolationError);
      const violationError = error as InvariantViolationError;
      expect(violationError.violations[0]?.rule).toBe('single-attachment-per-form');
    }
  });

  it('несуществующая форма — понятная ошибка', () => {
    const bus = makeBus();
    const before = graphWithForm();

    expect(() =>
      bus.execute(
        before,
        new AddFormComponent(toApplicationFormId('form-404'), toFormStepId('step-1'), textField('cmp-1')),
      ),
    ).toThrow(/Форма не найдена/);
  });
});
