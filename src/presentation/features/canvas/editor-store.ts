import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ServiceGraph } from '@domain/model/service-graph';
import type { Command } from '@application/commands/command';
import { InvariantViolationError } from '@application/commands/errors';
import { useContainer } from '@presentation/app/App';
import { useEditorNotifications } from '@presentation/features/notifications/editor-notifications';
import { downloadTextFile, projectFileName } from '@presentation/features/projects/project-file';

// Хранилище графа редактора (ревью A3, R3): граф + CommandBus + undo/redo +
// загрузка/сохранение. TEMPORARY (до effector — запланирован, но не
// установлен): ServiceGraph живёт в React state страницы редактора. Мутации —
// ТОЛЬКО через commandBus.execute/undo/redo (конституция, железное правило 1).
// Начальное значение — graphSeed из DI (демо-граф или нагрузочный граф проекта stress).
// При появлении effector хук заменяется подпиской на стор, сигнатура сохраняется.
export function useEditorStore() {
  const container = useContainer();
  const notifications = useEditorNotifications();
  const commandBus = container.cradle.commandBus;
  const graphRepository = container.cradle.graphRepository;
  const graphFileCodec = container.cradle.graphFileCodec;

  // Проект выбирается query-параметром роута (/editor?project=stress&levels=…).
  const [searchParams] = useSearchParams();
  // История принадлежит одному графу (R-ARC-1, ADR-05): CommandBus — singleton
  // DI и переживает уход со страницы, поэтому при открытии редактора она
  // сбрасывается всегда — даже если сохранённой карты нет и load() вернёт
  // null. Сброс идемпотентен — повторный вызов инициализатора безопасен.
  const [graph, setGraph] = useState<ServiceGraph>(() => {
    commandBus.reset();
    return container.cradle.graphSeed(searchParams.get('project'), searchParams.toString());
  });
  // Актуальный граф в ref: колбэки react-flow не должны зависеть от замыканий
  // на устаревший state, а мутации идут только через CommandBus.
  const graphRef = useRef(graph);

  // Загрузка сохранённой карты при открытии редактора (T-053). Пока её нет
  // в хранилище — демо-граф. Если пользователь успел выполнить команду до
  // окончания загрузки, загруженное не затирает его правки.
  useEffect(() => {
    const initial = graphRef.current;
    let cancelled = false;
    graphRepository
      .load(initial.id)
      .then((loaded) => {
        if (cancelled || !loaded || graphRef.current !== initial) {
          return;
        }
        commandBus.reset();
        graphRef.current = loaded;
        setGraph(loaded);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          notifications.showSaveError(error instanceof Error ? error.message : String(error));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [graphRepository, commandBus, notifications]);

  // «Сохранить» (T-053): текущий граф → IGraphRepository; результат — единый
  // Snackbar страницы (T-023).
  const save = useCallback(() => {
    graphRepository
      .save(graphRef.current)
      .then(() => notifications.showSaveSuccess())
      .catch((error: unknown) =>
        notifications.showSaveError(
          `Не удалось сохранить: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
  }, [graphRepository, notifications]);

  // «Экспорт JSON» [owner 2026-10-15]: текущий граф (с несохранёнными
  // правками) — в файл; по нему состояние карты воспроизводится импортом.
  const exportJson = useCallback(() => {
    const current = graphRef.current;
    downloadTextFile(projectFileName(current.title), graphFileCodec.serialize(current));
  }, [graphFileCodec]);

  const runCommand = useCallback(
    (command: Command) => {
      try {
        const next = commandBus.execute(graphRef.current, command);
        graphRef.current = next;
        setGraph(next);
      } catch (error) {
        // Отказы команд (несуществующая цель и т.п.) — единый Snackbar
        // страницы (T-023), своих снекбаров у канваса нет.
        // Нарушение инвариантов — только человекочитаемые сообщения, без
        // технических rule/path.
        const message =
          error instanceof InvariantViolationError
            ? [...new Set(error.violations.map((violation) => violation.message))].join('; ')
            : error instanceof Error
              ? error.message
              : String(error);
        notifications.showCommandFailure(message);
      }
    },
    [commandBus, notifications],
  );

  const undo = useCallback(() => {
    const previous = commandBus.undo(graphRef.current);
    if (previous) {
      graphRef.current = previous;
      setGraph(previous);
    }
  }, [commandBus]);

  const redo = useCallback(() => {
    const next = commandBus.redo(graphRef.current);
    if (next) {
      graphRef.current = next;
      setGraph(next);
    }
  }, [commandBus]);

  return {
    graph,
    graphRef,
    runCommand,
    undo,
    redo,
    save,
    exportJson,
    canUndo: commandBus.canUndo(),
    canRedo: commandBus.canRedo(),
  };
}
