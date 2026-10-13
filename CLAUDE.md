# CLAUDE.md — контекст проекта для Claude Code

> Базовый контекст проекта — **`KIMI.md`** (прочитай его первым): стек, слои,
> реестр TEMPORARY-подмен, рабочий процесс. Этот файл — дополнения для
> Claude Code. **Правило синхронизации [owner 2026-10-13]:** если решение
> владельца меняет общее для агентов (стек, правила, процесс, политика
> тестов), обнови **оба** файла — `KIMI.md` и `CLAUDE.md` — в одном коммите.

## Источники правды (по порядку)

1. `PROJECT_STATE.md` — состояние: DONE/NOT DONE, ADR, баги приёмки (§6), план (§7).
   Структура фиксирована — правила в его шапке (SCHEMA RULES).
2. `specs/000-constitution.md` — конституция, побеждает любую спеку.
3. `docs/декомпозиция-canvas-редактор.md` — задачи T-xxx, решения D1–D13 (не обсуждаются).
4. `docs/дизайн-сложная-логика.md` — «Сложная логика» (L1–L8, инварианты L-I1…L-I6).

Нет ответа в источниках или код противоречит доменному правилу (например,
L-I5) — спроси владельца, не выдумывай.

## Железные правила (кратко, подробно — KIMI.md §4–§7)

- **Тесты НИКОГДА не пишем и НИКОГДА не запускаем**; скрипта `test` в package.json нет [owner 2026-10-13].
  Верификация = `npm run lint && npm run build` + ручная проверка в приложении.
- Любое изменение графа — команда через `CommandBus` (immer `produceWithPatches`).
- 4 слоя `domain → application → infrastructure → presentation` (eslint-plugin-boundaries).
- UI только из `@sber-friend/*` (сейчас шимы поверх MUI v4 в `vendor/flamingo`),
  прямые импорты `@material-ui/*` в `src` запрещены; цвета только из темы
  (`src/presentation/theme/editor-theme.ts`), литеральные hex в компонентах запрещены.
- Комментарии в коде — на русском, со ссылкой на задачу/решение (T-xxx, D-x, ADR-xx, Nx).
- Коммиты — conventional commits на русском (commitlint, husky + lint-staged).

## Окружение Claude Code (облачная сессия)

- После старта контейнера: `npm ci` (registry `@sber-friend/*` не нужен — шимы `file:vendor/...`).
- Dev-сервер: `npx rsbuild dev --port 3123`, редактор — `http://localhost:3123/#/editor`
  (демо-граф `sample-graph.ts`).
- Ручная проверка — Playwright из `/opt/node-tools/node_modules/playwright`,
  браузер `/opt/pw-browsers/chromium`; скрипты и скриншоты — в scratchpad, не в репо.

## PROJECT_STATE: команды

Механика вынесена в скрипт `scripts/project-state.mjs` — работает без LLM:

| Команда                              | Что делает                                                                           |
| ------------------------------------ | ------------------------------------------------------------------------------------ |
| `npm run state:check`                | git log/status + сверка §2 STACK с package.json + существование хешей коммитов в git |
| `npm run state:log -- <кто> "<что>"` | бамп `UPDATED` + append строки в §9 CHANGELOG (append-only)                          |

Slash-команды `/check-state`, `/update-state` (`.claude/commands/`) вызывают
скрипт и добавляют только смысловую часть (куда отнести факт). Аналоги для
других агентов — `.kimi/commands/`, `.qwen/commands/`.
