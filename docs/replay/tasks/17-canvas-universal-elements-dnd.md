# Задача 17 — Универсальные элементы и drag-and-drop

| Поле                         | Значение                                    |
| ---------------------------- | ------------------------------------------- |
| change id                    | `canvas-universal-elements-dnd`             |
| Эпик                         | 002                                         |
| Номера (T-xxx / ADR / D / R) | ADR-16, ADR-17                              |
| Реальные коммиты (справка)   | 9377f85, aee4437, 29b0a6e, 8bce664, 0e6c087 |

## Цель

Любой элемент можно добавить и перенести в любой блок.

## Состав (что реализовано и должно попасть в change)

- Единый список elements у Главной, подсценария и шага (ADR-17)
- AddElement + createDefaultElement; MoveElement (порядок, смена владельца, layerDepth) с каскадом разрыва несмежных связей
- Общее ядро dnd: layers/, LayerPolicy, useElementDropZone; индикатор вставки — полоса с точками (DropBar)
- Превью нативного dnd в масштабе канваса

## Мелочи — пункты tasks.md, НЕ отдельные changes

- Варианты Select — nodrag; drag карточки не тащит блок; панель атрибутов не открывается во время dnd

## Где проверять по коду

- `src/presentation/features/canvas/element-dnd.ts`
- `src/presentation/features/canvas/layers/layer-policy.ts`
- `src/presentation/features/canvas/nodes/use-element-drop-zone.tsx`
- `src/application/commands/move-element.ts`
- `src/presentation/features/canvas/drag-preview.ts`
