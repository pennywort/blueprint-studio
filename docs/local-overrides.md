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
