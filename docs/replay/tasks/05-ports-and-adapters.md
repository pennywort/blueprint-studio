# Задача 05 — Порты application и базовые адаптеры

| Поле                         | Значение             |
| ---------------------------- | -------------------- |
| change id                    | `ports-and-adapters` |
| Эпик                         | 001                  |
| Номера (T-xxx / ADR / D / R) | T-007, ADR-07, D3    |
| Реальные коммиты (справка)   | af8ba3e              |

## Цель

Внешние контракты — только за портами application/ports.

## Состав (что реализовано и должно попасть в change)

- Порты IElementSchemaProvider, IIdGenerator, IClock (позже к ним добавятся репозиторий, кодек файла, источники настроек — в своих задачах)
- Адаптеры UuidIdGenerator, SystemClock

## Не входит (не описывать)

- Реализация провайдера схем (FrameworkSchemaProvider) — задача framework-element-schemas.

## Где проверять по коду

- `src/application/ports/element-schema-provider.ts`
- `src/application/ports/id-generator.ts`
- `src/application/ports/clock.ts`
- `src/infrastructure/misc/uuid-id-generator.ts`
- `src/infrastructure/misc/system-clock.ts`
