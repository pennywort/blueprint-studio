# Локальные переопределения рабочей машины [owner 2026-10-22]

С рабочей машины можно только `git pull`, пушить нельзя, и только там доступен
registry Flamingo. Поэтому всё, что касается Flamingo, живёт **в файлах вне git**:
`git pull` их не трогает и не конфликтует с ними.

| Что                                     | Файл / команда                                              | В git |
| --------------------------------------- | ----------------------------------------------------------- | ----- |
| Иконки Flamingo                         | `src/presentation/icons/editor-icons.local.tsx`             | нет   |
| Пакет иконок                            | `npm install --no-save <пакет иконок flamingo>@<версия>`    | нет   |
| Таблица ролей                           | `src/presentation/icons/editor-icons.ts` (правит облако)    | да    |
| Заглушка без файла                      | `src/presentation/icons/editor-icons.none.ts`               | да    |
| Иконки атрибута `icon` (глифы по имени) | `src/presentation/icons/framework-icons.local.tsx`          | нет   |
| Тип резолвера                           | `src/presentation/icons/framework-icons.ts` (правит облако) | да    |

Два набора иконок — не путать:

- **Иконки интерфейса редактора** (корзина, плейсхолдер на элементах, зум…) —
  `editor-icons.local.tsx`: частичная таблица «роль → компонент».
- **Иконки фреймворка** — значения атрибута `icon` (имена из enum схемы:
  `alert_triangle`, `*_filled`) — `framework-icons.local.tsx`: функция
  `(name) => компонент | undefined` (`FrameworkIconResolver`). `undefined` — монограмма.

## Как работает

- Код берёт иконки только из `editorIcons` (роль → компонент), по умолчанию — MUI
  (TEMPORARY, temporary-registry п. 10). Импорт `@material-ui/icons` вне
  `src/presentation/icons/` запрещён eslint.
- Алиас `@local/editor-icons` (tsconfig paths + `rsbuild.config.ts`) ведёт на
  `editor-icons.local.tsx`, если файл есть, иначе на заглушку `editor-icons.none.ts`.
- Локальный файл экспортирует по умолчанию `EditorIconOverrides` — частичную таблицу:
  указанные роли заменяются, остальные остаются MUI. Новая роль в облаке локальный
  файл не ломает.
- `npm install` / `npm ci` после pull удаляет пакеты, поставленные с `--no-save`, —
  после них повтори установку пакета иконок.

## Правила для локального агента

- Править можно ТОЛЬКО файлы из `.gitignore` (`*.local.ts`, `*.local.tsx`, `.env.local`).
- `git status --short` после работы должен быть пустым (строки `!!` — норма).
- Ломается что-то вне локального файла → не чинить, описать ошибку владельцу текстом.
- `@material-ui/core` — один экземпляр: `npm ls @material-ui/core` без второй версии.

## Режим «движок по симлинкам» [owner 2026-11-17, ОВ-21]

На рабочей машине пакеты lib-app-core — **схемы** элементов (полный набор атрибутов; редактор
сужает их политикой) и **preview-элементы** (упрощённые копии на Flamingo: тот же вид и те же props, без
зависимостей фреймворка; для предпросмотра T-051, Q-8) — подключаются из локального монорепо
симлинками, чтобы правки элемента сразу были видны в редакторе.

**MUI v4 — только у studio** (UI редактора). Flamingo в lib-app-core на MUI не опирается [owner 2026-11-17];
пакеты движка `@material-ui/*` не тянут (проверено 2026-11-17), поэтому в `dedupe` его нет.

**Всё машинное — вне git; `package.json`, `package-lock.json`, `rsbuild.config.ts`, `tsconfig.json` не править.**

| Что                                                             | Где                                                          | В git |
| --------------------------------------------------------------- | ------------------------------------------------------------ | ----- |
| Подключение пакетов                                             | `npm install --no-save <путь к пакету>` (или `npm link`)     | нет   |
| `dev.lazyCompilation: false`, `dev.client.overlay: false` и др. | `rsbuild.config.local.ts` (сливается поверх базового)        | нет   |
| `resolve.dedupe` (react, react-dom)                             | `rsbuild.config.ts` — всегда, без симлинков ничего не меняет | да    |
| tsconfig `paths` `react*` → `node_modules/@types/react*`        | `tsconfig.json` — всегда (tsconfig не бывает локальным)      | да    |

Пример `rsbuild.config.local.ts`:

```ts
import type { RsbuildConfig } from '@rsbuild/core';

const config: RsbuildConfig = {
  // пересборка пакета (rimraf dist) не оставляет залипшего «Module not found»
  dev: { lazyCompilation: false, client: { overlay: false } },
};

export default config;
```

- В консоли сборки — `[rsbuild] + rsbuild.config.local.ts`, значит файл подхвачен.
- `npm install` / `npm ci` после pull снимает пакеты `--no-save` — подключи их снова.
- Нужна правка вне этих файлов — «Запрос к ядру» владельцу (AGENTS.md §8).
- Снимается при переходе на пакеты из registry.
