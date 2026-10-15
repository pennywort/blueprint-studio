# PR-19 `form-step-transitions`

| Поле                        | Значение                                  |
| --------------------------- | ----------------------------------------- |
| Change id (папка)           | `openspec/changes/form-step-transitions/` |
| Capability (подсказка)      | `form-steps`                              |
| Номера для commit-сообщения | ADR-18                                    |

## Карточка из плана

- **Состав:** сущность `StepTransition` (от элемента шага или варианта Select'а → на более поздний шаг той же формы, один переход
  у источника), `Add/RemoveStepTransition`, инвариант, каскады; цель встаёт сразу за источником; переходы назад рвутся;
  `MoveFormStep` (dnd шагов за заголовок), общая перестановка `moveByAnchor` для страниц и шагов;
  ADR-18 — шаги по уровням (`form-step-depths`, `FormStep.layerDepth`), ветвление шагов друг под другом, `formStepLabel`.
- **Источники:** `90b6fdc`, `194aebc`, `6ac3950`, `a5a1b14`, `de44405`, `cfe25f2`.
- **Критерии:** несмежные переходы рвутся (N4); цель — на уровне «источник + 1».

## Где проверять по коду (grep в репозитории; спека описывает то, что реально есть)

`StepTransition`, `Add/RemoveStepTransition`, `MoveFormStep`, `moveByAnchor`, `form-step-depths`, `FormStep.layerDepth`, `formStepLabel`

---

Шаг закрыт, когда выполнено всё из INSTRUCTIONS §6.
