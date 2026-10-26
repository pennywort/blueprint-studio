# Задача 29 — Сохранение карты в браузере

| Поле                         | Значение            |
| ---------------------------- | ------------------- |
| change id                    | `graph-persistence` |
| Эпик                         | 002                 |
| Номера (T-xxx / ADR / D / R) | T-052, T-053        |
| Реальные коммиты (справка)   | a6937ad, 8676750    |

## Цель

Карта сохраняется и открывается снова.

## Состав (что реализовано и должно попасть в change)

- Порт IGraphRepository + IndexedDbGraphRepository; Zod-проверка при чтении; миграции версий записи
- Загрузка при открытии редактора, «Сохранить» → уведомление по результату
- «На согласование» — disabled с пояснением до Epic 004

## Не входит (не описывать)

- Серверное хранилище; /preview (T-051).

## Где проверять по коду

- `src/application/ports/graph-repository.ts`
- `src/infrastructure/persistence/indexed-db-graph-repository.ts`
- `src/infrastructure/persistence/graph-record-migration.ts`
- `src/infrastructure/persistence/graph-record-parse.ts`
