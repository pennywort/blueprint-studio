import { expect } from 'vitest';
import type { ServiceGraph } from '@domain/model/service-graph';
import type { TextField } from '@domain/model/form-components';
import {
  toApplicationFormId,
  toBlueprintId,
  toElementId,
  toFormComponentId,
  toFormStepId,
  toPageId,
  toPageLinkId,
  toScenarioId,
} from '@domain/model/ids';
import type { IClock } from '@application/ports/clock';
import { CommandBus } from './command-bus';
import type { Command } from './command';

// Общая фикстура тестов команд canvas (Epic 002, T-035): граф с Главной,
// двумя подсценариями верхнего уровня (у второго — вложенный ребёнок, БТ 7),
// формой с двумя шагами и тремя связями. orderIndex — единая
// последовательность страниц 0..4 (D13).

class FixedClock implements IClock {
  now(): Date {
    return new Date('2026-10-10T12:00:00Z');
  }
}

export const makeBus = (): CommandBus => new CommandBus({ clock: new FixedClock() });

export const textField = (id: string): TextField => ({
  id: toFormComponentId(id),
  kind: 'textField',
  label: 'Поле',
  required: false,
  multiline: false,
});

export const makeCanvasGraph = (): ServiceGraph => ({
  id: toBlueprintId('bp-1'),
  title: 'Карта',
  homePage: {
    id: toPageId('home-1'),
    orderIndex: 0,
    elements: [
      { id: toElementId('el-home-1'), kind: 'listItem', title: 'Пункт главной' },
      { id: toElementId('el-widget-1'), kind: 'widgetCard', title: 'Виджет' },
    ],
  },
  subScenarios: [
    {
      id: toScenarioId('sc-1'),
      type: 'link',
      title: 'Подсценарий 1',
      orderIndex: 1,
      elements: [{ id: toElementId('el-sc-1'), kind: 'listItem', title: 'Пункт подсценария' }],
      link: { url: 'https://example.com' },
    },
    {
      id: toScenarioId('sc-2'),
      type: 'navigation',
      title: 'Подсценарий 2',
      orderIndex: 2,
      elements: [],
      children: [
        {
          id: toScenarioId('sc-3'),
          type: 'navigation',
          title: 'Вложенный подсценарий',
          orderIndex: 3,
          elements: [{ id: toElementId('el-sc-3'), kind: 'listItem', title: 'Пункт вложенного' }],
        },
      ],
    },
  ],
  applicationForms: [
    {
      id: toApplicationFormId('form-1'),
      title: 'Форма заявки',
      orderIndex: 4,
      steps: [
        { id: toFormStepId('step-1'), elements: [textField('cmp-1')] },
        { id: toFormStepId('step-2'), elements: [] },
      ],
    },
  ],
  links: [
    { id: toPageLinkId('link-1'), sourceElementId: toElementId('el-home-1'), targetId: toScenarioId('sc-1') },
    {
      id: toPageLinkId('link-2'),
      sourceElementId: toElementId('el-sc-1'),
      targetId: toApplicationFormId('form-1'),
    },
    { id: toPageLinkId('link-3'), sourceElementId: toElementId('el-sc-3'), targetId: toScenarioId('sc-1') },
  ],
  logicRules: [],
});

// Приёмочный контур каждой команды (T-035): execute → undo → redo возвращает
// граф в исходное состояние и воспроизводит результат.
export const expectUndoRedoRoundtrip = (
  bus: CommandBus,
  before: ServiceGraph,
  command: Command,
): ServiceGraph => {
  const after = bus.execute(before, command);
  const undone = bus.undo(after);
  expect(undone).toEqual(before);
  const redone = bus.redo(undone!);
  expect(redone).toEqual(after);
  return after;
};
