import type { ServiceGraph } from '@domain/model/service-graph';
import type { PageLinkId } from '@domain/model/ids';
import { computeGraphDepths } from '@domain/graph-depths';
import { validateGraph } from '@domain/invariants';
import type { Command } from './command';
import { preservePageDepths } from './depth-preservation';
import { InvariantViolationError } from './errors';

// Команда удаления связи (Epic 002, T-035). При отсоединении узел-цель
// остаётся на своей позиции: персистентный orderIndex не меняется (D7/D13),
// визуальную раскладку пересчитает layout-движок (T-036).
export class DisconnectElements implements Command {
  readonly name = 'DisconnectElements';

  constructor(private readonly linkId: PageLinkId) {}

  apply(draft: ServiceGraph): void {
    // Уровни до мутации: страницы, потерявшие связи, остаются на месте (ADR-15).
    const depthsBeforeRemoval = computeGraphDepths(draft);
    const index = draft.links.findIndex((link) => link.id === this.linkId);
    if (index < 0) {
      throw new Error(`Связь не найдена: ${this.linkId}`);
    }

    draft.links.splice(index, 1);

    preservePageDepths(draft, depthsBeforeRemoval);

    const violations = validateGraph(draft);
    if (violations.length > 0) {
      throw new InvariantViolationError(violations);
    }
  }
}
