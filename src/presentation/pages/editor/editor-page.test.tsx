import { fireEvent, render, screen } from '@testing-library/react';
import { buildContainer } from '@infrastructure/container';

// Страница редактора берёт порты из DI-контейнера, поэтому рендерим через
// App с настоящим composition root. Роутер создаётся на уровне модуля App и
// читает hash при создании — поэтому App импортируется динамически ПОСЛЕ
// установки hash (роутер hash-based: /#/editor).
async function renderEditorPage() {
  window.location.hash = '#/editor';
  const { App } = await import('@presentation/app/App');
  return render(<App container={buildContainer()} />);
}

describe('EditorPage (T-022)', () => {
  it('собирает каркас: TopBar, левый тулбар, канвас; панель атрибутов скрыта без выделения', async () => {
    await renderEditorPage();

    expect(screen.getByTestId('editor-top-bar')).not.toBeNull();
    expect(screen.getByTestId('editor-toolbar')).not.toBeNull();
    expect(screen.getByTestId('editor-canvas')).not.toBeNull();
    // Панель атрибутов и панели-заглушки скрыты, пока нет выделения/активации.
    expect(screen.queryByTestId('attributes-panel')).toBeNull();
    expect(screen.queryByTestId('side-panel-json')).toBeNull();
    expect(screen.queryByTestId('side-panel-navigation')).toBeNull();
  });

  it('кнопки 3–4 тулбара открывают панели-заглушки, повторный клик закрывает', async () => {
    await renderEditorPage();

    fireEvent.click(screen.getByLabelText('JSON'));
    expect(screen.getByTestId('side-panel-json')).not.toBeNull();

    fireEvent.click(screen.getByLabelText('Навигация'));
    expect(screen.queryByTestId('side-panel-json')).toBeNull();
    expect(screen.getByTestId('side-panel-navigation')).not.toBeNull();

    fireEvent.click(screen.getByLabelText('Навигация'));
    expect(screen.queryByTestId('side-panel-navigation')).toBeNull();
  });

  it('hasNodes подключён к реальному графу (S9): при демо-графе заглушка пустого состояния скрыта', async () => {
    await renderEditorPage();

    // TEMPORARY: начальное состояние — демо-граф (sample-graph.ts), поэтому
    // заглушка T-024 скрыта, а узлы графа отрисованы на канвасе (T-031).
    expect(screen.queryByTestId('empty-canvas-state')).toBeNull();
    expect(screen.getByText('Подбор вклада')).not.toBeNull();
  });

  it('кнопка «Сохранить» показывает snackbar «Сохранено» (T-023)', async () => {
    await renderEditorPage();

    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(screen.getByText('Сохранено')).not.toBeNull();
  });
});
