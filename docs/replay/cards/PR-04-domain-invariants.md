# PR-04 `domain-invariants`

| Поле                                  | Значение                        |
| ------------------------------------- | ------------------------------- |
| Режим                                 | **SLICE** (см. INSTRUCTIONS §5) |
| Размер                                | S (1 сессия: CODE+DOCS+CLOSE)   |
| Реальные коммиты в `legacy/pre-graft` | —                               |

## Карточка из плана

- **Состав:** T-006: #1 одно вложение на форму, #2 Radio ≤ 5, #3–5 маршрутизация vs динамический контент,
  `scenario-type-fields`, `validateGraph(graph) → InvariantViolation[]` (`{rule, path, message}`). Инварианты 6–7 — deferred, 8 — dropped.
- **Источники:** `af8ba3e`; конституция §4; PROJECT_STATE §5.
- **Пути:** `src/domain/invariants/*`.
- **Критерии:** каждое правило конституции §4 имеет чистую функцию; `validateGraph` агрегирует.
- **Не входит:** `single-root-level` (PR-14), `logic-rules` (PR-17), `step-transitions` (PR-19) — добавляются своими PR.

---

Готово, только когда выполнено всё из INSTRUCTIONS §7 (Definition of Done).
