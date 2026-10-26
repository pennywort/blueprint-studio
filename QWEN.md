# QWEN.md — дополнения для Qwen Code

@./AGENTS.md

> Если содержимое `AGENTS.md` выше не подставилось — СНАЧАЛА прочитай файл
> `AGENTS.md` целиком: там все правила проекта. Здесь — только специфичное для Qwen.

## Как работать (строго по шагам)

1. Перед задачей: `npm run state:summary` (НЕ читай `PROJECT_STATE.md` целиком).
2. Ищи код поиском, читай файлы кусками вокруг найденного места.
3. После КАЖДОЙ правки файла: `node scripts/agent/lint-file.mjs <файл>`.
   Есть ошибки — исправь сразу.
4. В конце — чек-лист `AGENTS.md` §7, все пункты по порядку.

## Субагенты

`.qwen/agents/` — генерируются из `.claude/agents/` (`npm run agents:sync`),
вручную не править. Назначение: `code-finder` — поиск кода,
`spec-lookup` — вопросы по спекам, `state-auditor` — PROJECT_STATE,
`ui-checker` — проверка UI, `rules-reviewer` — ревью diff.

## Slash-команды

`/check-state`, `/update-state` — `.qwen/commands/`.
