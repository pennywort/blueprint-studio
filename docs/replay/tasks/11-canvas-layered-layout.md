# Задача 11 — Адаптер graph↔flow и слоистая раскладка

| Поле                         | Значение                      |
| ---------------------------- | ----------------------------- |
| change id                    | `canvas-layered-layout`       |
| Эпик                         | 002                           |
| Номера (T-xxx / ADR / D / R) | T-030, T-036, ADR-11, D7, D13 |
| Реальные коммиты (справка)   | 54579b7, c1f312f              |

## Цель

Раскладка вычисляется из графа: колонка = уровень навигации.

## Состав (что реализовано и должно попасть в change)

- T-030 graphToFlow / flowConnectionToLink / flowNodesToLayerOrder
- T-036 computeLayout: колонка = глубина от Главной, порядок по orderIndex, измеренные размеры узлов
- Общее ядро уровней computeLayerDepths; явный layerDepth у блоков (ADR-11)

## Мелочи — пункты tasks.md, НЕ отдельные changes

- Зазоры колонок по измеренным размерам (без «огромного вертикального зазора»)

## Где проверять по коду

- `src/presentation/features/canvas/graph-flow-adapter.ts`
- `src/presentation/features/canvas/canvas-layout.ts`
- `src/domain/layer-depths.ts`
- `src/domain/graph-depths.ts`
