# R-BOX. `Box` MUI v4 → `div` + `makeStyles` [owner 2026-10-15]

Общий порядок работы — [README.md](README.md).

## Зачем

`Box` из `@material-ui/core` v4 (реэкспорт `@blueprint-vendor/flamingo-core`) на КАЖДЫЙ рендер
прогоняет пропсы через styled-system и пересчитывает JSS-стили. Страницы редактора
перерисовываются на каждую команду графа, выделение, ввод в панели атрибутов — `Box` тормозит
интерфейс. `makeStyles` создаёт классы один раз на тему, рендер стоит как у обычного `div`.

Решение владельца: вёрстка — `div` + классы `makeStyles`; `Box` в `src` не использовать.
Это не нарушает «UI только из `@blueprint-vendor/*`»: `makeStyles` берётся оттуда же, `div` —
разметка, а не UI-компонент (так уже сделаны `editor-canvas.tsx`, узлы канваса).

**Эталон — `src/presentation/pages/editor/EditorPage.tsx`** (переведена при введении правила):
стили в `useStyles` вверху файла, у каждого бывшего `Box` — свой именованный класс.

## Правила перевода

| `Box`                                             | `makeStyles`                                               |
| ------------------------------------------------- | ---------------------------------------------------------- |
| `display="flex" flexDirection="column"`           | `display: 'flex', flexDirection: 'column'`                 |
| `flexGrow={1} minWidth={0} minHeight={0}`         | те же ключи, числа как есть                                |
| `padding={2}`, `paddingLeft={2}`, `mt={1}`, `p/m` | `theme.spacing(2)` (число Box = единица `theme.spacing`)   |
| `gridGap={16}`                                    | `gap: 16` (у Box v4 это пиксели)                           |
| `bgcolor="background.default"`, `color="…"`       | `theme.palette.background.default` и т.п. — только из темы |
| `width/height` числом                             | число (px); строки (`'100vh'`, `'50%'`) — как есть         |
| `style={{…}}` на Box                              | перенести в класс (инлайн-стиль тоже пересоздаётся)        |
| `className={classes.x}` + пропсы                  | слить пропсы в `classes.x`                                 |
| `component="span"` и т.п.                         | соответствующий тег                                        |
| `data-testid`, обработчики, `ref`                 | переносятся на `div` без изменений                         |

- Тема: `makeStyles<EditorTheme>((theme) => …)` (тип из `@presentation/theme/editor-theme`);
  на страницах вне `EditorThemeProvider` (список проектов) — проверь, какая тема в контексте,
  и бери тот же тип, что уже использует файл.
- Имена классов — по роли (`body`, `toolbarRail`, `field`), не `box1`.
- Комментарий над `useStyles` (один на файл): «Вёрстка — div + makeStyles, не Box (R-BOX)».
- Hex и цвета вне темы запрещены (`npm run rules` проверит).
- Динамические значения (зависят от пропсов) — пропсы `makeStyles` (`useStyles(props)`) или
  условный класс; не возвращаться к `style={{}}` без нужды.

## Шаги (по файлу; поиск: `grep -n "<Box" <файл>`)

### R-BOX-1. Панель атрибутов (горячее место: ввод на каждую клавишу)

- `src/presentation/features/attributes/attributes-panel.tsx` — 8 `Box`;
- `src/presentation/features/attributes/builtin-property-editors.tsx` — 6 `Box`.

Проверка: `npm run ui -- --click "[data-element-card]" --exists "[data-testid=attributes-panel]"
--exists "[data-testid=complex-logic-section]"` (секция есть у Select list), ввод в поле:
`--click "[data-testid=attributes-panel] input" --type "abc"`; скриншот панели
`--shot .agent-logs/r-box-1.png@[data-testid=attributes-panel]` — сравнить отступы с макетом
`docs/design-mockups/*.png` (панель справа).

### R-BOX-2. Канвас: контролы и пустое состояние

- `src/presentation/features/canvas/editor-canvas-controls.tsx` — 4 `Box` (undo/redo, зум);
- `src/presentation/features/canvas/empty-canvas-state.tsx` — 3 `Box` (не ловит мышь —
  сохранить `pointer-events: none`).

Проверка: кнопки undo/redo/зум кликаются; пустой проект (`--url "http://localhost:3123/#/"`,
создать проект) — заглушка видна, полотно под ней тянется мышью; скриншот левого нижнего угла.

### R-BOX-3. Топбар и тулбар

- `src/presentation/features/top-bar/editor-top-bar.tsx` — 3 `Box` (`gridGap={16}` → `gap`);
- `src/presentation/features/toolbar/editor-toolbar.tsx` — 1 `Box`.

Проверка: поиск в топбаре (`--click "input" --type "Вклад" --exists "<выпадающий список>"`),
кнопки «Сохранить»/«Экспорт JSON»; меню тулбара открывается; скриншот топбара.

### R-BOX-4. Список проектов + запрет `Box`

- `src/presentation/pages/project-list/ProjectListPage.tsx` — 7 `Box`;
- после — `grep -rn "<Box\|{ Box\|Box," src` должен быть пуст;
- добавить правило в `scripts/agent/rules-check.mjs` (по образцу соседних `re`/`msg`):
  импорт `Box` из `@blueprint-vendor/flamingo-core` в `src` — ошибка
  «Box тормозит рендер — div + makeStyles (R-BOX)».

Проверка: `--url "http://localhost:3123/#/"` — список проектов, диалог создания проекта
(Enter создаёт), импорт JSON; скриншот страницы.

## Готово, когда

- `<Box` в `src` нет, правило в `rules-check` ловит возврат;
- вёрстка на скриншотах совпадает с прежней (отступы, выравнивание);
- в README статус плана — ✅.
