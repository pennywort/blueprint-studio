import { render, screen } from '@testing-library/react';
import { EditorThemeProvider } from '@presentation/theme/editor-theme-provider';
import { EmptyCanvasState } from './empty-canvas-state';

function renderEmptyState(hasNodes: boolean) {
  return render(
    <EditorThemeProvider>
      <EmptyCanvasState hasNodes={hasNodes} />
    </EditorThemeProvider>,
  );
}

describe('EmptyCanvasState (T-024)', () => {
  it('без узлов показывает иллюстрацию, заголовок и подсказку по макету', () => {
    renderEmptyState(false);

    expect(screen.getByTestId('empty-canvas-state')).not.toBeNull();
    expect(screen.getByText('Здесь пока пусто')).not.toBeNull();
    expect(screen.getByText('Добавьте первую колонку, чтобы начать проектировать сервис')).not.toBeNull();
  });

  it('после появления первого узла заглушка скрывается', () => {
    renderEmptyState(true);

    expect(screen.queryByTestId('empty-canvas-state')).toBeNull();
    expect(screen.queryByText('Здесь пока пусто')).toBeNull();
  });
});
