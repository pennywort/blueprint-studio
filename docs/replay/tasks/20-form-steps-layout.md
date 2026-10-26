# Задача 20 — Шаги формы заявки как слой с колонками

| Поле                         | Значение                  |
| ---------------------------- | ------------------------- |
| change id                    | `form-steps-layout`       |
| Эпик                         | 002                       |
| Номера (T-xxx / ADR / D / R) | ADR-16, D1                |
| Реальные коммиты (справка)   | 2a57ce3, 853ec4c, b51f468 |

## Цель

Шаг формы раскладывается колонками по правилам логики, как канвас страниц.

## Состав (что реализовано и должно попасть в change)

- Колонка элемента шага = уровень по правилам логики, цель напротив варианта, варианты Select — карточками (ADR-16)
- AddFormStep / RemoveFormStep (рвёт связи, сохраняет уровни)
- dnd по колонкам шага; новый элемент — в следующую колонку
- Выделение формы и шага; Delete удаляет шаг, а не форму

## Мелочи — пункты tasks.md, НЕ отдельные changes

- Зазор Select↔варианты, handle варианта по центру, симметричный шаг

## Где проверять по коду

- `src/domain/step-element-depths.ts`
- `src/presentation/features/canvas/nodes/form-step-layers.tsx`
- `src/presentation/features/canvas/nodes/option-card.tsx`
- `src/application/commands/add-form-step.ts`
