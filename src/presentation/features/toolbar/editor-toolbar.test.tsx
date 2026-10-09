import { fireEvent, render, screen } from '@testing-library/react';
import { EditorThemeProvider } from '@presentation/theme/editor-theme-provider';
import type { ElementSchema } from '@application/ports/element-schema-provider';
import { EditorToolbar, type EditorToolbarProps } from './editor-toolbar';

const schemas: readonly ElementSchema[] = [
  { kind: 'textField', version: 1, attributes: [] },
  { kind: 'checkbox', version: 1, attributes: [] },
];

function renderToolbar(props: Partial<EditorToolbarProps> = {}) {
  return render(
    <EditorThemeProvider>
      <EditorToolbar elementSchemas={schemas} activePanel={null} onPanelChange={() => {}} {...props} />
    </EditorThemeProvider>,
  );
}

describe('EditorToolbar (T-021)', () => {
  it('содержит ровно 4 кнопки (AI-ассистента нет)', () => {
    renderToolbar();

    const toolbar = screen.getByTestId('editor-toolbar');
    expect(toolbar.querySelectorAll('button')).toHaveLength(4);
    expect(screen.getByLabelText('Добавить узел')).not.toBeNull();
    expect(screen.getByLabelText('Добавить элемент')).not.toBeNull();
    expect(screen.getByLabelText('JSON')).not.toBeNull();
    expect(screen.getByLabelText('Навигация')).not.toBeNull();
  });

  it('кнопка 1 открывает меню узлов: Главная / Подсценарий / Форма заявки', () => {
    const onAddNode = vi.fn();
    renderToolbar({ onAddNode });

    fireEvent.click(screen.getByLabelText('Добавить узел'));

    expect(screen.getByText('Главная')).not.toBeNull();
    expect(screen.getByText('Подсценарий')).not.toBeNull();
    expect(screen.getByText('Форма заявки')).not.toBeNull();

    fireEvent.click(screen.getByText('Подсценарий'));

    expect(onAddNode).toHaveBeenCalledWith('subScenario');
    // Меню закрылось после выбора (DOM размонтируется после exit-анимации MUI).
    expect(screen.getByLabelText('Добавить узел').getAttribute('aria-pressed')).toBe('false');
  });

  it('кнопка 2 открывает меню элементов из listSchemas() провайдера', () => {
    const onAddElement = vi.fn();
    renderToolbar({ onAddElement });

    fireEvent.click(screen.getByLabelText('Добавить элемент'));

    expect(screen.getByText('textField')).not.toBeNull();
    expect(screen.getByText('checkbox')).not.toBeNull();

    fireEvent.click(screen.getByText('textField'));

    expect(onAddElement).toHaveBeenCalledWith('textField');
    expect(screen.getByLabelText('Добавить элемент').getAttribute('aria-pressed')).toBe('false');
  });

  it('кнопки 3–4 переключают панели-заглушки, повторный клик закрывает', () => {
    const onPanelChange = vi.fn();
    const { rerender } = render(
      <EditorThemeProvider>
        <EditorToolbar elementSchemas={schemas} activePanel="json" onPanelChange={onPanelChange} />
      </EditorThemeProvider>,
    );

    // Активная кнопка отражает открытую панель.
    expect(screen.getByLabelText('JSON').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByLabelText('Навигация').getAttribute('aria-pressed')).toBe('false');

    // Повторный клик по активной — закрытие панели.
    fireEvent.click(screen.getByLabelText('JSON'));
    expect(onPanelChange).toHaveBeenCalledWith(null);

    // Клик по другой — переключение.
    fireEvent.click(screen.getByLabelText('Навигация'));
    expect(onPanelChange).toHaveBeenCalledWith('navigation');

    rerender(
      <EditorThemeProvider>
        <EditorToolbar elementSchemas={schemas} activePanel="navigation" onPanelChange={onPanelChange} />
      </EditorThemeProvider>,
    );
    expect(screen.getByLabelText('Навигация').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByLabelText('JSON').getAttribute('aria-pressed')).toBe('false');
  });

  it('открытое меню добавления подсвечивает свою кнопку', () => {
    renderToolbar();

    fireEvent.click(screen.getByLabelText('Добавить узел'));
    expect(screen.getByLabelText('Добавить узел').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByLabelText('Добавить элемент').getAttribute('aria-pressed')).toBe('false');
  });
});
