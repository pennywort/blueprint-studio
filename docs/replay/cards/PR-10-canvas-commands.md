# PR-10 `canvas-commands`

| Поле                        | Значение                            |
| --------------------------- | ----------------------------------- |
| Change id (папка)           | `openspec/changes/canvas-commands/` |
| Capability (подсказка)      | `command-bus`                       |
| Номера для commit-сообщения | T-035                               |

## Карточка из плана

- **Состав:** T-035: команды `Add/RemoveScenario`, `Add/RemoveForm`, `Add/RemoveFormStep`, `Add/RemoveElement`,
  `UpdateElementProps`, `Connect/Disconnect/ReconnectElements`, `ReorderInLayer`, `graph-lookup.ts`, каскады связей при удалении.
  Политика: UI не мутирует состояние, всё — через CommandBus.
- **Источники:** `54579b7`.
- **Критерии:** каждая команда обратима (undo/redo); удаление узла рвёт входящие/исходящие связи.

## Где проверять по коду (grep в репозитории; спека описывает то, что реально есть)

`Add/RemoveScenario`, `Add/RemoveForm`, `Add/RemoveFormStep`, `Add/RemoveElement`, `UpdateElementProps`, `Connect/Disconnect/ReconnectElements`, `ReorderInLayer`, `graph-lookup.ts`

---

Шаг закрыт, когда выполнено всё из INSTRUCTIONS §6.
