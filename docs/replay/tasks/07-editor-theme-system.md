# Задача 07 — Тема редактора и стилизация react-flow

| Поле                         | Значение                 |
| ---------------------------- | ------------------------ |
| change id                    | `editor-theme-system`    |
| Эпик                         | 002                      |
| Номера (T-xxx / ADR / D / R) | T-010, T-011, ADR-03, D6 |
| Реальные коммиты (справка)   | b2dfd1e, cd920b6         |

## Цель

Все цвета и стили канваса — из одной темы.

## Состав (что реализовано и должно попасть в change)

- Объект темы по механике MUI v4: palette, overrides, токены theme.editor.canvas; EditorThemeProvider, useEditorTheme
- Стилизация react-flow (фон, контролы, миникарта) токенами темы; hex в компонентах запрещён
- Политика подсветки (highlight-policy) — цвета выделения, цели связи, ошибки

## Не входит (не описывать)

- Финальная палитра (открытый вопрос владельца).

## Где проверять по коду

- `src/presentation/theme/editor-theme.ts`
- `src/presentation/theme/editor-theme-provider.tsx`
- `src/presentation/theme/highlight-policy.ts`
- `src/presentation/features/canvas/react-flow-theme-styles.ts`
