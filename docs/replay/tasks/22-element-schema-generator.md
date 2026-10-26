# Задача 22 — Генератор JSON-схем элементов из кода фреймворка

| Поле                         | Значение                           |
| ---------------------------- | ---------------------------------- |
| change id                    | `element-schema-generator`         |
| Эпик                         | 002                                |
| Номера (T-xxx / ADR / D / R) | R-SCH                              |
| Реальные коммиты (справка)   | a8d3c90, 66ac82b, eb1bbb3, bf54faf |

## Цель

Схемы элементов получаются из исходников фреймворка, а не пишутся вручную.

## Состав (что реализовано и должно попасть в change)

- Генератор: чтение TS-кода элемента (props, константы, наследование), сборка JSON-схемы зафиксированного формата
- Общая база (shared) через $ref, допустимые дети по коду
- Режимы --all, --check, --bundle (один файл схем + отчёт); сборка в один generate-schema.js

## Мелочи — пункты tasks.md, НЕ отдельные changes

- Литеральные типы констант, Record, брендированные примитивы, Date → date-time

## Где проверять по коду

- `docs/schemas/generator/cli.ts`
- `docs/schemas/generator/type-to-schema.ts`
- `docs/schemas/generator/README.md`
- `docs/schemas/PLAN.md`
- `docs/schemas/examples`
