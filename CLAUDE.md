# CLAUDE.md — дополнения для Claude Code

@AGENTS.md

> Всё общее для агентов (стиль ответов, источники правды, правила, команды,
> чек-лист) — в `AGENTS.md` выше. Здесь — только специфичное для Claude Code.
> **Правило синхронизации [owner 2026-10-13]:** общее правится в `AGENTS.md`;
> `CLAUDE.md` / `QWEN.md` — только своё. После правки `.claude/agents/*` —
> `npm run agents:sync` (порт в `.qwen/agents/`) в том же коммите.

## Субагенты (`.claude/agents/`, дешёвые модели)

Шумную работу отдавай им — в основной контекст вернётся только короткий итог.

| Агент            | Модель | Когда                                                |
| ---------------- | ------ | ---------------------------------------------------- |
| `code-finder`    | haiku  | «где реализовано X» по нескольким файлам             |
| `spec-lookup`    | haiku  | вопрос по конституции / T-xxx / D-x / ADR / L-x      |
| `state-auditor`  | haiku  | нужно ли обновлять PROJECT_STATE; что предложить     |
| `ui-checker`     | sonnet | ручная проверка сценария в приложении (`npm run ui`) |
| `rules-reviewer` | sonnet | ревью diff по правилам AGENTS.md §4 перед коммитом   |

Субагенты ничего не правят — правки делает основной агент.

## Хуки (`.claude/settings.json`) — работают сами

- **SessionStart:** `npm ci`, если нет `node_modules` (вывод сжат).
- **PreToolUse (Bash):** `bash-guard` блокирует правку кода через shell
  (python, `sed -i`, `>` в `src/`, `scripts/`, `vendor/`) — правь через Edit/Write.
- **PostToolUse (Edit/Write):** eslint изменённого файла; ошибки придут сразу.
- **Stop:** страховка, если правки в `src/vendor/scripts` забыли закоммитить, —
  `verify` + `rules`; красное не даст завершить ответ. Обычно проверки гоняет pre-commit.
- `env`: вывод Bash обрезается до 15 000 символов, цвета (ANSI) выключены.
- `deny`: чтение `node_modules`, `dist`, `package-lock.json`, `*.disabled`, `docs/archive`.

## Облачная сессия

- Dev-сервер вручную не нужен: `npm run ui` поднимает его сам (порт 3123,
  `http://localhost:3123/#/editor`).
- Playwright — `/opt/node-tools/node_modules/playwright`, браузер `/opt/pw-browsers/chromium`
  (скрипт находит сам). Скриншоты — в `.agent-logs/` или scratchpad, не в репо.
- Длинные сессии: `/compact` на границе задач, `/clear` между независимыми задачами.
- Slash-команды `/check-state`, `/update-state` — `.claude/commands/`.
