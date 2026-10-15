# PR-28 `dev-agent-tooling`

| Поле                                  | Значение                             |
| ------------------------------------- | ------------------------------------ |
| Режим                                 | **SLICE** (см. INSTRUCTIONS §5)      |
| Размер                                | M (2 сессии: CODE, затем DOCS+CLOSE) |
| Реальные коммиты в `legacy/pre-graft` | —                                    |

## Карточка из плана

- **Состав:** `AGENTS.md`, `CLAUDE.md`, `QWEN.md`, `.claude/{agents,commands,settings.json}`, `scripts/agent/*` (`verify`, `rules`, `ui`,
  `lint-file`, `stop-check`, `sync-agents`), `scripts/project-state.mjs`, `PROJECT_STATE.md`.
- **Источники:** `df5914e`, `1148aff`, `071b2c4`, `299df76`, `606ae99`, `651fc5f`.
- **Почему отдельно:** это инструментарий, не продукт; нет влияния на `src/`.

---

Готово, только когда выполнено всё из INSTRUCTIONS §7 (Definition of Done).
