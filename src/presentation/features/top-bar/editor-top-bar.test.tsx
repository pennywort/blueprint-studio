import { fireEvent, render, screen } from '@testing-library/react';
import { EditorThemeProvider } from '@presentation/theme/editor-theme-provider';
import { EditorTopBar } from './editor-top-bar';

function renderTopBar(props: Parameters<typeof EditorTopBar>[0] = {}) {
  return render(
    <EditorThemeProvider>
      <EditorTopBar {...props} />
    </EditorThemeProvider>,
  );
}

describe('EditorTopBar (T-020)', () => {
  it('рендерит поисковое поле и три кнопки действий', () => {
    renderTopBar();

    expect(screen.getByPlaceholderText('Начните вводить')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Сохранить' })).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Предпросмотр' })).not.toBeNull();
    expect(screen.getByRole('button', { name: 'На согласование' })).not.toBeNull();
  });

  it('поле поиска управляемое и сообщает об изменениях', () => {
    const onSearchChange = vi.fn();
    renderTopBar({ onSearchChange });

    const input = screen.getByPlaceholderText('Начните вводить') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Главная' } });

    expect(input.value).toBe('Главная');
    expect(onSearchChange).toHaveBeenCalledWith('Главная');
  });

  it('кнопки вызывают заглушки-обработчики', () => {
    const onSave = vi.fn();
    const onPreview = vi.fn();
    const onSubmitForApproval = vi.fn();
    renderTopBar({ onSave, onPreview, onSubmitForApproval });

    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    fireEvent.click(screen.getByRole('button', { name: 'Предпросмотр' }));
    fireEvent.click(screen.getByRole('button', { name: 'На согласование' }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onPreview).toHaveBeenCalledTimes(1);
    expect(onSubmitForApproval).toHaveBeenCalledTimes(1);
  });
});
