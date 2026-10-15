# R-HK. Доводка системы хоткеев и буфера элементов [owner 2026-10-15]

Общий порядок работы — [README.md](README.md). Источник — ревью коммитов системы хоткеев
(`git log --oneline --grep=hotkeys`).

## Как устроено сейчас (прочитай перед любым шагом)

`src/presentation/features/hotkeys/`:

| Файл                       | Роль                                                                                                                                     |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `default-keybindings.json` | умолчания в формате keybindings.json VS Code: `{ key, command, mac?, win?, linux? }`                                                     |
| `hotkey-commands.ts`       | реестр команд: id → `{ title, allowInInput, repeat }`; типы обработчиков                                                                 |
| `keybindings.ts`           | zod-схема записи, `resolveKeybindings` (умолчания + пользовательские, `-command`), перевод в синтаксис tinykeys (`mod`, буквы по `code`) |
| `hotkeys-registry.ts`      | чистый TS без React: таблица + обработчики, `attach(root)` — один слушатель `keydown`                                                    |
| `hotkeys-provider.tsx`     | `HotkeysProvider` (без разметки, значение не меняется), `useHotkeysRoot`, `useHotkeyHandlers`                                            |

Пользовательские переопределения — порт `application/ports/keybindings-storage.ts`, адаптер
`infrastructure/persistence/local-storage-keybindings-storage.ts` (DI: `keybindingsStorage`).
Регистрируют обработчики: `pages/editor/EditorPage.tsx` (save/undo/redo/copy/cut/paste) и
`features/canvas/editor-canvas.tsx` (`edit.delete`, `canvas.cancelConnection`).
Буфер элементов — `features/canvas/use-editor-graph.ts` (`copySelectedElement`,
`cutSelectedElement`, `pasteElement`), копия под новым id — `cloneElementWithId` в
`features/canvas/default-elements.ts`.

Сценарий проверки для ВСЕХ шагов (должен проходить до и после):

```
C="[data-element-card]"; N=".react-flow__node-subScenario h6"
npm run ui -- --wait "$C" --count "$C" --click "$C" --key Control+c --click "$N" --key Control+v \
  --count "$C" --key Control+z --count "$C" --key Control+Shift+z --count "$C" --click "$C" \
  --key Control+x --count "$C" --click "$N" --key Delete --count ".react-flow__node" \
  --key Control+z --count ".react-flow__node" --click ".react-flow__handle.source" --key Escape \
  --count ".editor-connecting" --key Control+s --wait 300 --text ".MuiSnackbar-root"
```

Ожидание на демо-графе: карточек 18 → 19 → 18 → 19 → 18; узлов 3 → 4; `.editor-connecting` = 0;
снекбар «Сохранено».

## R-HK-1. Одно ядро «блок → куда добавить элемент» (риск низкий)

**Сейчас (3 копии в `use-editor-graph.ts`):** `selectedNodeTarget` (меню тулбара и вставка без
выделенного элемента), ветка `location.container → target` внутри `pasteElement`, ветка
`nodeType → target` внутри `moveElement`. Все строят `CanvasElementTarget`
(`application/commands/add-element.ts`; `MoveElementTarget` — его алиас).

**Сделать:** в `application/commands/add-element.ts` рядом с `resolveElementTarget` — две чистые
функции:

- `elementTargetOfContainer(graph, container: ElementContainer): CanvasElementTarget`
  (страница: Главная, если `pageId === graph.homePage?.id`, иначе подсценарий; шаг — formStep);
- `elementTargetOfNode(nodeType, nodeId, stepId | null): CanvasElementTarget | null`
  (форма без шага → null; выбор шага формы — как сейчас в `selectedNodeTarget`).

Три места вызывают их; тексты уведомлений и порядок проверок не меняются. Заодно: над
`selectedNodeTarget` два комментария подряд — комментарий «Элемент из меню тулбара…»
относится к `addElement`, перенести к нему.

## R-HK-2. Тип id по виду элемента — одна функция (риск низкий)

**Сейчас:** решение «`ElementId` для listItem/widgetCard/comment, иначе `FormComponentId`»
написано в `createDefaultElement` и в `cloneElementWithId` (`default-elements.ts`).
**Сделать:** `elementIdFor(kind, rawId)` в том же файле, оба места — через неё.

## R-HK-3. Буфер элементов — отдельный хук (риск низкий)

**Сейчас:** `clipboardRef` и три обработчика живут в `use-editor-graph.ts` (хук и так большой).
**Сделать:** `features/canvas/use-element-clipboard.ts` по образцу `use-selection.ts` /
`use-connection.ts`: вход — `graphRef`, `runCommand`, `idGenerator`, выделение,
`deleteSelectedElement`, функция цели из R-HK-1; выход — `{ copy, cut, paste }`.
`use-editor-graph.ts` только композирует и отдаёт наружу те же имена
(`copySelectedElement`/`cutSelectedElement`/`pasteElement`) — EditorPage не меняется.
Делать после R-HK-1.

## R-HK-4. `runCommand` сообщает результат (риск низкий)

**Сейчас:** `runCommand` (`features/canvas/editor-store.ts`) возвращает `void`, поэтому
`pasteElement` проверяет успех повторным поиском `findElementLocation` по графу.
**Сделать:** `runCommand(command): boolean` (true — команда применена, false — отказ уже показан
снекбаром); в `pasteElement` — `if (runCommand(...)) selectElement(id)`. Остальные вызовы
результат игнорируют — менять их не нужно.

## R-HK-5. Живое применение пользовательских хоткеев (по запросу, перед панелью настроек)

**Сейчас:** `HotkeysProvider` читает `keybindingsStorage.load()` один раз; `save` никто не зовёт.
**Сделать, когда начнётся панель настроек:** в реестре — `setTable(table)` (слушатели
пересобирают keymap без переподключения компонентов); хук `useKeybindings()` →
`{ entries, commands: HOTKEY_COMMANDS, save(entries) }`: `save` пишет в порт и обновляет
таблицу. Формат JSON не меняется. Без запроса владельца не делать.

## Изменения поведения, принятые при введении системы (не баги)

- Delete/Backspace/Escape срабатывают при фокусе в любом месте редактора (не только на канвасе),
  кроме полей ввода.
- Комбинации точные: Shift+Delete и т.п. больше не удаляют (раньше react-flow ловил с модификаторами).
- Удержание Delete не удаляет подряд (повтор разрешён только undo/redo — `repeat` в реестре команд).
