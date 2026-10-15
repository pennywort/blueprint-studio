# PR-14 `canvas-add-remove-blocks`

| Поле                        | Значение                                     |
| --------------------------- | -------------------------------------------- |
| Change id (папка)           | `openspec/changes/canvas-add-remove-blocks/` |
| Capability (подсказка)      | `canvas-layout`                              |
| Номера для commit-сообщения | T-034, T-033, ADR-15                         |

## Карточка из плана

- **Состав:** T-034 меню добавления узлов/элементов из тулбара, удаление корзиной, каскады; F2 новый блок падает на
  следующий уровень (`layerDepth`, `AddScenario/AddForm` считают колонку); F6 перенос блока между уровнями с подсветкой
  drop-zone (`SetPageLayerDepth`); ADR-15 — один блок на нулевом уровне (инвариант `single-root-level`), блок без связей остаётся
  на своём уровне (`preservePageDepths`); `RemoveForm` чистит `applicationFormId` и связи (S8); тулбар добавляет в выделенный шаг (S10).
- **Источники:** `30fcae6`, `a0c14f8`, `5b367e7` (N3/N5), `cc65a1f`, `5bffe11`, `6e782f4`.
- **Не входит:** автосжатие узлов T-033 — оно позже выключено и удалено, в плане его нет (см. §5).

## Где проверять по коду (grep в репозитории; спека описывает то, что реально есть)

`layerDepth`, `AddScenario/AddForm`, `SetPageLayerDepth`, `single-root-level`, `preservePageDepths`, `RemoveForm`, `applicationFormId`

---

Шаг закрыт, когда выполнено всё из INSTRUCTIONS §6.
