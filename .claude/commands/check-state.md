---
description: Сверить PROJECT_STATE.md с репозиторием (только чтение)
---

READ-ONLY аудит, файлы не менять.

1. Выполни `npm run state:summary` и `npm run state:check` (PROJECT_STATE.md целиком не читать; секция — `npm run state:section -- <id>`) — механическая сверка (§2 STACK vs package.json, хеши коммитов, git log/status). Её вывод приводи как есть, не пересказывай.
2. Смысловая сверка — только для коммитов из `git log`, которых ещё нет в §4.1 PROJECT_STATE: `git show --stat <hash>` и при необходимости содержимое файлов (stub ≠ реализация).
3. Отчёт: ✅ MATCH кратко, ⚠️ DRIFT в формате `[секция] заявлено: X | фактически: Y | проверено: <команда>`. Ничего не выдумывать.
