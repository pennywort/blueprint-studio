import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode, type RefObject } from 'react';
import { createKeybindingsHandler } from 'tinykeys';
import { makeStyles } from '@blueprint-vendor/flamingo-core';
import { useContainer } from '@presentation/app/App';
import { HOTKEY_COMMANDS, type HotkeyCommandId, type HotkeyHandlers } from './hotkey-commands';
import { DEFAULT_KEYBINDINGS, detectPlatform, parseUserKeybindings, resolveKeybindings } from './keybindings';

// Система хоткеев [owner 2026-10-15] — единственный механизм клавиатурных
// команд редактора. HotkeysScope держит ОДИН слушатель и таблицу
// «комбинация → команда» (default-keybindings.json + IKeybindingsStorage,
// сопоставление — tinykeys); компоненты клавиш не читают, а только
// регистрируют обработчики команд через useHotkeyHandlers.

type HandlersRef = RefObject<HotkeyHandlers>;

type HotkeysRegistry = {
  register(handlers: HandlersRef): () => void;
};

const HotkeysContext = createContext<HotkeysRegistry | null>(null);

const TEXT_INPUT_SELECTOR = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])';

// Граница области — обёртка без своей разметки: в раскладке её нет, а
// принадлежность фокуса проверяется по DOM.
const useStyles = makeStyles({
  scope: { display: 'contents' },
});

// Нажатие относится к области: фокус внутри неё или ни на чём (body).
// Слушатель — на document, но чужие части страницы хоста микрофронтенда
// (конституция §7) хоткеи редактора не получают.
function isScopeEvent(event: KeyboardEvent, scope: HTMLElement | null): boolean {
  const target = event.target;
  if (!(target instanceof Node) || !scope) {
    return false;
  }
  const doc = scope.ownerDocument;
  return target === doc.body || target === doc.documentElement || scope.contains(target);
}

function isTextInput(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(TEXT_INPUT_SELECTOR) !== null;
}

export function HotkeysScope({ children }: { children: ReactNode }) {
  const classes = useStyles();
  const storage = useContainer().cradle.keybindingsStorage;
  const scopeRef = useRef<HTMLDivElement>(null);
  // Регистрации в порядке подключения; при нажатии опрашиваются с конца
  // (последняя — первой), false передаёт команду следующей.
  const registrationsRef = useRef<HandlersRef[]>([]);

  const registry = useMemo<HotkeysRegistry>(
    () => ({
      register(handlers) {
        registrationsRef.current = [...registrationsRef.current, handlers];
        return () => {
          registrationsRef.current = registrationsRef.current.filter((entry) => entry !== handlers);
        };
      },
    }),
    [],
  );

  const table = useMemo(
    () =>
      resolveKeybindings([...DEFAULT_KEYBINDINGS, ...parseUserKeybindings(storage.load())], detectPlatform()),
    [storage],
  );

  useEffect(() => {
    const doc = scopeRef.current?.ownerDocument;
    if (!doc) {
      return;
    }
    const run = (command: HotkeyCommandId, event: KeyboardEvent) => {
      const meta = HOTKEY_COMMANDS[command];
      if (
        !isScopeEvent(event, scopeRef.current) ||
        (event.repeat && !meta.repeat) ||
        (!meta.allowInInput && isTextInput(event.target))
      ) {
        return;
      }
      for (const handlers of [...registrationsRef.current].reverse()) {
        const handler = handlers.current[command];
        if (handler && handler() !== false) {
          event.preventDefault();
          return;
        }
      }
    };
    const keymap = Object.fromEntries(
      [...table].map(([binding, command]) => [binding, (event: KeyboardEvent) => run(command, event)]),
    );
    const listener = createKeybindingsHandler(keymap, {
      ignore: (event) => event.isComposing || event.defaultPrevented,
    });
    doc.addEventListener('keydown', listener);
    return () => doc.removeEventListener('keydown', listener);
  }, [table]);

  return (
    <HotkeysContext.Provider value={registry}>
      <div ref={scopeRef} className={classes.scope}>
        {children}
      </div>
    </HotkeysContext.Provider>
  );
}

// Обработчики команд компонента; актуальные замыкания читаются в момент
// нажатия (ref), регистрация — одна на время жизни компонента. Вне
// HotkeysScope — ничего не делает.
export function useHotkeyHandlers(handlers: HotkeyHandlers): void {
  const registry = useContext(HotkeysContext);
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });
  useEffect(() => registry?.register(handlersRef), [registry]);
}
