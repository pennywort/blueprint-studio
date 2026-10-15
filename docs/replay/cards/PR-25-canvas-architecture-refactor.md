# PR-25 `canvas-architecture-refactor`

| Поле                        | Значение                                         |
| --------------------------- | ------------------------------------------------ |
| Change id (папка)           | `openspec/changes/canvas-architecture-refactor/` |
| Capability (подсказка)      | `canvas-performance`                             |
| Номера для commit-сообщения | R3, R4                                           |

## Карточка из плана

- **Состав:** R3 — разрез `use-editor-graph` на `editor-store`, `use-selection`, `use-connection`, `use-canvas-search`,
  `use-canvas-nodes`; `ReorderInLayer` с якорем; R4 — единый обход страниц (`graph-walk`), `PageEntry` с дискриминатором и id только
  через `to*Id`, `findFormElement`, общий `useElementDropZone` + `node-styles`, «текущий drag» модулем вместо id в MIME.
- **Источники:** `d562b14`, `0de81eb`, `8676750`, `b607c70`, `a5a1b14`.
- **Замечание:** если PR 12–24 строятся срезом из финала, большая часть этой структуры уже есть. Тогда PR-25 уменьшается до
  «обоснование разбиения + документы» — либо вообще сливается с PR-24. Решение за тобой.

## Где проверять по коду (grep в репозитории; спека описывает то, что реально есть)

`use-editor-graph`, `editor-store`, `use-selection`, `use-connection`, `use-canvas-search`, `use-canvas-nodes`, `ReorderInLayer`, `graph-walk`, `PageEntry`, `findFormElement`, `useElementDropZone`, `node-styles`

---

Шаг закрыт, когда выполнено всё из INSTRUCTIONS §6.
