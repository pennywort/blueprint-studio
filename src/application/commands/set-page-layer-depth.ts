import type { ServiceGraph } from '@domain/model/service-graph';
import type { PageEntityId } from '@domain/model/ids';
import { computeGraphDepths } from '@domain/graph-depths';
import { validateGraph } from '@domain/invariants';
import type { Command } from './command';
import { InvariantViolationError } from './errors';
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
    const depths = computeGraphDepths(draft);
    draft.links = draft.links.filter((link) => {
      const sourcePageId = findElementOwnerPageId(draft, link.sourceElementId);
      const touchesMovedPage = link.targetId === page.id || sourcePageId === page.id;
      if (!touchesMovedPage) {
        return true;
      }
      const sourceDepth = sourcePageId !== null ? depths.get(sourcePageId) : undefined;
      const targetDepth = depths.get(link.targetId);
      if (sourceDepth === undefined || targetDepth === undefined) {
        return true; // битая ссылка — инварианты фиксируют, здесь не трогаем
      }
      return targetDepth === sourceDepth + 1;
    });

    const violations = validateGraph(draft);
    if (violations.length > 0) {
      throw new InvariantViolationError(violations);
    }
  }
}
