# Задача 32 — Состояние редактора разрезано на хуки

| Поле                         | Значение                       |
| ---------------------------- | ------------------------------ |
| change id                    | `canvas-architecture-refactor` |
| Эпик                         | 002                            |
| Номера (T-xxx / ADR / D / R) | R3, R4                         |
| Реальные коммиты (справка)   | d562b14, 0de81eb, 8676750      |

## Цель

Состояние и обработчики канваса разделены по ответственности.

## Состав (что реализовано и должно попасть в change)

- editor-store, use-selection, use-connection, use-canvas-search, use-canvas-nodes вместо одного хука (R3)
- Единый обход страниц, id только через фабрики, общий приёмник dnd, «текущий drag» модулем (R4)

## Не входит (не описывать)

- R-ENT, R-ARC-3…7 (не выполнены).

## Где проверять по коду

- `src/presentation/features/canvas/editor-store.ts`
- `src/presentation/features/canvas/use-editor-graph.ts`
- `src/presentation/features/canvas/use-canvas-nodes.ts`
