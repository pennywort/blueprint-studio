import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
  type RefCallback,
} from 'react';
import { useSettingsSection } from '@presentation/features/settings/use-settings';
import type { HotkeyHandlers } from './hotkey-commands';
import { createHotkeysRegistry, type HotkeysRegistry, type RegisterOptions } from './hotkeys-registry';
import { detectPlatform, resolveKeybindings } from './keybindings';
import { keybindingsSettings } from './keybindings-settings';

// React-обвязка системы хоткеев [owner 2026-10-15]. Провайдер без разметки;
// значение контекста — реестр, создаётся один раз и не меняется, поэтому
// потребители из-за него не перерисовываются. Таблица — секция настроек
// keybindings (умолчания ← администратор ← пользователь, R-ADM); смена
// настроек на лету пересобирает реестр.

const HotkeysContext = createContext<HotkeysRegistry | null>(null);

export function HotkeysProvider({ children }: { children: ReactNode }) {
  const entries = useSettingsSection(keybindingsSettings);
  const registry = useMemo(
    () => createHotkeysRegistry(resolveKeybindings(entries, detectPlatform())),
    [entries],
  );
  return <HotkeysContext.Provider value={registry}>{children}</HotkeysContext.Provider>;
}

// Ref на корневой элемент области хоткеев: слушатель живёт, пока элемент
// в DOM (cleanup ref-колбэка React 19). Вне провайдера — ничего не делает.
export function useHotkeysRoot(): RefCallback<HTMLElement> {
  const registry = useContext(HotkeysContext);
  return useCallback(
    (root: HTMLElement | null) => (root && registry ? registry.attach(root) : undefined),
    [registry],
  );
}

export type HotkeyHandlersOptions = Omit<RegisterOptions, 'area'> & {
  // false — обработчики сняты (слой закрыт); по умолчанию — всё время жизни.
  readonly enabled?: boolean;
  readonly area?: RegisterOptions['area'];
};

// Обработчики команд компонента — только «команда → действие», клавиши
// компонент не знает. Регистрация — на время жизни компонента (или пока
// enabled), актуальные замыкания читаются в момент нажатия.
export function useHotkeyHandlers(handlers: HotkeyHandlers, options: HotkeyHandlersOptions = {}): void {
  const registry = useContext(HotkeysContext);
  const source = useRef(handlers);
  const { enabled = true, area, priority } = options;
  useEffect(() => {
    source.current = handlers;
  });
  useEffect(
    () => (enabled ? registry?.register(source, { area, priority }) : undefined),
    [registry, enabled, area, priority],
  );
}
