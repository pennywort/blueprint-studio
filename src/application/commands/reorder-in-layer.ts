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
// Позиция задаётся якорем — соседней страницей колонки и стороной от неё,
// как у MoveElement (ревью A3, R3): UI не считает индексы общей
// последовательности, команда сама находит якорь ПОСЛЕ изъятия страницы.
// Какая колонка у страницы (глубина от корня) — забота layout-движка (T-036).

export type PageDropAnchor = {
  /** Страница-якорь той же колонки: перемещаемая встаёт до/после неё. */
  pageId: PageEntityId;
  placement: 'before' | 'after';
};

export class ReorderInLayer implements Command {
  readonly name = 'ReorderInLayer';

  constructor(
    private readonly pageId: PageEntityId,
    private readonly anchor: PageDropAnchor,
  ) {}

  apply(draft: ServiceGraph): void {
    const pages = [...walkPages(draft)].sort((left, right) => left.orderIndex - right.orderIndex);
    const from = pages.findIndex((page) => page.id === this.pageId);
    if (from < 0) {
      throw new Error(`Страница не найдена: ${this.pageId}`);
    }

    const [moved] = pages.splice(from, 1);
    const anchorIndex = pages.findIndex((page) => page.id === this.anchor.pageId);
    if (anchorIndex < 0) {
      throw new Error(`Страница-якорь не найдена: ${this.anchor.pageId}`);
    }
    pages.splice(this.anchor.placement === 'before' ? anchorIndex : anchorIndex + 1, 0, moved!);
    pages.forEach((page, index) => {
      page.orderIndex = index;
    });

    const violations = validateGraph(draft);
    if (violations.length > 0) {
      throw new InvariantViolationError(violations);
    }
  }
}
