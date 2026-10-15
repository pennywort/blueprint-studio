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
import { useContainer } from '@presentation/app/App';
import type { HotkeyHandlers } from './hotkey-commands';
import { createHotkeysRegistry, type HotkeysRegistry } from './hotkeys-registry';
import { DEFAULT_KEYBINDINGS, detectPlatform, parseUserKeybindings, resolveKeybindings } from './keybindings';

// React-обвязка системы хоткеев [owner 2026-10-15]. Провайдер без разметки;
// значение контекста — реестр, создаётся один раз и не меняется, поэтому
// потребители из-за него не перерисовываются. Таблица — умолчания
// (default-keybindings.json) + пользовательские записи IKeybindingsStorage.

const HotkeysContext = createContext<HotkeysRegistry | null>(null);

export function HotkeysProvider({ children }: { children: ReactNode }) {
  const storage = useContainer().cradle.keybindingsStorage;
  const registry = useMemo(
    () =>
      createHotkeysRegistry(
        resolveKeybindings(
          [...DEFAULT_KEYBINDINGS, ...parseUserKeybindings(storage.load())],
          detectPlatform(),
        ),
      ),
    [storage],
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

// Обработчики команд компонента — только «команда → действие», клавиши
// компонент не знает. Регистрация одна на время жизни компонента,
// актуальные замыкания читаются в момент нажатия.
export function useHotkeyHandlers(handlers: HotkeyHandlers): void {
  const registry = useContext(HotkeysContext);
  const source = useRef(handlers);
  useEffect(() => {
    source.current = handlers;
  });
  useEffect(() => registry?.register(source), [registry]);
}
