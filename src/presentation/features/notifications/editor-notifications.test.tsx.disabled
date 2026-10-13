import { fireEvent, render, screen } from '@testing-library/react';
import { EditorThemeProvider } from '@presentation/theme/editor-theme-provider';
import { EditorNotificationsProvider, useEditorNotifications } from './editor-notifications';

// Пробник вызывает фасад напрямую — так покрываются пути, у которых ещё нет
// реальных триггеров (ошибка сохранения/экспорта — T-053, отказ команды).
function FacadeProbe() {
  const notifications = useEditorNotifications();
  return (
    <>
      <button onClick={notifications.showSaveSuccess}>success</button>
      <button onClick={() => notifications.showSaveError('Не удалось сохранить файл')}>error</button>
      <button onClick={() => notifications.showCommandFailure('Команда отклонена')}>command</button>
    </>
  );
}

function renderProbe() {
  return render(
    <EditorThemeProvider>
      <EditorNotificationsProvider>
        <FacadeProbe />
      </EditorNotificationsProvider>
    </EditorThemeProvider>,
  );
}

describe('EditorNotifications (T-023)', () => {
  it('успешное сохранение показывает snackbar «Сохранено»', () => {
    renderProbe();

    fireEvent.click(screen.getByText('success'));

    expect(screen.getByText('Сохранено')).not.toBeNull();
  });

  it('ошибка сохранения показывает snackbar с сообщением об ошибке', () => {
    renderProbe();

    fireEvent.click(screen.getByText('error'));

    expect(screen.getByText('Не удалось сохранить файл')).not.toBeNull();
  });

  it('критический отказ команды показывает snackbar с сообщением', () => {
    renderProbe();

    fireEvent.click(screen.getByText('command'));

    expect(screen.getByText('Команда отклонена')).not.toBeNull();
  });

  it('новое уведомление заменяет висящее на экране', () => {
    renderProbe();

    fireEvent.click(screen.getByText('success'));
    fireEvent.click(screen.getByText('error'));

    expect(screen.queryByText('Сохранено')).toBeNull();
    expect(screen.getByText('Не удалось сохранить файл')).not.toBeNull();
  });
});
