import { createKeybindingsHandler } from 'tinykeys';
import { HOTKEY_COMMANDS, type HotkeyCommandId, type HotkeyHandlers } from './hotkey-commands';

// Реестр хоткеев (система хоткеев [owner 2026-10-15]) — чистый TS без React:
// таблица «комбинация tinykeys → команда» + обработчики команд от
// компонентов. Ни разметки, ни состояния React: регистрация и нажатия не
// вызывают перерисовок. React-обвязка — hotkeys-provider.tsx.

// Источник обработчиков: актуальные замыкания читаются в момент нажатия.
export type HandlersSource = { readonly current: HotkeyHandlers };

export type RegisterOptions = {
  // Своя область источника вне корня — портал слоя (Dialog, Menu): команды
  // источника работают и с фокусом в ней (стек слоёв, dismiss-layer.ts).
  readonly area?: { readonly current: HTMLElement | null };
  // Приоритет в стеке; при равном выше тот, кто зарегистрирован позже.
  readonly priority?: number;
};

type Entry = { source: HandlersSource; area: RegisterOptions['area']; priority: number };

export type HotkeysRegistry = {
  // Обработчики команд; возвращает отписку. Источники — стек: нажатие
  // получает верхний источник с обработчиком команды в своей области;
  // его false — «не обработано», команда уходит к следующему ниже.
  register(source: HandlersSource, options?: RegisterOptions): () => void;
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
  // По возрастанию приоритета, внутри — по порядку регистрации: верх — конец.
  let entries: Entry[] = [];

  return {
    register(source, options = {}) {
      const entry: Entry = { source, area: options.area, priority: options.priority ?? 0 };
      const above = entries.findIndex((item) => item.priority > entry.priority);
      entries =
        above < 0 ? [...entries, entry] : [...entries.slice(0, above), entry, ...entries.slice(above)];
      return () => {
        entries = entries.filter((item) => item !== entry);
      };
    },

    attach(root) {
      const run = (command: HotkeyCommandId, event: KeyboardEvent) => {
        const meta = HOTKEY_COMMANDS[command];
        if ((event.repeat && !meta.repeat) || (!meta.allowInInput && isTextInput(event.target))) {
          return;
        }
        const insideRoot = isInsideRoot(event, root);
        for (let index = entries.length - 1; index >= 0; index -= 1) {
          const { source, area } = entries[index]!;
          const handler = source.current[command];
          const target = event.target;
          const inArea = target instanceof Node && area?.current?.contains(target) === true;
          // false — делать нечего: команда уходит ниже, в конце остаётся
          // действие браузера по умолчанию.
          if (handler && (insideRoot || inArea) && handler() !== false) {
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
      const doc = root.ownerDocument;
      doc.addEventListener('keydown', listener);
      return () => doc.removeEventListener('keydown', listener);
    },
  };
}
