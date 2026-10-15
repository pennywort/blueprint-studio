// Реестр команд хоткеев (система хоткеев [owner 2026-10-15]): id команды —
// то, что пишется в поле `command` keybindings.json; заголовок — для будущей
// панели настроек. Команда хоткея — не команда CommandBus: это действие UI,
// которое само решает, какую команду графа запустить.

export const HOTKEY_COMMANDS = {
  'project.save': {
    title: 'Сохранить проект',
    // Сохранение работает и из полей ввода: иначе браузер откроет «Сохранить страницу».
    allowInInput: true,
  },
  'edit.undo': { title: 'Отменить', allowInInput: false },
  'edit.redo': { title: 'Повторить', allowInInput: false },
  'edit.copy': { title: 'Копировать элемент', allowInInput: false },
  'edit.cut': { title: 'Вырезать элемент', allowInInput: false },
  'edit.paste': { title: 'Вставить элемент', allowInInput: false },
} as const satisfies Record<string, { title: string; allowInInput: boolean }>;

export type HotkeyCommandId = keyof typeof HOTKEY_COMMANDS;

export function isHotkeyCommandId(value: string): value is HotkeyCommandId {
  return Object.hasOwn(HOTKEY_COMMANDS, value);
}

// Обработчик команды: false — нажатие не обработано (например, нечего
// копировать), браузер выполнит своё действие по умолчанию.
export type HotkeyHandler = () => boolean | void;
export type HotkeyHandlers = Partial<Record<HotkeyCommandId, HotkeyHandler>>;
