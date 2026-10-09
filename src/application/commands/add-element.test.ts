import { describe, expect, it } from 'vitest';
import type { Attachment, SelectList } from '@domain/model/form-components';
import {
  toApplicationFormId,
  toElementId,
  toFormComponentId,
  toFormStepId,
  toScenarioId,
} from '@domain/model/ids';
import { InvariantViolationError } from './errors';
import { AddElement } from './add-element';
import { expectUndoRedoRoundtrip, makeBus, makeCanvasGraph } from './canvas-graph.fixture';

const attachment = (id: string): Attachment => ({
  id: toFormComponentId(id),
  kind: 'attachment',
  label: 'Файл',
  required: false,
  allowedTypes: ['.pdf'],
});

const radioList = (id: string, options: number): SelectList => ({
  id: toFormComponentId(id),
  kind: 'selectList',
  label: 'Выбор',
  required: false,
  displayType: 'radio',
  multiSelect: false,
  options: Array.from({ length: options }, (_, index) => ({
    label: `Вариант ${index + 1}`,
    value: `v${index + 1}`,
  })),
});

describe('AddElement (T-035)', () => {
  it('добавляет ListItem на Главную', () => {
    const bus = makeBus();
    const before = makeCanvasGraph();

    const after = bus.execute(
      before,
      new AddElement({ kind: 'homeListItems' }, { id: toElementId('el-new'), title: 'Новый пункт' }),
    );

    expect(after.homePage?.listItems.map((item) => item.id)).toEqual(['el-home-1', 'el-new']);
    expect(before.homePage?.listItems).toHaveLength(1);
  });

  it('добавляет WidgetCard на Главную', () => {
    const bus = makeBus();
    const before = makeCanvasGraph();

    const after = bus.execute(
      before,
      new AddElement({ kind: 'homeWidgetCards' }, { id: toElementId('el-widget-2'), title: 'Виджет 2' }),
    );

    expect(after.homePage?.widgetCards.map((card) => card.id)).toEqual(['el-widget-1', 'el-widget-2']);
  });

  it('добавляет ListItem во вложенный подсценарий (children)', () => {
    const bus = makeBus();
    const before = makeCanvasGraph();

    const after = bus.execute(
      before,
      new AddElement(
        { kind: 'subScenarioListItems', scenarioId: toScenarioId('sc-3') },
        { id: toElementId('el-new'), title: 'Новый пункт' },
      ),
    );

    expect(after.subScenarios[1]?.children?.[0]?.listItems.map((item) => item.id)).toEqual([
      'el-sc-3',
      'el-new',
    ]);
  });

  it('добавляет компонент формы на шаг формы', () => {
    const bus = makeBus();
    const before = makeCanvasGraph();

    const after = bus.execute(
      before,
      new AddElement(
        { kind: 'formStepComponents', formId: toApplicationFormId('form-1'), stepId: toFormStepId('step-2') },
        radioList('cmp-new', 3),
      ),
    );

    expect(after.applicationForms[0]?.steps[1]?.components.map((component) => component.id)).toEqual([
      'cmp-new',
    ]);
  });

  it('второй attachment на форму — InvariantViolationError, состояние не трогается', () => {
    const bus = makeBus();
    const before = makeCanvasGraph();
    const withFirst = bus.execute(
      before,
      new AddElement(
        { kind: 'formStepComponents', formId: toApplicationFormId('form-1'), stepId: toFormStepId('step-1') },
        attachment('cmp-att-1'),
      ),
    );

    expect(() =>
      bus.execute(
        withFirst,
        new AddElement(
          {
            kind: 'formStepComponents',
            formId: toApplicationFormId('form-1'),
            stepId: toFormStepId('step-2'),
          },
          attachment('cmp-att-2'),
        ),
      ),
    ).toThrow(InvariantViolationError);
    // Неудачная команда не попадает в историю.
    expect(bus.undo(withFirst)).toEqual(before);
  });

  it('Главная отсутствует (D8) — понятная ошибка', () => {
    const bus = makeBus();
    const withoutHome = { ...makeCanvasGraph(), homePage: undefined };

    expect(() =>
      bus.execute(
        withoutHome,
        new AddElement({ kind: 'homeListItems' }, { id: toElementId('el-new'), title: 'Пункт' }),
      ),
    ).toThrow(/Главная страница отсутствует/);
  });

  it('несуществующие подсценарий/форма/шаг — понятные ошибки', () => {
    const bus = makeBus();
    const before = makeCanvasGraph();

    expect(() =>
      bus.execute(
        before,
        new AddElement(
          { kind: 'subScenarioListItems', scenarioId: toScenarioId('sc-404') },
          { id: toElementId('el-1'), title: 'П' },
        ),
      ),
    ).toThrow(/Подсценарий не найден/);
    expect(() =>
      bus.execute(
        before,
        new AddElement(
          {
            kind: 'formStepComponents',
            formId: toApplicationFormId('form-404'),
            stepId: toFormStepId('step-1'),
          },
          radioList('cmp-1', 2),
        ),
      ),
    ).toThrow(/Форма не найдена/);
    expect(() =>
      bus.execute(
        before,
        new AddElement(
          {
            kind: 'formStepComponents',
            formId: toApplicationFormId('form-1'),
            stepId: toFormStepId('step-404'),
          },
          radioList('cmp-1', 2),
        ),
      ),
    ).toThrow(/Шаг не найден/);
  });

  it('execute → undo → redo возвращает исходный граф', () => {
    const bus = makeBus();
    const before = makeCanvasGraph();
    expectUndoRedoRoundtrip(
      bus,
      before,
      new AddElement({ kind: 'homeListItems' }, { id: toElementId('el-new'), title: 'Новый пункт' }),
    );
  });
});
