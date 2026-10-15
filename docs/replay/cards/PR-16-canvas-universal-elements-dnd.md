# PR-16 `canvas-universal-elements-dnd`

| Поле                                  | Значение                             |
| ------------------------------------- | ------------------------------------ |
| Режим                                 | **SLICE** (см. INSTRUCTIONS §5)      |
| Размер                                | L (2 сессии: CODE, затем DOCS+CLOSE) |
| Реальные коммиты в `legacy/pre-graft` | —                                    |

## Карточка из плана

- **Состав:** ADR-17 — единый union `CanvasElement` (List item, Widget card и 12 форм-компонентов), единый список `elements`
  у Главной/подсценария/шага; `AddElement`+`createDefaultElement`: любой элемент в любой блок; `MoveElement` (порядок + смена владельца,
  `layerDepth`) с каскадом N4; общее ядро `layers/` + `LayerPolicy.movableKinds`, `useElementDropZone`, `element-dnd`;
  доводка dnd: варианты Select — `nodrag`, подсказки drop, drag карточки не тащит блок.
- **Источники:** `5b367e7` (N2), `aee4437`, `9377f85`, `412b0e0`, `5bffe11`, `2a57ce3`.
- **Не воспроизводить:** миграцию старых графов (`preprocess` legacy) — в «предстоящем» мире старых графов нет.

---

Готово, только когда выполнено всё из INSTRUCTIONS §7 (Definition of Done).
