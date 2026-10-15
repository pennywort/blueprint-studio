# PR-18 `form-steps-layout`

| Поле                        | Значение                              |
| --------------------------- | ------------------------------------- |
| Change id (папка)           | `openspec/changes/form-steps-layout/` |
| Capability (подсказка)      | `form-steps`                          |
| Номера для commit-сообщения | ADR-16, D1                            |

## Карточка из плана

- **Состав:** ADR-16 — шаг формы раскладывается колонками по правилам «Сложной логики» (цель напротив варианта-источника,
  варианты Select карточками `option-card`), `step-element-depths`, `form-step-layers`, шаг растёт по горизонтали;
  `AddFormStep` («+ Добавить шаг», D1), `RemoveFormStep` (рвёт связи, сохраняет уровни), dnd по колонкам шага; расширение шага на время drag;
  выделение формы и шага клик-ом (S10).
- **Источники:** `5b367e7` (N3), `2a57ce3`, `853ec4c`, `029d9d2`, `5bffe11`.
- **Пути:** `src/domain/step-element-depths.ts`, `nodes/form-node.tsx`, `nodes/form-step-layers.tsx`, `nodes/option-card.tsx`.

## Где проверять по коду (grep в репозитории; спека описывает то, что реально есть)

`option-card`, `step-element-depths`, `form-step-layers`, `AddFormStep`, `RemoveFormStep`, `src/domain/step-element-depths.ts`, `nodes/form-node.tsx`, `nodes/form-step-layers.tsx`, `nodes/option-card.tsx`

---

Шаг закрыт, когда выполнено всё из INSTRUCTIONS §6.
