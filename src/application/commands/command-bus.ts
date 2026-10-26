import { applyPatches, enablePatches, produceWithPatches, type Patch } from 'immer';
import type { ServiceGraph } from '@domain/model/service-graph';
import { validateGraph, type InvariantViolation } from '@domain/invariants';
import type { IClock } from '@application/ports/clock';
import type { EditorSettings } from '@application/settings/editor-settings';
import { rulesSettings } from '@application/settings/rules-settings';
import type { Command } from './command';
import { InvariantViolationError } from './errors';

// Плагин патчей Immer включается один раз на модуль шины — без этого
// produceWithPatches падает в рантайме.
enablePatches();

// Нарушения «после», которых не было «до» (конституция §4a п. 6). Сравнение по
// правилу и тексту с учётом количества: путь не годится — индексы сдвигаются
// при удалении соседей.
function newViolations(
  before: readonly InvariantViolation[],
  after: readonly InvariantViolation[],
): InvariantViolation[] {
  const key = (violation: InvariantViolation) => `${violation.rule}\u0000${violation.message}`;
  const remaining = new Map<string, number>();
  for (const violation of before) {
    remaining.set(key(violation), (remaining.get(key(violation)) ?? 0) + 1);
  }
  return after.filter((violation) => {
    const left = remaining.get(key(violation)) ?? 0;
    remaining.set(key(violation), left - 1);
    return left <= 0;
  });
}

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
  constructor(private readonly deps: { clock: IClock; editorSettings: EditorSettings }) {}

  execute(current: ServiceGraph, command: Command): ServiceGraph {
    // Правила — действующие на момент команды (настройки редактора, R-ADM):
    // администратор поменял правило — следующая команда проверяется по новому.
    const rules = this.deps.editorSettings.get(rulesSettings);
    // Инварианты (конституция §4) проверяются здесь, один раз для любой
    // команды (R-ARC-2, AGENTS.md §4a): исключение до записи в историю —
    // граф и история не меняются. Отклоняется только команда, добавившая
    // НОВОЕ нарушение: граф, уже невалидный (старый файл, ужесточённое
    // правило), не блокируется (конституция §4a п. 6). Проверяется готовый
    // граф, а не черновик (R-PERF-5): обход черновика идёт через прокси immer
    // и на большой карте стоил заметную часть команды.
    const [next, patches, inversePatches] = produceWithPatches(current, (draft) => {
      command.apply(draft, { rules });
    });
    const violations = validateGraph(next, rules);
    if (violations.length > 0) {
      const added = newViolations(validateGraph(current, rules), violations);
      if (added.length > 0) {
        throw new InvariantViolationError(added);
      }
    }

    this.undoStack.push({ command, patches, inversePatches, executedAt: this.deps.clock.now() });
    // Новая команда очищает redo-стек — иначе история перестаёт быть линейной.
    this.redoStack = [];

    // Новое состояние уже посчитано produceWithPatches — повторный
    // applyPatches не нужен (ревью A12, R4).
    return next;
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
