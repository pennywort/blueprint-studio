// Реестр команд хоткеев (система хоткеев [owner 2026-10-15]): id команды —
// то, что пишется в поле `command` keybindings.json; заголовок — для будущей
// панели настроек. Команда хоткея — не команда CommandBus: это действие UI,
// которое само решает, какую команду графа запустить.
// - allowInInput: срабатывает и в поле ввода (иначе там работает поле);
// - repeat: повторяется при удержании клавиш (как в VS Code).

type HotkeyCommandMeta = { title: string; allowInInput: boolean; repeat: boolean };

export const HOTKEY_COMMANDS = {
  // Сохранение и из полей ввода: иначе браузер откроет «Сохранить страницу».
  'project.save': { title: 'Сохранить проект', allowInInput: true, repeat: false },
  'edit.undo': { title: 'Отменить', allowInInput: false, repeat: true },
  'edit.redo': { title: 'Повторить', allowInInput: false, repeat: true },
  'edit.copy': { title: 'Копировать элемент', allowInInput: false, repeat: false },
  'edit.cut': { title: 'Вырезать элемент', allowInInput: false, repeat: false },
  'edit.paste': { title: 'Вставить элемент', allowInInput: false, repeat: false },
  // Единое удаление (F5): элемент или шаг, иначе выделенные блоки и связи.
  'edit.delete': { title: 'Удалить выделенное', allowInInput: false, repeat: false },
  'canvas.cancelConnection': { title: 'Отменить протягивание связи', allowInInput: false, repeat: false },
} as const satisfies Record<string, HotkeyCommandMeta>;

export type HotkeyCommandId = keyof typeof HOTKEY_COMMANDS;

export function isHotkeyCommandId(value: string): value is HotkeyCommandId {
  return Object.hasOwn(HOTKEY_COMMANDS, value);
}

// Обработчик команды: false — нажатие не обработано (например, нечего
// копировать), браузер выполнит своё действие по умолчанию.
export type HotkeyHandler = () => boolean | void;
export type HotkeyHandlers = Partial<Record<HotkeyCommandId, HotkeyHandler>>;
