import { describe, expect, it } from 'vitest';
import type { Connection } from '@xyflow/react';
import type { ServiceGraph } from '@domain/model/service-graph';
import {
  toApplicationFormId,
  toBlueprintId,
  toElementId,
  toFormStepId,
  toPageId,
  toPageLinkId,
  toScenarioId,
} from '@domain/model/ids';
import { flowConnectionToLink, flowNodesToLayerOrder, graphToFlow } from './graph-flow-adapter';

// T-030 (Epic 002): адаптер graph ↔ flow — граница domain ↔ react-flow.

const makeGraph = (): ServiceGraph => ({
  id: toBlueprintId('bp-1'),
  title: 'Карта',
  homePage: {
    id: toPageId('home-1'),
    orderIndex: 0,
    listItems: [{ id: toElementId('el-home-1'), title: 'Пункт главной' }],
    widgetCards: [{ id: toElementId('el-widget-1'), title: 'Виджет' }],
  },
  subScenarios: [
    {
      id: toScenarioId('sc-1'),
      type: 'navigation',
      title: 'Подсценарий 1',
      orderIndex: 1,
      listItems: [{ id: toElementId('el-sc-1'), title: 'Пункт подсценария' }],
      children: [
        {
          id: toScenarioId('sc-2'),
          type: 'navigation',
          title: 'Вложенный',
          orderIndex: 2,
          listItems: [],
        },
      ],
    },
  ],
  applicationForms: [
    {
      id: toApplicationFormId('form-1'),
      title: 'Форма А',
      orderIndex: 3,
      steps: [{ id: toFormStepId('step-1'), components: [] }],
    },
    { id: toApplicationFormId('form-2'), title: 'Форма Б', orderIndex: 4, steps: [] },
  ],
  links: [
    { id: toPageLinkId('link-1'), sourceElementId: toElementId('el-home-1'), targetId: toScenarioId('sc-1') },
    {
      id: toPageLinkId('link-2'),
      sourceElementId: toElementId('el-sc-1'),
      targetId: toApplicationFormId('form-1'),
    },
  ],
});

describe('graphToFlow (T-030): страницы → узлы', () => {
  it('Главная, подсценарии (включая вложенные) и формы → узлы нужных типов', () => {
    const { nodes } = graphToFlow(makeGraph());

    expect(nodes.map((node) => [node.id, node.type])).toEqual([
      ['home-1', 'home'],
      ['sc-1', 'subScenario'],
      ['sc-2', 'subScenario'],
      ['form-1', 'form'],
      ['form-2', 'form'],
    ]);
  });

  it('данные узла несут заголовок и персистентный orderIndex (D13)', () => {
    const { nodes } = graphToFlow(makeGraph());

    expect(nodes.find((node) => node.id === 'home-1')?.data).toEqual({ title: 'Главная', orderIndex: 0 });
    expect(nodes.find((node) => node.id === 'sc-1')?.data).toEqual({ title: 'Подсценарий 1', orderIndex: 1 });
    expect(nodes.find((node) => node.id === 'form-2')?.data).toEqual({ title: 'Форма Б', orderIndex: 4 });
  });

  it('отсутствие Главной (D8): граф без homePage маппится без узла home', () => {
    const { nodes } = graphToFlow({ ...makeGraph(), homePage: undefined });

    expect(nodes.some((node) => node.type === 'home')).toBe(false);
    expect(nodes).toHaveLength(4);
  });

  it('несколько форм заявки (D8): каждая — отдельный узел form', () => {
    const { nodes } = graphToFlow(makeGraph());

    expect(nodes.filter((node) => node.type === 'form').map((node) => node.id)).toEqual(['form-1', 'form-2']);
  });

  it('стабильность id: узел получает id сущности, ребро — id связи; повторный маппинг идентичен', () => {
    const graph = makeGraph();
    const first = graphToFlow(graph);
    const second = graphToFlow(graph);

    expect(first).toEqual(second);
    expect(first.edges.map((edge) => edge.id)).toEqual(['link-1', 'link-2']);
  });

  it('позиции приходят извне (позиции — T-036); без них узлы в (0, 0)', () => {
    const withPositions = graphToFlow(makeGraph(), { 'sc-1': { x: 320, y: 160 } });
    const withoutPositions = graphToFlow(makeGraph());

    expect(withPositions.nodes.find((node) => node.id === 'sc-1')?.position).toEqual({ x: 320, y: 160 });
    expect(withoutPositions.nodes.every((node) => node.position.x === 0 && node.position.y === 0)).toBe(true);
  });
});

describe('graphToFlow (T-030): связи → рёбра', () => {
  it('ребро выходит из узла-владельца элемента, элемент — в sourceHandle (D9)', () => {
    const { edges } = graphToFlow(makeGraph());

    expect(edges).toEqual([
      { id: 'link-1', source: 'home-1', sourceHandle: 'el-home-1', target: 'sc-1' },
      { id: 'link-2', source: 'sc-1', sourceHandle: 'el-sc-1', target: 'form-1' },
    ]);
  });

  it('связь из виджет-карточки Главной тоже выходит из узла home', () => {
    const graph = makeGraph();
    graph.links.push({
      id: toPageLinkId('link-3'),
      sourceElementId: toElementId('el-widget-1'),
      targetId: toScenarioId('sc-1'),
    });

    const { edges } = graphToFlow(graph);

    expect(edges[2]).toMatchObject({ id: 'link-3', source: 'home-1', sourceHandle: 'el-widget-1' });
  });

  it('битая ссылка (элемент или цель не существуют) не роняет маппинг — ребро пропускается', () => {
    const graph = makeGraph();
    graph.links.push(
      {
        id: toPageLinkId('link-bad-1'),
        sourceElementId: toElementId('el-404'),
        targetId: toScenarioId('sc-1'),
      },
      {
        id: toPageLinkId('link-bad-2'),
        sourceElementId: toElementId('el-home-1'),
        targetId: toScenarioId('sc-404'),
      },
    );

    const { edges } = graphToFlow(graph);

    expect(edges.map((edge) => edge.id)).toEqual(['link-1', 'link-2']);
  });
});

describe('обратный маппинг (T-030): только связи и порядок внутри слоёв', () => {
  it('flowConnectionToLink: Connection → поля связи для ConnectElements (T-035)', () => {
    const connection: Connection = {
      source: 'home-1',
      sourceHandle: 'el-home-1',
      target: 'sc-1',
      targetHandle: null,
    };

    expect(flowConnectionToLink(connection)).toEqual({ sourceElementId: 'el-home-1', targetId: 'sc-1' });
  });

  it('flowConnectionToLink: без sourceHandle связь не от элемента (D9) — не маппится', () => {
    const connection: Connection = {
      source: 'home-1',
      sourceHandle: null,
      target: 'sc-1',
      targetHandle: null,
    };

    expect(flowConnectionToLink(connection)).toBeNull();
  });

  it('flowNodesToLayerOrder: порядок внутри слоя — по координате Y после drag', () => {
    const { nodes } = graphToFlow(makeGraph(), {
      'sc-1': { x: 0, y: 300 },
      'form-1': { x: 0, y: 100 },
      'form-2': { x: 0, y: 200 },
    });
    const layerNodes = nodes.filter((node) => ['sc-1', 'form-1', 'form-2'].includes(node.id));

    expect(flowNodesToLayerOrder(layerNodes)).toEqual(['form-1', 'form-2', 'sc-1']);
  });
});
