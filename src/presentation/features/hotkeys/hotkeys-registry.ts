import { createKeybindingsHandler } from 'tinykeys';
import { HOTKEY_COMMANDS, type HotkeyCommandId, type HotkeyHandlers } from './hotkey-commands';

// Реестр хоткеев (система хоткеев [owner 2026-10-15]) — чистый TS без React:
// таблица «комбинация tinykeys → команда» + обработчики команд от
// компонентов. Ни разметки, ни состояния React: регистрация и нажатия не
// вызывают перерисовок. React-обвязка — hotkeys-provider.tsx.

// Источник обработчиков: актуальные замыкания читаются в момент нажатия.
export type HandlersSource = { readonly current: HotkeyHandlers };

export type HotkeysRegistry = {
  // Обработчики команд; возвращает отписку. У команды один обработчик:
  // при повторной регистрации действует последняя.
  register(source: HandlersSource): () => void;
  // Корень области: нажатия с фокусом внутри него (или ни на чём — body).
  // Слушатель — на document корня, чужие части страницы хоста
  // микрофронтенда (конституция §7) хоткеи не получают. Возвращает отписку.
  attach(root: HTMLElement): () => void;
};

const TEXT_INPUT_SELECTOR = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])';

function isInsideRoot(event: KeyboardEvent, root: HTMLElement): boolean {
  const target = event.target;
  const doc = root.ownerDocument;
  return (
    target instanceof Node && (target === doc.body || target === doc.documentElement || root.contains(target))
  );
}

function isTextInput(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(TEXT_INPUT_SELECTOR) !== null;
}

export function createHotkeysRegistry(table: ReadonlyMap<string, HotkeyCommandId>): HotkeysRegistry {
  let sources: HandlersSource[] = [];

  const handlerOf = (command: HotkeyCommandId) => {
    for (let index = sources.length - 1; index >= 0; index -= 1) {
      const handler = sources[index]!.current[command];
      if (handler) {
        return handler;
      }
    }
    return undefined;
  };

  return {
    register(source) {
      sources = [...sources, source];
      return () => {
        sources = sources.filter((entry) => entry !== source);
      };
    },

    attach(root) {
      const run = (command: HotkeyCommandId, event: KeyboardEvent) => {
        const meta = HOTKEY_COMMANDS[command];
        const handler = handlerOf(command);
        if (
          !handler ||
          !isInsideRoot(event, root) ||
          (event.repeat && !meta.repeat) ||
          (!meta.allowInInput && isTextInput(event.target))
        ) {
          return;
        }
        // false — делать нечего: остаётся действие браузера по умолчанию.
        if (handler() !== false) {
          event.preventDefault();
        }
      };
      const keymap = Object.fromEntries(
        [...table].map(([binding, command]) => [binding, (event: KeyboardEvent) => run(command, event)]),
      );
      const listener = createKeybindingsHandler(keymap, {
        ignore: (event) => event.isComposing || event.defaultPrevented,
      });
      const doc = root.ownerDocument;
      doc.addEventListener('keydown', listener);
      return () => doc.removeEventListener('keydown', listener);
    },
  };
}
