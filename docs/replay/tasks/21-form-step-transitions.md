# Задача 21 — Переходы между шагами и ветвление шагов

| Поле                         | Значение                                    |
| ---------------------------- | ------------------------------------------- |
| change id                    | `form-step-transitions`                     |
| Эпик                         | 002                                         |
| Номера (T-xxx / ADR / D / R) | ADR-18                                      |
| Реальные коммиты (справка)   | 90b6fdc, de44405, 6ac3950, 5b6bc68, 82f3898 |

## Цель

Форма — граф шагов с переходами и уровнями.

## Состав (что реализовано и должно попасть в change)

- StepTransition: от элемента шага или варианта Select на более поздний шаг той же формы; один переход у источника
- Add/RemoveStepTransition, инвариант, каскады
- Шаги по уровням, ветвление друг под другом (ADR-18); цель — уровень «источник + 1»
- MoveFormStep (dnd шага за весь блок), SwapFormSteps (обмен местами), общая перестановка moveByAnchor

## Не входит (не описывать)

- Лимит шагов первого уровня — отключён.

## Где проверять по коду

- `src/domain/model/step-transition.ts`
- `src/domain/step-transitions.ts`
- `src/domain/form-step-depths.ts`
- `src/application/commands/swap-form-steps.ts`
- `src/application/commands/move-form-step.ts`
