import { describe, expect, it } from 'vitest';
import type { SelectList } from '@domain/model/form-components';
import { toApplicationFormId, toElementId, toFormComponentId, toFormStepId } from '@domain/model/ids';
import { InvariantViolationError } from './errors';
import { AddElement } from './add-element';
import { UpdateElementProps } from './update-element-props';
import { expectUndoRedoRoundtrip, makeBus, makeCanvasGraph } from './canvas-graph.fixture';

describe('UpdateElementProps (T-035)', () => {
  it('обновляет атрибуты компонента формы', () => {
    const bus = makeBus();
    const before = makeCanvasGraph();

    const after = bus.execute(
      before,
      new UpdateElementProps(toFormComponentId('cmp-1'), { label: 'ФИО', required: true }),
    );

    const component = after.applicationForms[0]?.steps[0]?.components[0];
    expect(component).toMatchObject({ label: 'ФИО', required: true, kind: 'textField' });
    // Исходный граф не мутирует.
    expect(before.applicationForms[0]?.steps[0]?.components[0]).toMatchObject({
      label: 'Поле',
      required: false,
    });
  });

  it('обновляет атрибуты элемента страницы (ListItem)', () => {
    const bus = makeBus();
    const before = makeCanvasGraph();

    const after = bus.execute(
      before,
      new UpdateElementProps(toElementId('el-home-1'), { title: 'Новое название' }),
    );

    expect(after.homePage?.listItems[0]?.title).toBe('Новое название');
  });

  it('запрещает менять id и kind элемента', () => {
    const bus = makeBus();
    const before = makeCanvasGraph();

    expect(() =>
      bus.execute(before, new UpdateElementProps(toFormComponentId('cmp-1'), { id: 'cmp-x' } as never)),
    ).toThrow(/не меняет id\/kind/);
  });

  it('атрибуты вне схемы элемента отклоняются zod-валидацией', () => {
    const bus = makeBus();
    const before = makeCanvasGraph();

    expect(() =>
      bus.execute(before, new UpdateElementProps(toFormComponentId('cmp-1'), { required: 'да' } as never)),
    ).toThrow(/Недопустимые атрибуты/);
  });

  it('патч, нарушающий инвариант (radio > 5 вариантов), — InvariantViolationError', () => {
    const bus = makeBus();
    const before = makeCanvasGraph();
    const radio: SelectList = {
      id: toFormComponentId('cmp-radio'),
      kind: 'selectList',
      label: 'Выбор',
      required: false,
      displayType: 'radio',
      multiSelect: false,
      options: [
        { label: 'А', value: 'a' },
        { label: 'Б', value: 'b' },
      ],
    };
    const withRadio = bus.execute(
      before,
      new AddElement(
        { kind: 'formStepComponents', formId: toApplicationFormId('form-1'), stepId: toFormStepId('step-1') },
        radio,
      ),
    );

    const sixOptions = Array.from({ length: 6 }, (_, index) => ({ label: `В${index}`, value: `v${index}` }));
    expect(() =>
      bus.execute(withRadio, new UpdateElementProps(toFormComponentId('cmp-radio'), { options: sixOptions })),
    ).toThrow(InvariantViolationError);
  });

  it('несуществующий элемент — понятная ошибка', () => {
    const bus = makeBus();
    const before = makeCanvasGraph();

    expect(() => bus.execute(before, new UpdateElementProps(toElementId('el-404'), { title: 'X' }))).toThrow(
      /Элемент не найден/,
    );
  });

  it('execute → undo → redo возвращает исходный граф', () => {
    const bus = makeBus();
    const before = makeCanvasGraph();
    expectUndoRedoRoundtrip(
      bus,
      before,
      new UpdateElementProps(toFormComponentId('cmp-1'), { label: 'ФИО' }),
    );
  });
});
