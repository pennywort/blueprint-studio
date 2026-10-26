# Задача 03 — Доменная модель ServiceGraph

| Поле                         | Значение                                         |
| ---------------------------- | ------------------------------------------------ |
| change id                    | `domain-service-graph-model`                     |
| Эпик                         | 001                                              |
| Номера (T-xxx / ADR / D / R) | T-005, T-010, ADR-10, ADR-17                     |
| Реальные коммиты (справка)   | af8ba3e — только справка (модель позже изменена) |

## Цель

Вся предметная модель карты — Zod-схемы в domain, без React и инфраструктуры.

## Состав (что реализовано и должно попасть в change)

- ServiceGraph: Главная, подсценарии, формы заявки, шаги формы
- Branded ID (ids.ts) и PageEntityId
- Универсальный элемент CanvasElement { id, kind, props, ext }: kind — имя элемента фреймворка, props — по его JSON-схеме (детали источника схем — в задаче framework-element-schemas)
- Метаданные маршрутизации элемента (routing) — основа инвариантов #3–5

## Не входит (не описывать)

- 12 zod-схем компонентов формы из spec 001 — заменены схемами фреймворка, не описывать.

## Где проверять по коду

- `src/domain/model/service-graph.ts`
- `src/domain/model/scenario.ts`
- `src/domain/model/canvas-element.ts`
- `src/domain/model/ids.ts`
- `specs/001-foundation/spec.md`
