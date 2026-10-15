# PR-25 `canvas-architecture-refactor`

| Поле                                  | Значение                        |
| ------------------------------------- | ------------------------------- |
| Режим                                 | **SLICE** (см. INSTRUCTIONS §5) |
| Размер                                | S (1 сессия: CODE+DOCS+CLOSE)   |
| Реальные коммиты в `legacy/pre-graft` | —                               |

## Карточка из плана

- **Состав:** R3 — разрез `use-editor-graph` на `editor-store`, `use-selection`, `use-connection`, `use-canvas-search`,
  `use-canvas-nodes`; `ReorderInLayer` с якорем; R4 — единый обход страниц (`graph-walk`), `PageEntry` с дискриминатором и id только
  через `to*Id`, `findFormElement`, общий `useElementDropZone` + `node-styles`, «текущий drag» модулем вместо id в MIME.
- **Источники:** `d562b14`, `0de81eb`, `8676750`, `b607c70`, `a5a1b14`.
- **Замечание:** если PR 12–24 строятся срезом из финала, большая часть этой структуры уже есть. Тогда PR-25 уменьшается до
  «обоснование разбиения + документы» — либо вообще сливается с PR-24. Решение за тобой.

---

Готово, только когда выполнено всё из INSTRUCTIONS §7 (Definition of Done).
