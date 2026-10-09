import { describe, expect, it } from 'vitest';
import type { ServiceGraph } from '@domain/model/service-graph';
import { toBlueprintId } from '@domain/model/ids';
import type { IClock } from '@application/ports/clock';
import { CommandBus } from './command-bus';
import type { Command } from './command';

class FixedClock implements IClock {
  constructor(private readonly value: Date) {}
  now(): Date {
    return this.value;
  }
}

// Тестовая команда: переименование карты. Реальные команды — отдельные классы.
class RenameBlueprint implements Command {
  readonly name = 'RenameBlueprint';
  constructor(private readonly title: string) {}
  apply(draft: ServiceGraph): void {
    draft.title = this.title;
  }
}

const graph = (title: string): ServiceGraph => ({
  id: toBlueprintId('bp-1'),
  title,
  homePage: { listItems: [], widgetCards: [] },
  subScenarios: [],
  applicationForms: [],
});

const makeBus = () => new CommandBus({ clock: new FixedClock(new Date('2026-10-09T12:00:00Z')) });

describe('CommandBus', () => {
  it('execute применяет изменение и возвращает новое состояние', () => {
    const bus = makeBus();
    const before = graph('Старое название');

    const after = bus.execute(before, new RenameBlueprint('Новое название'));

    expect(after.title).toBe('Новое название');
    expect(before.title).toBe('Старое название');
  });

  it('undo возвращает состояние в точности (toEqual)', () => {
    const bus = makeBus();
    const before = graph('Старое название');
    const after = bus.execute(before, new RenameBlueprint('Новое название'));

    const undone = bus.undo(after);

    expect(undone).toEqual(before);
  });

  it('redo повторяет изменение после undo', () => {
    const bus = makeBus();
    const before = graph('Старое название');
    const after = bus.execute(before, new RenameBlueprint('Новое название'));
    const undone = bus.undo(after);

    const redone = bus.redo(undone!);

    expect(redone).toEqual(after);
  });

  it('canUndo/canRedo отражают состояние стеков', () => {
    const bus = makeBus();
    expect(bus.canUndo()).toBe(false);
    expect(bus.canRedo()).toBe(false);

    const before = graph('v1');
    const after = bus.execute(before, new RenameBlueprint('v2'));
    expect(bus.canUndo()).toBe(true);

    bus.undo(after);
    expect(bus.canRedo()).toBe(true);
  });

  it('новая команда очищает redo-стек', () => {
    const bus = makeBus();
    const v1 = graph('v1');
    const v2 = bus.execute(v1, new RenameBlueprint('v2'));
    const back = bus.undo(v2)!;
    expect(bus.canRedo()).toBe(true);

    bus.execute(back, new RenameBlueprint('v3'));

    expect(bus.canRedo()).toBe(false);
    expect(bus.redo(back)).toBeNull();
  });

  it('undo/redo на пустых стеках возвращают null', () => {
    const bus = makeBus();
    const current = graph('v1');
    expect(bus.undo(current)).toBeNull();
    expect(bus.redo(current)).toBeNull();
  });

  it('несколько команд откатываются в обратном порядке', () => {
    const bus = makeBus();
    const v1 = graph('v1');
    const v2 = bus.execute(v1, new RenameBlueprint('v2'));
    const v3 = bus.execute(v2, new RenameBlueprint('v3'));

    const back2 = bus.undo(v3);
    expect(back2).toEqual(v2);
    const back1 = bus.undo(back2!);
    expect(back1).toEqual(v1);
  });
});
