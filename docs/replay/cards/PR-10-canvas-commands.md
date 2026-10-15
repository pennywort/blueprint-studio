# PR-10 `canvas-commands`

| Поле                                  | Значение                             |
| ------------------------------------- | ------------------------------------ |
| Режим                                 | **SLICE** (см. INSTRUCTIONS §5)      |
| Размер                                | M (2 сессии: CODE, затем DOCS+CLOSE) |
| Реальные коммиты в `legacy/pre-graft` | 54579b7 — справка                    |

## Карточка из плана

- **Состав:** T-035: команды `Add/RemoveScenario`, `Add/RemoveForm`, `Add/RemoveFormStep`, `Add/RemoveElement`,
  `UpdateElementProps`, `Connect/Disconnect/ReconnectElements`, `ReorderInLayer`, `graph-lookup.ts`, каскады связей при удалении.
  Политика: UI не мутирует состояние, всё — через CommandBus.
- **Источники:** `54579b7`.
- **Критерии:** каждая команда обратима (undo/redo); удаление узла рвёт входящие/исходящие связи.

---

Готово, только когда выполнено всё из INSTRUCTIONS §7 (Definition of Done).
