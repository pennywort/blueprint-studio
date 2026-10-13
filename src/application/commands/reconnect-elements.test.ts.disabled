import { describe, expect, it } from 'vitest';
import { toApplicationFormId, toElementId, toPageLinkId, toScenarioId } from '@domain/model/ids';
import { ReconnectElements } from './reconnect-elements';
import { expectUndoRedoRoundtrip, makeBus, makeCanvasGraph } from './canvas-graph.fixture';

describe('ReconnectElements (T-035)', () => {
  it('переназначает цель связи — id связи не меняется (D7/D13)', () => {
    const bus = makeBus();
    const before = makeCanvasGraph();

    const after = bus.execute(
      before,
      new ReconnectElements(toPageLinkId('link-1'), { targetId: toScenarioId('sc-2') }),
    );

    expect(after.links[0]).toMatchObject({ id: 'link-1', sourceElementId: 'el-home-1', targetId: 'sc-2' });
    expect(before.links[0]?.targetId).toBe('sc-1');
  });

  it('переназначает источник связи', () => {
    const bus = makeBus();
    const before = makeCanvasGraph();

    const after = bus.execute(
      before,
      new ReconnectElements(toPageLinkId('link-1'), { sourceElementId: toElementId('el-widget-1') }),
    );

    expect(after.links[0]?.sourceElementId).toBe('el-widget-1');
  });

  it('переназначает оба конца сразу; целью может быть форма (D12)', () => {
    const bus = makeBus();
    const before = makeCanvasGraph();

    const after = bus.execute(
      before,
      new ReconnectElements(toPageLinkId('link-1'), {
        sourceElementId: toElementId('el-sc-3'),
        targetId: toApplicationFormId('form-1'),
      }),
    );

    expect(after.links[0]).toMatchObject({ sourceElementId: 'el-sc-3', targetId: 'form-1' });
  });

  it('пустое переназначение — понятная ошибка', () => {
    const bus = makeBus();
    const before = makeCanvasGraph();

    expect(() => bus.execute(before, new ReconnectElements(toPageLinkId('link-1'), {}))).toThrow(
      /без новых концов/,
    );
  });

  it('несуществующие связь/источник/цель — понятные ошибки, состояние не трогается', () => {
    const bus = makeBus();
    const before = makeCanvasGraph();

    expect(() =>
      bus.execute(
        before,
        new ReconnectElements(toPageLinkId('link-404'), { targetId: toScenarioId('sc-2') }),
      ),
    ).toThrow(/Связь не найдена/);
    expect(() =>
      bus.execute(
        before,
        new ReconnectElements(toPageLinkId('link-1'), { sourceElementId: toElementId('el-404') }),
      ),
    ).toThrow(/Элемент-источник связи не найден/);
    expect(() =>
      bus.execute(
        before,
        new ReconnectElements(toPageLinkId('link-1'), { targetId: toScenarioId('sc-404') }),
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
      new ReconnectElements(toPageLinkId('link-1'), { targetId: toScenarioId('sc-2') }),
    );
  });
});
