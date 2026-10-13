import type { ServiceGraph } from '../model/service-graph';
import type { SubScenario } from '../model/scenario';
import { computeGraphDepths } from '../graph-depths';
import type { InvariantViolation } from './index';

// На нулевом уровне навигации — не больше одного блока (ADR-15, [owner
// 2026-10-13]): корень карты один — Главная или, без неё, единственный
// блок-корень (например, форма одностраничного МИПа, D8).

export const SINGLE_ROOT_LEVEL_RULE = 'single-root-level';

function* walkScenarios(subScenarios: SubScenario[]): Generator<SubScenario> {
  for (const scenario of subScenarios) {
    yield scenario;
    if (scenario.children) {
      yield* walkScenarios(scenario.children);
    }
  }
}

export function checkSingleRootLevel(graph: ServiceGraph): InvariantViolation[] {
  const depths = computeGraphDepths(graph);
  const pages = [
    ...(graph.homePage ? [graph.homePage] : []),
    ...walkScenarios(graph.subScenarios),
    ...graph.applicationForms,
  ].sort((left, right) => left.orderIndex - right.orderIndex);
  const roots = pages.filter((page) => depths.get(page.id) === 0);
  // Главная всегда корень; без неё корнем считается первый по порядку блок.
  const keep = graph.homePage ? graph.homePage.id : roots[0]?.id;
  return roots
    .filter((page) => page.id !== keep)
    .map((page) => ({
      rule: SINGLE_ROOT_LEVEL_RULE,
      path: `pages[${page.id}]`,
      message: 'На нулевом уровне может быть только один блок',
    }));
}
