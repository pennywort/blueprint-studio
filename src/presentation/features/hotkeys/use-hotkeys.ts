import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { createKeybindingsHandler } from 'tinykeys';
import { useContainer } from '@presentation/app/App';
import { HOTKEY_COMMANDS, type HotkeyCommandId, type HotkeyHandlers } from './hotkey-commands';
import { DEFAULT_KEYBINDINGS, detectPlatform, parseUserKeybindings, resolveKeybindings } from './keybindings';

// Команды, которые повторяются при удержании клавиш (как в VS Code).
const REPEATABLE: ReadonlySet<HotkeyCommandId> = new Set(['edit.undo', 'edit.redo']);

const TEXT_INPUT_SELECTOR = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])';

// Нажатие относится к редактору: фокус внутри его корня или ни на чём
// (body). Слушатель — на document, но чужие части страницы хоста
// микрофронтенда (конституция §7) хоткеи редактора не получают.
function isEditorEvent(event: KeyboardEvent, root: HTMLElement | null): boolean {
  const target = event.target;
  if (!(target instanceof Node)) {
    return false;
  }
  const doc = root?.ownerDocument;
  return target === doc?.body || target === doc?.documentElement || root?.contains(target) === true;
}

function isTextInput(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(TEXT_INPUT_SELECTOR) !== null;
}

// Система хоткеев [owner 2026-10-15]: независимый слой поверх страницы —
// компоненты о хоткеях не знают, им передаются только обработчики команд.
// Таблица — умолчания (default-keybindings.json) + пользовательские записи
// из IKeybindingsStorage; сопоставление нажатий — tinykeys. Слушатель
// document в фазе всплытия: обработчики компонентов (Delete канваса,
// Enter поиска) срабатывают раньше и могут погасить событие.
export function useHotkeys(rootRef: RefObject<HTMLElement | null>, handlers: HotkeyHandlers): void {
  const storage = useContainer().cradle.keybindingsStorage;
  const table = useMemo(
    () =>
      resolveKeybindings([...DEFAULT_KEYBINDINGS, ...parseUserKeybindings(storage.load())], detectPlatform()),
    [storage],
  );

  // Обработчики — в ref: слушатель не переподключается на каждый рендер.
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    const root = rootRef.current;
    const doc = root?.ownerDocument;
    if (!doc) {
      return;
    }
    const keymap = Object.fromEntries(
      [...table].map(([binding, command]) => [
        binding,
        (event: KeyboardEvent) => {
          const handler = handlersRef.current[command];
          if (
            !handler ||
            !isEditorEvent(event, rootRef.current) ||
            (event.repeat && !REPEATABLE.has(command)) ||
            (!HOTKEY_COMMANDS[command].allowInInput && isTextInput(event.target))
          ) {
            return;
          }
          if (handler() !== false) {
            event.preventDefault();
          }
        },
      ]),
    );
    const listener = createKeybindingsHandler(keymap, {
      ignore: (event) => event.isComposing || event.defaultPrevented,
    });
    doc.addEventListener('keydown', listener);
    return () => doc.removeEventListener('keydown', listener);
  }, [rootRef, table]);
}
