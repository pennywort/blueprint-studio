# Задача 02 — UI-кит редактора: MUI v4 и таблица иконок

| Поле                         | Значение                  |
| ---------------------------- | ------------------------- |
| change id                    | `ui-kit-mui-v4`           |
| Эпик                         | 001                       |
| Номера (T-xxx / ADR / D / R) | T-003                     |
| Реальные коммиты (справка)   | 3feb1ce, c108a86, 428811e |

## Цель

Единый UI-кит редактора и единая точка выбора иконок.

## Состав (что реализовано и должно попасть в change)

- UI-кит — MUI v4 (@material-ui/core 4.12.4, icons 4.11.3); domain и application не импортируют UI (eslint)
- Полифилл findDOMNode для React 19 (MUI v4 его вызывает), transformImport иконок в rsbuild
- Таблица иконок editorIcons: роль → иконка, с локальным переопределением

## Не входит (не описывать)

- Шимы @blueprint-vendor/flamingo — удалены решением владельца 2026-10-22, в спеке не описывать. Переход на Flamingo — отложен.

## Где проверять по коду

- `vendor/react-dom-find-dom-node`
- `src/presentation/icons/editor-icons.ts`
- `rsbuild.config.ts`
- `docs/temporary-registry.md`
