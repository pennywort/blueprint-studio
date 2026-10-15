import { z } from 'zod';
import defaultKeybindingsJson from './default-keybindings.json';
import { isHotkeyCommandId, type HotkeyCommandId } from './hotkey-commands';

// Хоткеи в формате keybindings.json VS Code (система хоткеев [owner
// 2026-10-15]): массив { key, command, mac?, win?, linux? }.
// - key: «mod+shift+z»; аккорды через пробел («mod+k mod+s»). mod — ⌘ на
//   macOS и Ctrl на Windows/Linux; ctrl/shift/alt/cmd — как есть.
// - mac/win/linux: своя комбинация для платформы; пустая строка — на этой
//   платформе хоткея нет.
// - command «-edit.undo»: снять хоткей по умолчанию (с key — только его).
// Пользовательские записи (IKeybindingsStorage) применяются после умолчаний;
// при совпадении комбинации побеждает последняя запись.
export const KeybindingEntrySchema = z.object({
  key: z.string(),
  command: z.string(),
  mac: z.string().optional(),
  win: z.string().optional(),
  linux: z.string().optional(),
});
export type KeybindingEntry = z.infer<typeof KeybindingEntrySchema>;

const KeybindingListSchema = z.array(KeybindingEntrySchema);

export type HotkeyPlatform = 'mac' | 'win' | 'linux';

export function detectPlatform(): HotkeyPlatform {
  const nav = globalThis.navigator as (Navigator & { userAgentData?: { platform?: string } }) | undefined;
  const platform = nav?.userAgentData?.platform ?? nav?.platform ?? '';
  if (/mac|iphone|ipad|ipod/i.test(platform)) {
    return 'mac';
  }
  return /win/i.test(platform) ? 'win' : 'linux';
}

export const DEFAULT_KEYBINDINGS: readonly KeybindingEntry[] =
  KeybindingListSchema.parse(defaultKeybindingsJson);

// Пользовательский JSON: битые записи отбрасываются по одной, а не весь файл.
export function parseUserKeybindings(raw: unknown): KeybindingEntry[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.flatMap((item) => {
    const parsed = KeybindingEntrySchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

const MODIFIER_ALIASES: Record<string, string> = {
  ctrl: 'Control',
  control: 'Control',
  shift: 'Shift',
  alt: 'Alt',
  option: 'Alt',
  opt: 'Alt',
  cmd: 'Meta',
  command: 'Meta',
  meta: 'Meta',
  win: 'Meta',
  super: 'Meta',
};

const KEY_ALIASES: Record<string, string> = {
  esc: 'Escape',
  escape: 'Escape',
  del: 'Delete',
  delete: 'Delete',
  backspace: 'Backspace',
  enter: 'Enter',
  tab: 'Tab',
  space: 'Space',
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
};

// Одно нажатие «mod+shift+z» → строка tinykeys «Control+Shift+KeyZ».
// Буквы и цифры — по KeyboardEvent.code: хоткей не зависит от раскладки
// (в русской Ctrl+S приходит с key «ы», code «KeyS»).
function toTinykeysPress(press: string, platform: HotkeyPlatform): string | null {
  const parts = press.split('+').map((part) => part.trim().toLowerCase());
  const key = parts.pop();
  if (!key) {
    return null;
  }
  const modifiers: string[] = [];
  for (const part of parts) {
    const modifier = part === 'mod' ? (platform === 'mac' ? 'Meta' : 'Control') : MODIFIER_ALIASES[part];
    if (!modifier) {
      return null;
    }
    modifiers.push(modifier);
  }
  let code: string;
  if (/^[a-z]$/.test(key)) {
    code = `Key${key.toUpperCase()}`;
  } else if (/^[0-9]$/.test(key)) {
    code = `Digit${key}`;
  } else {
    code = KEY_ALIASES[key] ?? (/^f\d{1,2}$/.test(key) ? key.toUpperCase() : key);
  }
  return [...modifiers, code].join('+');
}

export function toTinykeysBinding(key: string, platform: HotkeyPlatform): string | null {
  const presses = key.trim().split(/\s+/).filter(Boolean);
  if (presses.length === 0) {
    return null;
  }
  const converted = presses.map((press) => toTinykeysPress(press, platform));
  return converted.every((press) => press !== null) ? converted.join(' ') : null;
}

function platformKey(entry: KeybindingEntry, platform: HotkeyPlatform): string {
  return entry[platform] ?? entry.key;
}

// Итоговая таблица «комбинация tinykeys → команда» для платформы: умолчания,
// затем пользовательские записи; «-command» снимает ранее назначенное.
// Неизвестные команды и нераспознанные комбинации пропускаются.
export function resolveKeybindings(
  entries: readonly KeybindingEntry[],
  platform: HotkeyPlatform,
): Map<string, HotkeyCommandId> {
  const table = new Map<string, HotkeyCommandId>();
  for (const entry of entries) {
    const removal = entry.command.startsWith('-');
    const command = removal ? entry.command.slice(1) : entry.command;
    if (!isHotkeyCommandId(command)) {
      continue;
    }
    const binding = toTinykeysBinding(platformKey(entry, platform), platform);
    if (removal) {
      for (const [existing, existingCommand] of table) {
        if (existingCommand === command && (binding === null || existing === binding)) {
          table.delete(existing);
        }
      }
      continue;
    }
    if (binding !== null) {
      table.delete(binding); // последняя запись побеждает и встаёт в конец
      table.set(binding, command);
    }
  }
  return table;
}
