// Порт хранения пользовательских хоткеев (система хоткеев [owner 2026-10-15]):
// сырой JSON в формате keybindings.json VS Code — массив записей
// { key, command, mac?, win?, linux? }. Разбор и валидация — у потребителя
// (zod), адаптер только читает/пишет. null — пользователь ничего не менял.
export interface IKeybindingsStorage {
  load(): unknown;
  save(keybindings: unknown): void;
}
