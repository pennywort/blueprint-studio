# Задача 16 — Горячие клавиши и буфер обмена элементов

| Поле                         | Значение                   |
| ---------------------------- | -------------------------- |
| change id                    | `editor-hotkeys-clipboard` |
| Эпик                         | 002                        |
| Номера (T-xxx / ADR / D / R) | R-HK                       |
| Реальные коммиты (справка)   | d4eb824, 9789233, 1ff5f09  |

## Цель

Все клавиши редактора — одна система с настраиваемыми привязками.

## Состав (что реализовано и должно попасть в change)

- Привязки в формате keybindings.json: умолчания + пользовательские переопределения
- Ctrl+S, Ctrl+Z / Shift+Z, Ctrl+C / X / V; Delete/Backspace/Escape канваса через ту же систему (scope)
- Буфер элементов: вставка копии под новым id через AddElement
- Разбор комбинаций независимо от раскладки (tinykeys)

## Не входит (не описывать)

- Доводка R-HK-1…5 (не выполнена).

## Где проверять по коду

- `src/presentation/features/hotkeys/hotkeys-registry.ts`
- `src/presentation/features/hotkeys/default-keybindings.json`
- `src/presentation/features/hotkeys/hotkey-commands.ts`
- `src/presentation/features/hotkeys/keybindings.ts`
