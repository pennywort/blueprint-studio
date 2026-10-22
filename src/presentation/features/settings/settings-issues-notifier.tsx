import { useEffect, useRef } from 'react';
import { useEditorNotifications } from '@presentation/features/notifications/editor-notifications';
import { useSettingsSnapshot } from './use-settings';

// Ошибки настроек редактора (R-ADM): неверная секция не применяется, работает
// прежнее значение — но молча это не проходит. Уведомление — один раз на
// каждый новый набор ошибок (смена документа слоя), без разметки.
const LAYER_NAMES = { admin: 'администратора', user: 'пользователя' } as const;

export function SettingsIssuesNotifier() {
  const { issues } = useSettingsSnapshot();
  const notifications = useEditorNotifications();
  const shown = useRef('');

  useEffect(() => {
    const text = issues
      .map((issue) => `${issue.section ? `«${issue.section}»` : 'документ'}: ${issue.message.split('\n')[0]}`)
      .join('; ');
    if (text === shown.current) {
      return;
    }
    shown.current = text;
    if (issues.length > 0) {
      const layers = [...new Set(issues.map((issue) => LAYER_NAMES[issue.layer]))].join(' и ');
      notifications.showSettingsIssue(`Настройки ${layers} применены не полностью — ${text}`);
    }
  }, [issues, notifications]);

  return null;
}
