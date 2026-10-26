# Задача 08 — Каркас страницы редактора

| Поле                         | Значение                          |
| ---------------------------- | --------------------------------- |
| change id                    | `editor-page-shell`               |
| Эпик                         | 002                               |
| Номера (T-xxx / ADR / D / R) | T-020, T-021, T-022, T-023, T-024 |
| Реальные коммиты (справка)   | d8c312e, 41de58e                  |

## Цель

Страница /editor по макету: шапка, тулбар, канвас, панель атрибутов, уведомления.

## Состав (что реализовано и должно попасть в change)

- T-020 TopBar: поиск, «Сохранить», «Предпросмотр», «На согласование»
- T-021 левый тулбар (кнопки и меню добавления)
- T-022 компоновка страницы (панель атрибутов — только при выделенном элементе, D10)
- T-023 уведомления: единый Snackbar, фасад useEditorNotifications
- T-024 пустое состояние канваса

## Не входит (не описывать)

- Реализации поиска, сохранения, согласования — в своих задачах.

## Где проверять по коду

- `src/presentation/pages/editor/EditorPage.tsx`
- `src/presentation/features/top-bar/editor-top-bar.tsx`
- `src/presentation/features/toolbar/editor-toolbar.tsx`
- `src/presentation/features/notifications`
- `src/presentation/features/canvas/empty-canvas-state.tsx`
