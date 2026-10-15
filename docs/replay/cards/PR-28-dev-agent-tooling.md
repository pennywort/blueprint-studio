# PR-28 `dev-agent-tooling`

| Поле                        | Значение                              |
| --------------------------- | ------------------------------------- |
| Change id (папка)           | `openspec/changes/dev-agent-tooling/` |
| Capability (подсказка)      | `dev-tooling`                         |
| Номера для commit-сообщения | —                                     |

## Карточка из плана

- **Состав:** `AGENTS.md`, `CLAUDE.md`, `QWEN.md`, `.claude/{agents,commands,settings.json}`, `scripts/agent/*` (`verify`, `rules`, `ui`,
  `lint-file`, `stop-check`, `sync-agents`), `scripts/project-state.mjs`, `PROJECT_STATE.md`.
- **Источники:** `df5914e`, `1148aff`, `071b2c4`, `299df76`, `606ae99`, `651fc5f`.
- **Почему отдельно:** это инструментарий, не продукт; нет влияния на `src/`.

## Где проверять по коду (grep в репозитории; спека описывает то, что реально есть)

`AGENTS.md`, `CLAUDE.md`, `QWEN.md`, `.claude/{agents,commands,settings.json}`, `scripts/agent/*`, `lint-file`, `stop-check`, `sync-agents`, `scripts/project-state.mjs`, `PROJECT_STATE.md`, `src/`

---

Шаг закрыт, когда выполнено всё из INSTRUCTIONS §6.
