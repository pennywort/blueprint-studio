import { useCallback, useSyncExternalStore } from 'react';
import type { SettingsSection } from '@application/settings/settings-section';
import type { SettingsSnapshot } from '@application/settings/editor-settings';
import { rulesSettings } from '@application/settings/rules-settings';
import type { EditorRules } from '@domain/editor-rules';
import { useContainer } from '@presentation/app/App';

// Чтение настроек редактора в UI (R-ADM): подписка на EditorSettings из
// DI-контейнера. Смена слоя (администратор, пользователь) перерисовывает
// только тех, чья секция изменилась: неизменившаяся секция сохраняет объект.

export function useSettingsSnapshot(): SettingsSnapshot {
  const settings = useContainer().cradle.editorSettings;
  return useSyncExternalStore(
    useCallback((listener) => settings.subscribe(listener), [settings]),
    () => settings.snapshot(),
  );
}

export function useSettingsSection<T>(section: SettingsSection<T>): T {
  const settings = useContainer().cradle.editorSettings;
  return useSyncExternalStore(
    useCallback((listener) => settings.subscribe(listener), [settings]),
    () => settings.get(section),
  );
}

/** Действующие правила карты — те же, что у команд и инвариантов. */
export function useEditorRules(): EditorRules {
  return useSettingsSection(rulesSettings);
}
