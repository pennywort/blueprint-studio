# Задача 23 — Элементы карты по схемам фреймворка и политике редактора

| Поле                         | Значение                           |
| ---------------------------- | ---------------------------------- |
| change id                    | `framework-element-schemas`        |
| Эпик                         | 002                                |
| Номера (T-xxx / ADR / D / R) | R-SCH, ADR-07                      |
| Реальные коммиты (справка)   | 76da757, 4ed011b, 7502962, 4a4f3bd |

## Цель

Состав и атрибуты элементов берутся из бандла схем фреймворка, редактор их только сужает.

## Состав (что реализовано и должно попасть в change)

- Импорт бандла (schemas:import / schemas:check) в редактор
- FrameworkSchemaProvider за портом IElementSchemaProvider: сборка «схема + политика редактора» (editor-policy.json только сужает)
- Схемы проекта: компоненты и комментарий; компоненты фреймворка из бандла
- Пометка устаревших элементов, переход infoBlock → alert

## Не входит (не описывать)

- R-SCH-1…9 кроме выполненного; P-SCH.

## Где проверять по коду

- `src/infrastructure/element-schemas/framework-schema-provider.ts`
- `src/infrastructure/element-schemas/assemble-element-schemas.ts`
- `src/infrastructure/element-schemas/editor-policy.json`
- `src/infrastructure/element-schemas/project/project-schemas.json`
- `scripts/schemas-import.mjs`
