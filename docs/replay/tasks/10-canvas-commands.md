# Задача 10 — Команды редактирования графа

| Поле                         | Значение          |
| ---------------------------- | ----------------- |
| change id                    | `canvas-commands` |
| Эпик                         | 002               |
| Номера (T-xxx / ADR / D / R) | T-035             |
| Реальные коммиты (справка)   | 54579b7           |

## Цель

Каждое изменение карты — обратимая команда.

## Состав (что реализовано и должно попасть в change)

- Add/RemoveScenario, Add/RemoveForm, Add/RemoveFormStep, Add/RemoveElement, UpdateElementProps, Connect/Disconnect/ReconnectElements, ReorderInLayer (с якорем)
- graph-lookup, каскад связей при удалении

## Не входит (не описывать)

- Команды логики, шагов, переходов — в своих задачах.

## Где проверять по коду

- `src/application/commands/graph-lookup.ts`
- `src/application/commands/add-scenario.ts`
- `src/application/commands/remove-element.ts`
- `src/application/commands/reorder-in-layer.ts`
