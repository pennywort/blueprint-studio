import { appendSection } from '@application/settings/settings-section';
import { DEFAULT_KEYBINDINGS, parseUserKeybindings, type KeybindingEntry } from './keybindings';

// Секция «Горячие клавиши» (R-ADM, система хоткеев [owner 2026-10-15]):
// формат keybindings.json VS Code. Слои дописываются: умолчания
// (default-keybindings.json) ← записи администратора (для всех) ← записи
// пользователя; при совпадении комбинации побеждает последняя запись,
// «-command» снимает хоткей. Битые записи отбрасываются по одной.
// Пример: { "keybindings": [{ "key": "mod+d", "command": "-edit.duplicate" }] }
export const keybindingsSettings = appendSection<KeybindingEntry>({
  key: 'keybindings',
  title: 'Горячие клавиши',
  scope: 'user',
  defaults: DEFAULT_KEYBINDINGS,
  parseItems: parseUserKeybindings,
});
