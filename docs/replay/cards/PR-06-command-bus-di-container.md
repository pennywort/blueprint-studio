# PR-06 `command-bus-di-container`

| Поле                                  | Значение                             |
| ------------------------------------- | ------------------------------------ |
| Режим                                 | **LEGACY** (см. INSTRUCTIONS §5)     |
| Размер                                | M (2 сессии: CODE, затем DOCS+CLOSE) |
| Реальные коммиты в `legacy/pre-graft` | af8ba3e (command-bus, container)     |

## Карточка из плана

- **Состав:** T-008 `CommandBus` (execute/undo/redo через `produceWithPatches`, ADR-05), `AddFormComponent`, ошибки команд;
  T-009 Awilix `InjectionMode.PROXY`, composition root `buildContainer()` в `bootstrap.tsx` (ADR-04).
- **Критерии:** undo возвращает состояние `toEqual` исходному, redo повторяет; единственный механизм мутации — патчи Immer.
- **Тег:** `v0.1.0` (закрытие Epic 001).

---

Готово, только когда выполнено всё из INSTRUCTIONS §7 (Definition of Done).
