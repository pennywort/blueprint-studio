import type { ServiceGraph } from '@domain/model/service-graph';
import { computeGraphDepths } from '@domain/graph-depths';
import { computeFormElementDepths } from '@domain/step-element-depths';
import { computeAllFormStepDepths } from '@domain/form-step-depths';
import { setPageLayerDepth, walkPageEntries } from '@domain/graph-walk';

// Блок без связей остаётся на своём уровне (ADR-15, [owner 2026-10-13]):
// уровень страницы выводится из связей, и после разрыва входящей связи
// страница «падала» в нулевую колонку к Главной. Команды, которые рвут
// связи (удаление связи/элемента/страницы, каскады переноса), вызывают это
// ПОСЛЕ мутации: страницы, чей уровень изменился, закрепляются на прежнем
// уровне явным layerDepth. exclude — страницы, чей уровень команда меняет
// намеренно (перенос dnd, новая цель связи).
export function preservePageDepths(
  draft: ServiceGraph,
  depthsBefore: ReadonlyMap<string, number>,
  exclude: ReadonlySet<string> = new Set(),
): void {
  const depthsAfter = computeGraphDepths(draft);
  for (const entry of walkPageEntries(draft)) {
    const pageId = entry.page.id;
    if (entry.kind === 'home' || exclude.has(pageId)) {
      continue; // Главная закреплена на нулевом уровне и поля layerDepth не имеет
    }
    const before = depthsBefore.get(pageId);
    if (before !== undefined && depthsAfter.get(pageId) !== before) {
      setPageLayerDepth(entry, before);
    }
  }
}

// То же правило ADR-15 для элементов внутри шага формы [owner 2026-10-13]:
// колонка элемента выводится из правил «Сложной логики», и цель, потерявшая
// правило, «падала» бы в нулевую колонку шага. Команды, рвущие правила,
// снимают уровни ДО мутации (computeFormElementDepths) и вызывают это ПОСЛЕ:
// элемент, чья колонка изменилась, закрепляется явным layerDepth.
// exclude — элементы, чью колонку команда меняет намеренно (перенос dnd).
export function preserveFormElementDepths(
  draft: ServiceGraph,
  depthsBefore: ReadonlyMap<string, number>,
  exclude: ReadonlySet<string> = new Set(),
): void {
  const depthsAfter = computeFormElementDepths(draft);
  for (const form of draft.applicationForms) {
    for (const step of form.steps) {
      for (const component of step.elements) {
        if (exclude.has(component.id)) {
          continue;
        }
        const before = depthsBefore.get(component.id);
        if (before !== undefined && depthsAfter.get(component.id) !== before) {
          component.layerDepth = before;
        }
      }
    }
  }
}

// То же правило ADR-15 для шагов формы [owner 2026-10-14]: уровень шага
// выводится из переходов, и шаг, потерявший входящий переход, «падал» бы
// на первый уровень формы. Команды, рвущие переходы, снимают уровни ДО
// мутации (computeAllFormStepDepths) и вызывают это ПОСЛЕ. exclude — шаги,
// чей уровень команда меняет намеренно (перенос dnd, новая цель перехода).
export function preserveFormStepDepths(
  draft: ServiceGraph,
  depthsBefore: ReadonlyMap<string, number>,
  exclude: ReadonlySet<string> = new Set(),
): void {
  const depthsAfter = computeAllFormStepDepths(draft);
  for (const form of draft.applicationForms) {
    for (const step of form.steps) {
      if (exclude.has(step.id)) {
        continue;
      }
      const before = depthsBefore.get(step.id);
      if (before !== undefined && depthsAfter.get(step.id) !== before) {
        step.layerDepth = before;
      }
    }
  }
}
