# Задача 04 — Доменные инварианты и validateGraph

| Поле                         | Значение            |
| ---------------------------- | ------------------- |
| change id                    | `domain-invariants` |
| Эпик                         | 001                 |
| Номера (T-xxx / ADR / D / R) | T-006               |
| Реальные коммиты (справка)   | af8ba3e             |

## Цель

Правила ТЗ — чистые функции `(graph, rules) => InvariantViolation[]`, собранные в validateGraph.

## Состав (что реализовано и должно попасть в change)

- Radio — не более 5 вариантов (#2)
- Маршрутизация и динамический контент взаимоисключающи (#3–5)
- Лимиты числа элементов по видам и блокам (по умолчанию — одно вложение на шаг формы, правило #1) — строки таблицы правил
- validateGraph / collectViolations; формат InvariantViolation { rule, path, message }

## Не входит (не описывать)

- Инварианты 6 (workflow, Epic 004), 7 (deferred), 8 (dropped). layer-capacity, logic-rules, step-transitions — в своих задачах.

## Где проверять по коду

- `src/domain/invariants/index.ts`
- `src/domain/invariants/radio-max-five-options.ts`
- `src/domain/invariants/routing-excludes-dynamic-content.ts`
- `src/domain/invariants/element-count-limits.ts`
- `specs/000-constitution.md`
