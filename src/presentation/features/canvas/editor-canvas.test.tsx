import { fireEvent, render, screen } from '@testing-library/react';
import { EditorThemeProvider } from '@presentation/theme/editor-theme-provider';
import { getEditorThemeDefinition } from '@presentation/theme/editor-theme';
import { EditorCanvas } from './editor-canvas';

const canvasTheme = getEditorThemeDefinition('light').canvas;

function renderCanvas() {
  return render(
    <EditorThemeProvider>
      <EditorCanvas />
    </EditorThemeProvider>,
  );
}

// @testing-library/jest-dom в стек не входит — обходимся нативными
// DOM-свойствами (disabled, classList, textContent).
function button(label: string): HTMLButtonElement {
  return screen.getByLabelText(label) as HTMLButtonElement;
}

describe('EditorCanvas (T-011)', () => {
  it('монтирует react-flow и фон с цветами из темы', () => {
    const { container } = renderCanvas();

    expect(container.querySelector('.react-flow')).not.toBeNull();
    // Background v12 передаёт цвета через css-переменные — обе из темы.
    const background = container.querySelector('.react-flow__background') as HTMLElement;
    expect(background.style.getPropertyValue('--xy-background-color-props')).toBe(canvasTheme.background);
    expect(background.style.getPropertyValue('--xy-background-pattern-color-props')).toBe(canvasTheme.dots);
  });

  it('нижняя панель: undo/redo отдельной группой слева, справа fit / − / % / + и миникарта', () => {
    renderCanvas();

    // Левая группа.
    const historyGroup = screen.getByTestId('undo-redo-group');
    const historyPanel = historyGroup.closest('.react-flow__panel');
    expect(historyPanel?.classList.contains('bottom')).toBe(true);
    expect(historyPanel?.classList.contains('left')).toBe(true);
    expect(button('Отменить').disabled).toBe(true);
    expect(button('Повторить').disabled).toBe(true);

    // Правая группа: fit, zoom-out, %, zoom-in, переключатель миникарты.
    const zoomPanel = screen.getByTestId('zoom-group').closest('.react-flow__panel');
    expect(zoomPanel?.classList.contains('bottom')).toBe(true);
    expect(zoomPanel?.classList.contains('right')).toBe(true);
    expect(button('Вместить карту').disabled).toBe(false);
    expect(button('Уменьшить масштаб').disabled).toBe(false);
    expect(button('Увеличить масштаб').disabled).toBe(false);
    expect(screen.getByLabelText('Текущий масштаб').textContent).toBe('100%');
    expect(button('Миникарта').disabled).toBe(false);
  });

  it('миникарта скрыта по умолчанию и показывается переключателем', () => {
    const { container } = renderCanvas();

    expect(container.querySelector('.react-flow__minimap')).toBeNull();
    fireEvent.click(button('Миникарта'));
    expect(container.querySelector('.react-flow__minimap')).not.toBeNull();
    fireEvent.click(button('Миникарта'));
    expect(container.querySelector('.react-flow__minimap')).toBeNull();
  });

  it('кнопки undo/redo отражают состояние стеков CommandBus', () => {
    render(
      <EditorThemeProvider>
        <EditorCanvas canUndo canRedo />
      </EditorThemeProvider>,
    );

    expect(button('Отменить').disabled).toBe(false);
    expect(button('Повторить').disabled).toBe(false);
  });
});
