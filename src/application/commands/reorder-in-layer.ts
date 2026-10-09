import type { ServiceGraph } from '@domain/model/service-graph';
import type { PageEntityId } from '@domain/model/ids';
import { validateGraph } from '@domain/invariants';
import type { Command } from './command';
import { InvariantViolationError } from './errors';
import { walkPages } from './graph-lookup';

// Команда изменения порядка страницы внутри слоя (Epic 002, T-035; D13 —
// порядок персистентен и хранится в orderIndex самой сущности).
//
// orderIndex — единая последовательность всех сущностей-страниц карты:
// в колонке канваса подсценарии и формы перемешаны (D12), поэтому порядок
// внутри слоя — это сортировка колонки по orderIndex. Команда вынимает
// страницу из последовательности и вставляет на целевую позицию, остальные
// сдвигаются; индексы перенумеровываются 0..n-1 без дыр.
//
// Какая колонка у страницы (глубина от корня) и как UI превращает вертикальный
// drag в targetOrderIndex — забота layout-движка и канваса (T-036, S9/S10);
// команда работает только с персистентным порядком.
export class ReorderInLayer implements Command {
  readonly name = 'ReorderInLayer';

  constructor(
    private readonly pageId: PageEntityId,
    private readonly targetOrderIndex: number,
  ) {}

  apply(draft: ServiceGraph): void {
    const pages = [...walkPages(draft)].sort((left, right) => left.orderIndex - right.orderIndex);
    const from = pages.findIndex((page) => page.id === this.pageId);
    if (from < 0) {
      throw new Error(`Страница не найдена: ${this.pageId}`);
    }

    const to = Math.min(Math.max(this.targetOrderIndex, 0), pages.length - 1);
    const [moved] = pages.splice(from, 1);
    pages.splice(to, 0, moved!);
    pages.forEach((page, index) => {
      page.orderIndex = index;
    });

    const violations = validateGraph(draft);
    if (violations.length > 0) {
      throw new InvariantViolationError(violations);
    }
  }
}
