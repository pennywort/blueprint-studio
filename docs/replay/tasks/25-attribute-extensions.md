# Задача 25 — Надстройки проекта над схемой атрибутов

| Поле                         | Значение                           |
| ---------------------------- | ---------------------------------- |
| change id                    | `attribute-extensions`             |
| Эпик                         | 002                                |
| Номера (T-xxx / ADR / D / R) | R-SCH                              |
| Реальные коммиты (справка)   | 2973d50, 2d9e6f7, 7686784, d05607e |

## Цель

Проект добавляет свои атрибуты элементам, не ломая схему фреймворка.

## Состав (что реализовано и должно попасть в change)

- extensions в схемах проекта: для всех элементов (all) и для одного kind (byKind); значения — в поле ext, не в props
- Общие атрибуты политики (common.attributes)
- Поля chips / multiChips, флаг multiple
- Общий атрибут «Доступность» (множественный выбор); multiple в политике без поддержки — ошибка

## Где проверять по коду

- `src/domain/model/canvas-element.ts`
- `src/infrastructure/element-schemas/project/project-schemas.json`
- `src/infrastructure/element-schemas/editor-policy.json`
- `src/presentation/features/attributes/builtin-property-editors.tsx`
