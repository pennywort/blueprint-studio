# PR-06 `command-bus-di-container`

| Поле                        | Значение                                     |
| --------------------------- | -------------------------------------------- |
| Change id (папка)           | `openspec/changes/command-bus-di-container/` |
| Capability (подсказка)      | `command-bus`                                |
| Номера для commit-сообщения | T-008, T-009, ADR-05, ADR-04                 |

## Карточка из плана

- **Состав:** T-008 `CommandBus` (execute/undo/redo через `produceWithPatches`, ADR-05), `AddFormComponent`, ошибки команд;
  T-009 Awilix `InjectionMode.PROXY`, composition root `buildContainer()` в `bootstrap.tsx` (ADR-04).
- **Критерии:** undo возвращает состояние `toEqual` исходному, redo повторяет; единственный механизм мутации — патчи Immer.
- **Тег:** `v0.1.0` (закрытие Epic 001).

## Где проверять по коду (grep в репозитории; спека описывает то, что реально есть)

`CommandBus`, `produceWithPatches`, `AddFormComponent`, `InjectionMode.PROXY`, `buildContainer()`, `bootstrap.tsx`, `toEqual`, `v0.1.0`

---

Шаг закрыт, когда выполнено всё из INSTRUCTIONS §6.
