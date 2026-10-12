import { describe, expect, it } from 'vitest';
import {
  toApplicationFormId,
  toBlueprintId,
  toElementId,
  toPageId,
  toPageLinkId,
  toScenarioId,
} from '@domain/model/ids';
import { HomePageSchema, ServiceGraphSchema, type ServiceGraph } from '@domain/model/service-graph';
import { ListItemSchema, SubScenarioSchema, WidgetCardSchema } from '@domain/model/scenario';
import { PageLinkSchema } from '@domain/model/page-link';

// T-004 (Epic 002, E0): страницы как верхнеуровневые сущности с orderIndex (D13),
// модель связи элемент → страница с переназначением концов (D7/D12/D13).

const validLink = {
  id: 'link-1',
  sourceElementId: 'el-1',
  targetId: 'sc-1',
};

const minimalGraph = {
  id: 'bp-1',
  title: 'Карта',
  subScenarios: [],
  applicationForms: [],
  links: [],
  logicRules: [],
};

describe('PageLinkSchema (модель связи)', () => {
  it('валидная связь элемент → подсценарий парсится', () => {
    const link = PageLinkSchema.parse(validLink);
    expect(link.id).toBe('link-1');
    expect(link.sourceElementId).toBe('el-1');
    expect(link.targetId).toBe('sc-1');
  });

  it('целью связи может быть форма заявки — форма в слоях на общих основаниях (D12)', () => {
    const link = PageLinkSchema.parse({ ...validLink, targetId: 'form-1' });
    expect(link.targetId).toBe('form-1');
  });

  it('reconnect: связь со стабильным id допускает переназначение цели и источника (D7/D13)', () => {
    const original = PageLinkSchema.parse(validLink);
    // Переназначение — обновление полей той же сущности, id связи не меняется.
    const retargeted = PageLinkSchema.parse({ ...original, targetId: 'sc-2' });
    const resourced = PageLinkSchema.parse({ ...original, sourceElementId: 'el-2' });
    expect(retargeted.id).toBe(original.id);
    expect(retargeted.targetId).toBe('sc-2');
    expect(resourced.id).toBe(original.id);
    expect(resourced.sourceElementId).toBe('el-2');
  });

  it('пустые идентификаторы отклоняются', () => {
    expect(PageLinkSchema.safeParse({ ...validLink, id: '' }).success).toBe(false);
    expect(PageLinkSchema.safeParse({ ...validLink, sourceElementId: '' }).success).toBe(false);
    expect(PageLinkSchema.safeParse({ ...validLink, targetId: '' }).success).toBe(false);
  });
});

describe('Страницы: orderIndex (D13)', () => {
  const subScenario = {
    id: 'sc-1',
    type: 'link' as const,
    title: 'Подсценарий',
    orderIndex: 0,
    listItems: [],
    link: { url: 'https://example.com' },
  };

  const homePage = {
    id: 'home-1',
    orderIndex: 0,
    listItems: [],
    widgetCards: [],
  };

  it('подсценарий и главная с валидным orderIndex парсятся', () => {
    expect(SubScenarioSchema.parse(subScenario).orderIndex).toBe(0);
    expect(HomePageSchema.parse(homePage).orderIndex).toBe(0);
  });

  it('orderIndex обязателен — сущность-страница всегда хранит свою позицию', () => {
    const { orderIndex: _dropped, ...withoutOrder } = subScenario;
    expect(SubScenarioSchema.safeParse(withoutOrder).success).toBe(false);
  });

  it('orderIndex — целое неотрицательное число', () => {
    expect(SubScenarioSchema.safeParse({ ...subScenario, orderIndex: -1 }).success).toBe(false);
    expect(SubScenarioSchema.safeParse({ ...subScenario, orderIndex: 1.5 }).success).toBe(false);
    expect(HomePageSchema.safeParse({ ...homePage, orderIndex: -1 }).success).toBe(false);
    expect(HomePageSchema.safeParse({ ...homePage, orderIndex: 2 }).success).toBe(true);
  });

  it('у элементов страницы (ListItem, WidgetCard) обязателен стабильный id — источник связи (D9)', () => {
    expect(ListItemSchema.safeParse({ title: 'Пункт' }).success).toBe(false);
    expect(ListItemSchema.safeParse({ id: 'el-1', title: 'Пункт' }).success).toBe(true);
    expect(WidgetCardSchema.safeParse({ title: 'Виджет' }).success).toBe(false);
    expect(WidgetCardSchema.safeParse({ id: 'el-2', title: 'Виджет' }).success).toBe(true);
  });
});

describe('ServiceGraphSchema: страницы верхнего уровня и связи', () => {
  it('Главная не обязательна (D8): граф без homePage валиден', () => {
    const graph = ServiceGraphSchema.parse(minimalGraph);
    expect(graph.homePage).toBeUndefined();
  });

  it('одностраничный МИП (D8): единственный узел — форма заявки', () => {
    const graph = ServiceGraphSchema.parse({
      ...minimalGraph,
      applicationForms: [{ id: 'form-1', title: 'Заявка', orderIndex: 0, steps: [] }],
    });
    expect(graph.applicationForms).toHaveLength(1);
    expect(graph.homePage).toBeUndefined();
  });

  it('полный граф: Главная + подсценарии + формы + связи парсятся вместе', () => {
    const graph = ServiceGraphSchema.parse({
      ...minimalGraph,
      homePage: { id: 'home-1', orderIndex: 0, listItems: [{ id: 'el-1', title: 'Пункт' }], widgetCards: [] },
      subScenarios: [
        {
          id: 'sc-1',
          type: 'link',
          title: 'Подсценарий',
          orderIndex: 1,
          listItems: [],
          link: { url: 'https://example.com' },
        },
      ],
      links: [validLink],
    });
    expect(graph.links).toHaveLength(1);
    expect(graph.subScenarios[0]?.orderIndex).toBe(1);
  });

  it('links — обязательная коллекция графа', () => {
    const { links: _dropped, ...withoutLinks } = minimalGraph;
    expect(ServiceGraphSchema.safeParse(withoutLinks).success).toBe(false);
  });

  it('тип ServiceGraph выводится из схемы и совместим с фабриками id', () => {
    const graph: ServiceGraph = {
      id: toBlueprintId('bp-1'),
      title: 'Карта',
      homePage: { id: toPageId('home-1'), orderIndex: 0, listItems: [], widgetCards: [] },
      subScenarios: [],
      applicationForms: [],
      links: [
        {
          id: toPageLinkId('link-1'),
          sourceElementId: toElementId('el-1'),
          targetId: toScenarioId('sc-1'),
        },
      ],
      logicRules: [],
    };
    // Branded-цели: ScenarioId и ApplicationFormId оба допустимы как targetId.
    const formTarget: ServiceGraph['links'][number]['targetId'] = toApplicationFormId('form-1');
    expect(graph.links[0]?.targetId).toBe('sc-1');
    expect(formTarget).toBe('form-1');
  });
});
