import type { ServiceGraph } from '@domain/model/service-graph';
import type { SubScenario } from '@domain/model/scenario';
import type { InvariantViolation } from '@domain/invariants';
import { findFormComponent } from '@application/commands/graph-lookup';

// Подсветка нарушений инвариантов на канвасе (T-043): violation.path
// (формат инвариантов домена) → id узла и, если путь указывает на элемент,
// id карточки элемента. Сообщения элемента дублируются на его узел — узел
// подсвечен, даже когда элемент скрыт сжатием (T-033).

export type ViolationMarkers = {
  nodes: ReadonlyMap<string, readonly string[]>;
  elements: ReadonlyMap<string, readonly string[]>;
};

function push(target: Map<string, string[]>, id: string, message: string): void {
  const messages = target.get(id) ?? [];
  if (!messages.includes(message)) {
    messages.push(message);
  }
  target.set(id, messages);
}

// subScenarios[i].children[j]… → сценарий по цепочке индексов.
function resolveScenarioPath(graph: ServiceGraph, path: string): SubScenario | null {
  const match = /^subScenarios\[(\d+)\]((?:\.children\[\d+\])*)/.exec(path);
  if (!match) {
    return null;
  }
  let scenario: SubScenario | undefined = graph.subScenarios[Number(match[1])];
  for (const child of match[2]!.matchAll(/\[(\d+)\]/g)) {
    scenario = scenario?.children?.[Number(child[1])];
  }
  return scenario ?? null;
}

export function mapViolationsToCanvas(
  graph: ServiceGraph,
  violations: readonly InvariantViolation[],
): ViolationMarkers {
  const nodes = new Map<string, string[]>();
  const elements = new Map<string, string[]>();

  for (const violation of violations) {
    const { path, message } = violation;

    const form = /^applicationForms\[([^\]]+)\]/.exec(path);
    if (form) {
      push(nodes, form[1]!, message);
      const component = /elements\[([^\]]+)\]/.exec(path);
      if (component) {
        push(elements, component[1]!, message);
      }
      continue;
    }

    const page = /^pages\[([^\]]+)\]/.exec(path);
    if (page) {
      push(nodes, page[1]!, message);
      // Элемент страницы (любой вид, [owner 2026-10-13]) — elementViolationPath.
      const element = /elements\[([^\]]+)\]/.exec(path);
      if (element) {
        push(elements, element[1]!, message);
      }
      continue;
    }

    const scenario = resolveScenarioPath(graph, path);
    if (scenario) {
      push(nodes, scenario.id, message);
      continue;
    }

    // Правило «Сложной логики»: подсвечиваются существующие концы правила
    // и форма, в которой они лежат. Цикл (path 'logicRules') точечно не
    // локализуется — его не допускает AddLogicRule.
    const rule = /^logicRules\[(\d+)\]/.exec(path);
    const logicRule = rule ? graph.logicRules[Number(rule[1])] : undefined;
    if (logicRule) {
      for (const elementId of [logicRule.sourceElementId, logicRule.targetElementId]) {
        const found = findFormComponent(graph, elementId);
        if (found) {
          push(elements, elementId, message);
          push(nodes, found.form.id, message);
        }
      }
    }
  }

  return { nodes, elements };
}
