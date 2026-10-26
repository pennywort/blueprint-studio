# Задача 06 — CommandBus и DI-контейнер

| Поле                         | Значение                                       |
| ---------------------------- | ---------------------------------------------- |
| change id                    | `command-bus-di-container`                     |
| Эпик                         | 001                                            |
| Номера (T-xxx / ADR / D / R) | T-008, T-009, ADR-04, ADR-05, R-ARC-1, R-ARC-2 |
| Реальные коммиты (справка)   | af8ba3e, 151ef5c, 1a0c123, 4f75c4e             |

## Цель

Единственный механизм мутации графа — команды на патчах Immer; composition root на Awilix.

## Состав (что реализовано и должно попасть в change)

- Command (execute/undo/redo), CommandBus на produceWithPatches
- Проверка инвариантов в CommandBus: команда отклоняется только при новых нарушениях (R-ARC-2)
- Сброс undo-истории при открытии редактора (R-ARC-1)
- Awilix InjectionMode.PROXY, деструктуризация в конструкторах, buildContainer() в bootstrap

## Где проверять по коду

- `src/application/commands/command.ts`
- `src/application/commands/command-bus.ts`
- `src/application/commands/errors.ts`
- `src/infrastructure/container.ts`
