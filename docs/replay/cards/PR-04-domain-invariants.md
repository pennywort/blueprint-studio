# PR-04 `domain-invariants`

| Поле                        | Значение                              |
| --------------------------- | ------------------------------------- |
| Change id (папка)           | `openspec/changes/domain-invariants/` |
| Capability (подсказка)      | `invariants`                          |
| Номера для commit-сообщения | T-006                                 |

## Карточка из плана

- **Состав:** T-006: #1 одно вложение на форму, #2 Radio ≤ 5, #3–5 маршрутизация vs динамический контент,
  `scenario-type-fields`, `validateGraph(graph) → InvariantViolation[]` (`{rule, path, message}`). Инварианты 6–7 — deferred, 8 — dropped.
- **Источники:** `af8ba3e`; конституция §4; PROJECT_STATE §5.
- **Пути:** `src/domain/invariants/*`.
- **Критерии:** каждое правило конституции §4 имеет чистую функцию; `validateGraph` агрегирует.
- **Не входит:** `single-root-level` (PR-14), `logic-rules` (PR-17), `step-transitions` (PR-19) — добавляются своими PR.

## Где проверять по коду (grep в репозитории; спека описывает то, что реально есть)

`scenario-type-fields`, `validateGraph(graph) → InvariantViolation[]`, `src/domain/invariants/*`, `validateGraph`, `single-root-level`, `logic-rules`, `step-transitions`

---

Шаг закрыт, когда выполнено всё из INSTRUCTIONS §6.
