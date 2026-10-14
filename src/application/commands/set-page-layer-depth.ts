import type { ServiceGraph } from '@domain/model/service-graph';
import type { PageEntityId } from '@domain/model/ids';
import { computeGraphDepths } from '@domain/graph-depths';
import { validateGraph } from '@domain/invariants';
import type { Command } from './command';
import { preservePageDepths } from './depth-preservation';
import { InvariantViolationError } from './errors';
import { removeNonAdjacentLinks } from './layer-placement';
import { findElementOwnerPageId, findPageById } from './graph-lookup';

// Команда переноса страницы между уровнями навигации (перетаскивание узла
// в другую колонку канваса, dnd): выставляет явный layerDepth; null —
// снятие переопределения (глубина снова производная связей, D7). Главная
// закреплена на нулевом уровне — для неё команда отклоняется.
//
// Каскад связей (решение владельца по N4): связь осмысленна только между
// смежными уровнями «источник + 1 = цель». После переноса рвутся ВСЕ связи
// страницы (входящие и исходящие), для которых это перестало выполняться, —
// связь «через пропуск» уровней не бывает.
export class SetPageLayerDepth implements Command {
  readonly name = 'SetPageLayerDepth';

  constructor(
    private readonly pageId: PageEntityId,
    private readonly layerDepth: number | null,
  ) {}

  apply(draft: ServiceGraph): void {
    // Уровни до мутации: страницы, потерявшие связи, остаются на месте (ADR-15).
    const depthsBeforeRemoval = computeGraphDepths(draft);
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

    // Главная уже отклонена выше — она закреплена на нулевом уровне и поля
    // layerDepth не имеет; у всех остальных видов страниц (подсценарий,
    // форма заявки) поле опционально — undefined снимает переопределение.
    // Проверка по типу, а не оператором 'in': у страницы из графа, где
    // layerDepth ни разу не выставлялся (демо-граф, старые сохранения),
    // свойства физически нет, и 'in' пропускал бы перенос молча (N4).
    (page as { layerDepth?: number }).layerDepth = this.layerDepth ?? undefined;

    // Каскад N4: глубины после переноса; связи страницы, у которых уровни
    // перестали быть смежными, рвутся.
    removeNonAdjacentLinks(
      draft,
      (link) => link.targetId === page.id || findElementOwnerPageId(draft, link.sourceElementId) === page.id,
    );

    preservePageDepths(draft, depthsBeforeRemoval, new Set([page.id]));

    const violations = validateGraph(draft);
    if (violations.length > 0) {
      throw new InvariantViolationError(violations);
    }
  }
}
