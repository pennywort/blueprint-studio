import { describe, expect, it } from 'vitest';
import { toApplicationFormId, toElementId, toPageLinkId, toScenarioId } from '@domain/model/ids';
import { ConnectElements } from './connect-elements';
import { expectUndoRedoRoundtrip, makeBus, makeCanvasGraph } from './canvas-graph.fixture';

describe('ConnectElements (T-035)', () => {
  it('создаёт связь элемент → подсценарий', () => {
    const bus = makeBus();
    const before = makeCanvasGraph();

    const after = bus.execute(
      before,
      new ConnectElements({
        id: toPageLinkId('link-4'),
        sourceElementId: toElementId('el-widget-1'),
        targetId: toScenarioId('sc-2'),
      }),
    );

    expect(after.links).toHaveLength(4);
    expect(after.links[3]).toMatchObject({ id: 'link-4', sourceElementId: 'el-widget-1', targetId: 'sc-2' });
    expect(before.links).toHaveLength(3);
  });

  it('целью связи может быть форма заявки (D12)', () => {
    const bus = makeBus();
    const before = makeCanvasGraph();

    const after = bus.execute(
      before,
      new ConnectElements({
        id: toPageLinkId('link-4'),
        sourceElementId: toElementId('el-widget-1'),
        targetId: toApplicationFormId('form-1'),
      }),
    );

    expect(after.links[3]?.targetId).toBe('form-1');
  });

  it('источником может быть элемент вложенного подсценария', () => {
    const bus = makeBus();
    const before = makeCanvasGraph();

    const after = bus.execute(
      before,
      new ConnectElements({
        id: toPageLinkId('link-4'),
        sourceElementId: toElementId('el-sc-3'),
        targetId: toScenarioId('sc-2'),
      }),
    );

    expect(after.links).toHaveLength(4);
  });

  it('несуществующий источник или цель — понятная ошибка, состояние не трогается', () => {
    const bus = makeBus();
    const before = makeCanvasGraph();

    expect(() =>
      bus.execute(
        before,
        new ConnectElements({
          id: toPageLinkId('link-4'),
          sourceElementId: toElementId('el-404'),
          targetId: toScenarioId('sc-1'),
        }),
      ),
    ).toThrow(/Элемент-источник связи не найден/);
    expect(() =>
      bus.execute(
        before,
        new ConnectElements({
          id: toPageLinkId('link-4'),
          sourceElementId: toElementId('el-home-1'),
          targetId: toScenarioId('sc-404'),
        }),
      ),
    ).toThrow(/Страница-цель связи не найдена/);
    expect(bus.canUndo()).toBe(false);
  });

  it('execute → undo → redo возвращает исходный граф', () => {
    const bus = makeBus();
    const before = makeCanvasGraph();
    expectUndoRedoRoundtrip(
      bus,
      before,
      new ConnectElements({
        id: toPageLinkId('link-4'),
        sourceElementId: toElementId('el-widget-1'),
        targetId: toScenarioId('sc-2'),
      }),
    );
  });
});
