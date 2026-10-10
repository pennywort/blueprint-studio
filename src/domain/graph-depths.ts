import type { ServiceGraph } from './model/service-graph';
import type { SubScenario } from './model/scenario';

// Глубины страниц графа (Epic 002, T-036, D7/D8/D12/D13): глубина страницы —
// длина кратчайшего пути от корня (BFS по links). Ребро «элемент → страница»
// считается ребром «страница-владелец элемента → страница-цель».
//
// Главная, если есть, — глубина 0; Главная необязательна (D8), поэтому корни
// определяются общим правилом: страницы без входящих рёбер. Каждый несвязанный
// подграф раскладывается от своего корня. Формы заявки — на общих основаниях
// (D12): глубина по входящим связям, если они есть, иначе форма — корень.
//
// Чистая функция доменного слоя: без внешних импортов, работает и на
// замороженном состоянии, и на черновике Immer внутри команд.

function collectSubScenarioIds(subScenarios: SubScenario[], into: string[]): void {
  for (const scenario of subScenarios) {
    into.push(scenario.id);
    if (scenario.children) {
      collectSubScenarioIds(scenario.children, into);
    }
  }
}

function collectSubScenarioElementIds(subScenarios: SubScenario[], into: Map<string, string>): void {
  for (const scenario of subScenarios) {
    for (const item of scenario.listItems) {
      into.set(item.id, scenario.id);
    }
    if (scenario.children) {
      collectSubScenarioElementIds(scenario.children, into);
    }
  }
}

// Глубина каждой страницы карты. Ключи — id страниц (брендированные id
// приводятся к string, чтобы функция не зависела от вида страницы).
export function computeGraphDepths(graph: ServiceGraph): ReadonlyMap<string, number> {
  const pageIds: string[] = [];
  if (graph.homePage) {
    pageIds.push(graph.homePage.id);
  }
  collectSubScenarioIds(graph.subScenarios, pageIds);
  for (const form of graph.applicationForms) {
    pageIds.push(form.id);
  }
  const pageSet = new Set(pageIds);

  // Владелец элемента → страница: источник связи — конкретный элемент (D9),
  // а ребро глубин идёт между страницами.
  const elementOwner = new Map<string, string>();
  if (graph.homePage) {
    for (const item of graph.homePage.listItems) {
      elementOwner.set(item.id, graph.homePage.id);
    }
    for (const card of graph.homePage.widgetCards) {
      elementOwner.set(card.id, graph.homePage.id);
    }
  }
  collectSubScenarioElementIds(graph.subScenarios, elementOwner);
  for (const form of graph.applicationForms) {
    for (const step of form.steps) {
      for (const component of step.components) {
        elementOwner.set(component.id, form.id);
      }
    }
  }

  const outgoing = new Map<string, string[]>();
  const hasIncoming = new Set<string>();
  for (const link of graph.links) {
    const source = elementOwner.get(link.sourceElementId);
    // Битые ссылки (элемент/цель удалены) и петли не участвуют в глубинах.
    if (!source || !pageSet.has(link.targetId) || source === link.targetId) {
      continue;
    }
    const targets = outgoing.get(source) ?? [];
    targets.push(link.targetId);
    outgoing.set(source, targets);
    hasIncoming.add(link.targetId);
  }

  // BFS с релаксацией: глубина — кратчайший путь от любого корня.
  const depths = new Map<string, number>();
  const queue: string[] = [];
  for (const id of pageIds) {
    if (!hasIncoming.has(id)) {
      depths.set(id, 0);
      queue.push(id);
    }
  }
  while (queue.length > 0) {
    const id = queue.shift()!;
    const depth = depths.get(id)!;
    for (const next of outgoing.get(id) ?? []) {
      const known = depths.get(next);
      if (known === undefined || depth + 1 < known) {
        depths.set(next, depth + 1);
        queue.push(next);
      }
    }
  }

  // Замкнутый цикл без корня недостижим при связях через UI, но битые данные
  // не должны ронять раскладку: оставшиеся страницы встают в нулевую колонку.
  for (const id of pageIds) {
    if (!depths.has(id)) {
      depths.set(id, 0);
    }
  }

  return depths;
}
