# PR-11 `canvas-layered-layout`

| Поле                        | Значение                                  |
| --------------------------- | ----------------------------------------- |
| Change id (папка)           | `openspec/changes/canvas-layered-layout/` |
| Capability (подсказка)      | `canvas-layout`                           |
| Номера для commit-сообщения | T-030, T-036, ADR-11, D7, D13, R3         |

## Карточка из плана

- **Состав:** T-030 `graphToFlow`/`flowConnectionToLink`/`flowNodesToLayerOrder`; T-036 `computeLayout`
  (колонка = глубина от Главной по кратчайшему пути, стек по `orderIndex`; D7, D13); общее ядро уровней
  `computeLayerDepths`/`layer-depths.ts`; персистентный `layerDepth` (ADR-11) и «Главная закреплена на уровне 0».
- **Источники:** `54579b7`, `c1f312f`; ADR-11; R3 (измеренные размеры → `computeLayout(graph, measured)`).
- **Критерии:** раскладка детерминирована и не хранит координаты; зазоры колонок считаются по измеренным размерам (без «огромных вертикальных зазоров»).

## Где проверять по коду (grep в репозитории; спека описывает то, что реально есть)

`graphToFlow`, `flowConnectionToLink`, `flowNodesToLayerOrder`, `computeLayout`, `orderIndex`, `computeLayerDepths`, `layer-depths.ts`, `layerDepth`, `computeLayout(graph, measured)`

---

Шаг закрыт, когда выполнено всё из INSTRUCTIONS §6.
