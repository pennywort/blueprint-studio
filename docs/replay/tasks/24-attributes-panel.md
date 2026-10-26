# Задача 24 — Schema-driven панель атрибутов

| Поле                         | Значение                                    |
| ---------------------------- | ------------------------------------------- |
| change id                    | `attributes-panel`                          |
| Эпик                         | 002                                         |
| Номера (T-xxx / ADR / D / R) | T-040, T-041, T-067, D4, D10                |
| Реальные коммиты (справка)   | 2cdd042, f1d4e77, 5ab897f, 86e125a, 0c1b419 |

## Цель

Панель атрибутов строится по схеме элемента.

## Состав (что реализовано и должно попасть в change)

- Реестр редакторов attributeType → компонент (текст, список, bool, number, radio, select, варианты, ссылки, иконка)
- Рендер панели по схеме + политике редактора: секции, условная видимость; в панели — только атрибуты схемы и политики
- Изменения через UpdateElementProps, буфер ввода
- Редактор иконок с виртуализацией сетки; инспектор сложной логики (T-067)
- Панель поверх полотна, вёрстка по макету

## Не входит (не описывать)

- T-042 (AttachmentField, DeviceUrlMapEditor) — отложено.

## Где проверять по коду

- `src/presentation/features/attributes/property-editor-registry.tsx`
- `src/presentation/features/attributes/attributes-panel.tsx`
- `src/presentation/features/attributes/attribute-field.tsx`
- `src/presentation/features/attributes/icon-property-editor.tsx`
