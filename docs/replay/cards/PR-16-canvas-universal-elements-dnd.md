# PR-16 `canvas-universal-elements-dnd`

| Поле                        | Значение                                          |
| --------------------------- | ------------------------------------------------- |
| Change id (папка)           | `openspec/changes/canvas-universal-elements-dnd/` |
| Capability (подсказка)      | `canvas-dnd`                                      |
| Номера для commit-сообщения | ADR-17                                            |

## Карточка из плана

- **Состав:** ADR-17 — единый union `CanvasElement` (List item, Widget card и 12 форм-компонентов), единый список `elements`
  у Главной/подсценария/шага; `AddElement`+`createDefaultElement`: любой элемент в любой блок; `MoveElement` (порядок + смена владельца,
  `layerDepth`) с каскадом N4; общее ядро `layers/` + `LayerPolicy.movableKinds`, `useElementDropZone`, `element-dnd`;
  доводка dnd: варианты Select — `nodrag`, подсказки drop, drag карточки не тащит блок.
- **Источники:** `5b367e7` (N2), `aee4437`, `9377f85`, `412b0e0`, `5bffe11`, `2a57ce3`.
- **Не воспроизводить:** миграцию старых графов (`preprocess` legacy) — в «предстоящем» мире старых графов нет.

## Где проверять по коду (grep в репозитории; спека описывает то, что реально есть)

`CanvasElement`, `AddElement`, `createDefaultElement`, `MoveElement`, `layerDepth`, `layers/`, `LayerPolicy.movableKinds`, `useElementDropZone`, `element-dnd`

---

Шаг закрыт, когда выполнено всё из INSTRUCTIONS §6.
