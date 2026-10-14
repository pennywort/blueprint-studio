import { useCallback, useState, type RefObject } from 'react';
import type { Connection } from '@xyflow/react';
import type { ServiceGraph } from '@domain/model/service-graph';
import {
  toElementId,
  toLogicRuleId,
  toOptionId,
  toPageLinkId,
  type ElementId,
  type LogicRuleId,
  type PageLinkId,
} from '@domain/model/ids';
import { PageLinkTargetIdSchema, type PageLinkTargetId } from '@domain/model/page-link';
import { connectableTargets, type ConnectableTargets, type ConnectionSource } from '@domain/connection-rules';
import type { Command } from '@application/commands/command';
import type { IIdGenerator } from '@application/ports/id-generator';
import { ConnectElements } from '@application/commands/connect-elements';
import { ReconnectElements } from '@application/commands/reconnect-elements';
import { DisconnectElements } from '@application/commands/disconnect-elements';
import { AddLogicRule } from '@application/commands/add-logic-rule';
import { RemoveLogicRule } from '@application/commands/remove-logic-rule';
import {
  LOGIC_SOURCE_HANDLE_PREFIX,
  flowConnectionToLink,
  parseLogicSourceHandle,
  parseLogicTargetHandle,
  type CanvasEdge,
} from './graph-flow-adapter';

// Источник связи по id source-handle: option Select'а — правило логики,
// иначе — навигационная связь от элемента (id handle = id элемента, D9).
function parseConnectionSource(handleId: string | null | undefined): ConnectionSource | null {
  if (!handleId) {
    return null;
  }
  if (handleId.startsWith(LOGIC_SOURCE_HANDLE_PREFIX)) {
    const logic = parseLogicSourceHandle(handleId);
    return logic ? { kind: 'logic', elementId: logic.elementId, optionId: logic.optionId } : null;
  }
  return { kind: 'navigation', elementId: handleId };
}

// Связи на канвасе (ревью A3, R3): протягивание (допустимые цели по
// доменному правилу connectableTargets), создание, переназначение и
// удаление навигационных связей и правил «Сложной логики» — командами.
export function useConnection(
  graphRef: RefObject<ServiceGraph>,
  runCommand: (command: Command) => void,
  idGenerator: IIdGenerator,
) {
  // Создание связи drag'ом (T-032): Connection → поля связи (адаптер),
  // id — от IIdGenerator; слои доводит сама команда (D7, T-036).
  // Source-handle option'а (T-037) маршрутизируется в AddLogicRule —
  // это правило видимости, а не навигационная связь.
  const connect = useCallback(
    (connection: Connection) => {
      const sourceHandle = connection.sourceHandle ?? '';
      if (sourceHandle.startsWith(LOGIC_SOURCE_HANDLE_PREFIX)) {
        const source = parseLogicSourceHandle(sourceHandle);
        const targetElementId = connection.targetHandle
          ? parseLogicTargetHandle(connection.targetHandle)
          : null;
        if (!source || targetElementId === null) {
          return;
        }
        runCommand(
          new AddLogicRule({
            id: toLogicRuleId(idGenerator.next()),
            sourceElementId: toElementId(source.elementId),
            condition: { kind: 'optionSelected', optionId: toOptionId(source.optionId) },
            targetElementId: toElementId(targetElementId),
          }),
        );
        return;
      }
      const link = flowConnectionToLink(connection);
      if (!link) {
        return; // связь не от элемента (нет sourceHandle) — игнорируем
      }
      runCommand(
        new ConnectElements({
          id: toPageLinkId(idGenerator.next()),
          sourceElementId: link.sourceElementId,
          targetId: link.targetId,
        }),
      );
    },
    [idGenerator, runCommand],
  );

  // Переназначение существующей связи на другой источник/цель (T-032, D7/D13):
  // меняются только переданные концы, id связи стабилен. Рёбра правил
  // «Сложной логики» не переназначаются (адаптер помечает их
  // reconnectable: false, здесь — защита от обхода).
  const reconnect = useCallback(
    (oldEdge: CanvasEdge, connection: Connection) => {
      if (oldEdge.data?.kind === 'logic') {
        return;
      }
      const patch: { sourceElementId?: ElementId; targetId?: PageLinkTargetId } = {};
      if (connection.sourceHandle && connection.sourceHandle !== oldEdge.sourceHandle) {
        patch.sourceElementId = toElementId(connection.sourceHandle);
      }
      if (connection.target && connection.target !== oldEdge.target) {
        patch.targetId = PageLinkTargetIdSchema.parse(connection.target);
      }
      if (patch.sourceElementId === undefined && patch.targetId === undefined) {
        return; // концы не изменились — команда не нужна
      }
      runCommand(new ReconnectElements(toPageLinkId(oldEdge.id), patch));
    },
    [runCommand],
  );

  // Удаление связей (выделенное ребро + Delete/Backspace) — по команде на
  // ребро; ребро правила видимости = удаление правила (T-037, L7).
  const disconnect = useCallback(
    (edges: CanvasEdge[]) => {
      for (const edge of edges) {
        if (edge.data?.kind === 'logic') {
          runCommand(new RemoveLogicRule(edge.id as LogicRuleId));
        } else {
          runCommand(new DisconnectElements(toPageLinkId(edge.id as PageLinkId)));
        }
      }
    },
    [runCommand],
  );

  // Признак «можно соединить» (повторная приёмка, ADR-14): пока тянется
  // связь, допустимые цели — по доменному правилу connectableTargets — их
  // target-handle (невидимый, во всю сущность) принимает drop/клик курсора;
  // в покое принимающих handles нет. Тот же расчёт проверяет связь
  // (isConnectionAllowed).
  const [connectionTargets, setConnectionTargets] = useState<ConnectableTargets | null>(null);
  const startConnection = useCallback((handleId: string | null | undefined) => {
    const source = parseConnectionSource(handleId);
    setConnectionTargets(source ? connectableTargets(graphRef.current, source) : null);
  }, []);
  const endConnection = useCallback(() => setConnectionTargets(null), []);
  const isConnectionAllowed = useCallback((connection: Connection | CanvasEdge): boolean => {
    const source = parseConnectionSource(connection.sourceHandle);
    if (!source) {
      return false;
    }
    const targets = connectableTargets(graphRef.current, source);
    if (source.kind === 'logic') {
      const targetElementId = connection.targetHandle
        ? parseLogicTargetHandle(connection.targetHandle)
        : null;
      return targetElementId !== null && targets.elements.has(targetElementId);
    }
    // Навигационная связь приходит в target-handle блока, не в logic-handle элемента.
    if (connection.targetHandle && parseLogicTargetHandle(connection.targetHandle) !== null) {
      return false;
    }
    return targets.pages.has(connection.target);
  }, []);

  return {
    connect,
    reconnect,
    disconnect,
    startConnection,
    endConnection,
    isConnectionAllowed,
    connectionTargets,
  };
}
