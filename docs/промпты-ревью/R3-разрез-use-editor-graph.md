# R3 — разрезать use-editor-graph.ts (после R2) — ✅ ВЫПОЛНЕНО 2026-10-14

Контекст: `docs/ревью-архитектуры-2026-10-13.md` (A3). Файл ~890 строк делает всё:
состояние графа, загрузку/сохранение, выделение, поиск, протягивание связей, маппинг
событий в команды, кэш узлов.

Сделать:

1. Разнести на `editor-store` (граф + CommandBus + undo/redo + save/load),
   `use-selection`, `use-connection`, `use-canvas-search`, `use-canvas-nodes`.
   Публичный интерфейс для `EditorPage` сохранить.
2. Вынести бизнес-логику из presentation в команды:
   - расчёт целевого индекса в `reorderInLayer` → `ReorderInLayer` принимает якорь
     (соседний узел + before/after), как `MoveElement`;
   - уровень нового узла в `addNode` → считает `AddScenario`/`AddForm`.

Поведение не меняется. Проверка: `npm run verify`, `npm run rules`, `npm run ui`
(добавление узлов, перестановка в колонке, выделение, поиск, undo/redo).

Итог: `editor-store.ts` (граф, CommandBus, undo/redo, загрузка/сохранение), `use-selection.ts`,
`use-connection.ts`, `use-canvas-search.ts`, `use-canvas-nodes.ts`; `use-editor-graph.ts` —
композиция и маппинг событий в команды (890 → ~420 строк), интерфейс для `EditorPage` прежний.
`ReorderInLayer` принимает якорь `{ pageId, placement }`; колонку нового узла считают
`AddScenario`/`AddForm` (`nextPageLayerDepth` в graph-lookup), если `layerDepth` не задан.
