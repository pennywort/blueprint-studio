# Задача 27 — Подсветка нарушений инвариантов

| Поле                         | Значение                 |
| ---------------------------- | ------------------------ |
| change id                    | `violation-highlighting` |
| Эпик                         | 002                      |
| Номера (T-xxx / ADR / D / R) | T-043                    |
| Реальные коммиты (справка)   | dacf61f, 2d11634         |

## Цель

Нарушения правил видны прямо на канвасе.

## Состав (что реализовано и должно попасть в change)

- validateGraph после команды → mapViolationsToCanvas (path → узел/элемент)
- Рамка цвета ошибки и бейдж с тултипом; одна рамка у блока

## Где проверять по коду

- `src/presentation/features/canvas/violation-markers.ts`
- `src/presentation/features/canvas/nodes/violation-badge.tsx`
