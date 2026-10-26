# Задача 15 — Единое выделение и удаление

| Поле                         | Значение                           |
| ---------------------------- | ---------------------------------- |
| change id                    | `canvas-selection-deletion`        |
| Эпик                         | 002                                |
| Номера (T-xxx / ADR / D / R) | ADR-12, R-PERF                     |
| Реальные коммиты (справка)   | a0c14f8, a63f207, 2846939, 99158b0 |

## Цель

Один механизм выделения и удаления для всех сущностей канваса.

## Состав (что реализовано и должно попасть в change)

- Клик = выделение, Delete/Backspace = удаление для блоков, шагов, элементов, связей (ADR-12)
- Выделение взаимоисключающее (связь, блок, шаг, элемент)
- Единая подсветка (выделение, цель связи, ошибка) — одно место

## Мелочи — пункты tasks.md, НЕ отдельные changes

- Флеер выделения, зацикливание onSelectionChange, z-index рёбер, рамка цели заменяет рамку выделения

## Где проверять по коду

- `src/presentation/features/canvas/use-selection.ts`
- `src/presentation/features/canvas/highlight/use-entity-highlight.ts`
- `src/presentation/features/canvas/canvas-interaction.tsx`
