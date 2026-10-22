import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Snackbar, makeStyles } from '@material-ui/core';
import type { EditorTheme } from '@presentation/theme/editor-theme';

// Единый сервис уведомлений редактора (T-023): один <Snackbar> живёт здесь и
// нигде больше — не размазываем по компонентам. Триггеры — только важные
// действия с файлом: успешное сохранение, ошибка сохранения/экспорта,
// критический отказ команды. Undo/redo и штатное удаление узла/элемента —
// молча (замечание владельца), поэтому фасад намеренно узкий.
export type EditorNotificationsFacade = {
  /** Успешное сохранение карты. */
  showSaveSuccess: () => void;
  /** Ошибка сохранения или экспорта — snackbar с текстом ошибки. */
  showSaveError: (message: string) => void;
  /** Критический отказ команды (команда не смогла примениться). */
  showCommandFailure: (message: string) => void;
  /** Настройки редактора не применены (ошибка в документе слоя, R-ADM). */
  showSettingsIssue: (message: string) => void;
};

type Notification = {
  severity: 'success' | 'error';
  message: string;
};

const SAVE_SUCCESS_MESSAGE = 'Сохранено';

const EditorNotificationsContext = createContext<EditorNotificationsFacade | null>(null);

// Фасад — единственная точка вызова уведомлений из presentation.
export function useEditorNotifications(): EditorNotificationsFacade {
  const facade = useContext(EditorNotificationsContext);
  if (facade === null) {
    throw new Error('useEditorNotifications: компонент вне EditorNotificationsProvider');
  }
  return facade;
}

const useStyles = makeStyles<EditorTheme>((theme) => ({
  success: {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    borderRadius: theme.editor.shape.card,
  },
  error: {
    backgroundColor: theme.palette.error.main,
    color: theme.palette.error.contrastText,
    borderRadius: theme.editor.shape.card,
  },
}));

export function EditorNotificationsProvider({ children }: { children: ReactNode }) {
  const classes = useStyles();
  const [notification, setNotification] = useState<Notification | null>(null);
  // Счётчик заставляет Snackbar перезапустить показ, если уведомление
  // пришло, пока предыдущее ещё висит на экране.
  const [sequence, setSequence] = useState(0);

  const show = useCallback((next: Notification) => {
    setNotification(next);
    setSequence((value) => value + 1);
  }, []);

  const facade = useMemo<EditorNotificationsFacade>(
    () => ({
      showSaveSuccess: () => show({ severity: 'success', message: SAVE_SUCCESS_MESSAGE }),
      showSaveError: (message) => show({ severity: 'error', message }),
      showCommandFailure: (message) => show({ severity: 'error', message }),
      showSettingsIssue: (message) => show({ severity: 'error', message }),
    }),
    [show],
  );

  return (
    <EditorNotificationsContext.Provider value={facade}>
      {children}
      <Snackbar
        key={sequence}
        open={notification !== null}
        autoHideDuration={4000}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        onClose={() => setNotification(null)}
        message={notification?.message}
        ContentProps={{
          className: notification?.severity === 'error' ? classes.error : classes.success,
        }}
      />
    </EditorNotificationsContext.Provider>
  );
}
