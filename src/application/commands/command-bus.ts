import { applyPatches, enablePatches, produceWithPatches, type Patch } from 'immer';
import type { ServiceGraph } from '@domain/model/service-graph';
import type { IClock } from '@application/ports/clock';
import type { Command } from './command';

// Плагин патчей Immer включается один раз на модуль шины — без этого
// produceWithPatches падает в рантайме.
enablePatches();

export type ExecutedCommand = {
  command: Command;
  patches: Patch[];
  inversePatches: Patch[];
  executedAt: Date;
};

// Шина команд (конституция, железное правило 1): единственный способ изменить
// ServiceGraph. produceWithPatches даёт пару патчей do/undo — это основа
// undo/redo и будущего версионирования (патч-цепочки).
export class CommandBus {
  private undoStack: ExecutedCommand[] = [];
  private redoStack: ExecutedCommand[] = [];

  // Деструктуризация в конструкторе обязательна: Awilix PROXY + минификация
  // production-сборки (конституция, железное правило 7).
  constructor(private readonly deps: { clock: IClock }) {}

  execute(current: ServiceGraph, command: Command): ServiceGraph {
    const [, patches, inversePatches] = produceWithPatches(current, (draft) => {
      command.apply(draft);
    });

    this.undoStack.push({ command, patches, inversePatches, executedAt: this.deps.clock.now() });
    // Новая команда очищает redo-стек — иначе история перестаёт быть линейной.
    this.redoStack = [];

    return applyPatches(current, patches);
  }

  undo(current: ServiceGraph): ServiceGraph | null {
    const last = this.undoStack.pop();
    if (!last) return null;

    this.redoStack.push(last);
    return applyPatches(current, last.inversePatches);
  }

  redo(current: ServiceGraph): ServiceGraph | null {
    const last = this.redoStack.pop();
    if (!last) return null;

    this.undoStack.push(last);
    return applyPatches(current, last.patches);
  }

  // Сброс истории: граф заменён целиком (загрузка карты из хранилища, T-053) —
  // патчи прежней истории к новому графу неприменимы.
  reset(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }
}
