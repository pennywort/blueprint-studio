# Задача 12 — Узлы канваса и карточки элементов

| Поле                         | Значение                           |
| ---------------------------- | ---------------------------------- |
| change id                    | `canvas-nodes-and-elements`        |
| Эпик                         | 002                                |
| Номера (T-xxx / ADR / D / R) | T-031                              |
| Реальные коммиты (справка)   | c1f312f, fcd5f30, aeb02ed, fc7b24e |

## Цель

Блоки и элементы отображаются собственными компонентами по макету.

## Состав (что реализовано и должно попасть в change)

- T-031 кастомные узлы Главная / Подсценарий / Форма, карточка элемента
- Контролы канваса: зум (мин. 10%), undo/redo
- Инструмент «Рука» с выключателем в конфиге редактора
- Карточка элемента 328×200, чипы, скругления по макету

## Мелочи — пункты tasks.md, НЕ отдельные changes

- Рамка выделения внутри сущности; точки входа рёбер на линии рамки; без теней у блоков

## Где проверять по коду

- `src/presentation/features/canvas/nodes/scenario-node.tsx`
- `src/presentation/features/canvas/nodes/form-node.tsx`
- `src/presentation/features/canvas/nodes/element-card.tsx`
- `src/presentation/features/canvas/editor-canvas-controls.tsx`
