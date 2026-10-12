import type { ServiceGraph } from '@domain/model/service-graph';
import type { PageEntityId } from '@domain/model/ids';
import { validateGraph } from '@domain/invariants';
import type { Command } from './command';
import { InvariantViolationError } from './errors';
import { findPageById } from './graph-lookup';

// Команда переноса страницы между уровнями навигации (перетаскивание узла
// в другую колонку канваса, dnd): выставляет явный layerDepth; null —
// снятие переопределения (глубина снова производная связей, D7). Главная
// закреплена на нулевом уровне — для неё команда отклоняется.
export class SetPageLayerDepth implements Command {
  readonly name = 'SetPageLayerDepth';

  constructor(
    private readonly pageId: PageEntityId,
    private readonly layerDepth: number | null,
  ) {}

  apply(draft: ServiceGraph): void {
    const page = findPageById(draft, this.pageId);
    if (!page) {
      throw new Error(`Страница не найдена: ${this.pageId}`);
    }
    if (draft.homePage && page.id === draft.homePage.id) {
      throw new Error('Главная закреплена на нулевом уровне навигации');
    }
    if (this.layerDepth !== null && (!Number.isInteger(this.layerDepth) || this.layerDepth < 0)) {
      throw new Error(`Недопустимый уровень навигации: ${this.layerDepth}`);
    }

    // homePage не имеет layerDepth (всегда 0); для остальных видов страниц
    // поле опционально — undefined снимает переопределение.
    if ('layerDepth' in page) {
      (page as { layerDepth?: number }).layerDepth = this.layerDepth ?? undefined;
    }

    const violations = validateGraph(draft);
    if (violations.length > 0) {
      throw new InvariantViolationError(violations);
    }
  }
}
