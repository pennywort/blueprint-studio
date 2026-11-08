# Модули presentation: размер, границы, переиспользование (R-MOD)

> Источник: [ревью 2026-11-08](../ревью-архитектуры-2026-11-08.md). Заменяет раздел
> «Наблюдения» R-ARC (крупные модули, модульное состояние). Строки — на коммит `1309575`.
> Статус: ⏳ ожидает.

## Как запустить

«Сделай шаг R-MOD-N из `docs/refactoring/R-MOD-modules.md`». Порядок работы — в [README](README.md).
Шаги 1–3 — чистое перемещение кода: поведение и публичные имена не меняются, импорты
правятся. Для производительности сверься с `R-PERF-canvas.md`: не ломай мемоизацию и
структурное разделение (`share`).

## Сводка

| Шаг     | Суть                                                                         | Риск    |
| ------- | ---------------------------------------------------------------------------- | ------- |
| R-MOD-1 | Разрезать `graph-flow-adapter.ts` (685) — уходит и цикл с `canvas-layout`    | средний |
| R-MOD-2 | Разрезать `use-editor-graph.ts` (602) на хуки действий                       | средний |
| R-MOD-3 | Разрезать `editor-canvas.tsx` (751) на хуки взаимодействия                   | средний |
| R-MOD-4 | Состояние уровня модуля → экземпляр редактора                                | средний |
| R-MOD-5 | `window`/`document` → корень редактора; `confirm` → диалог                   | средний |
| R-MOD-6 | Границы фич: `index.ts` + eslint, типы — у производителя                     | средний |
| R-MOD-7 | Общие части узлов: `NodeHeader`, `ElementSlot`, `CanvasChip`, масштаб        | средний |
| R-MOD-8 | Разрезать `form-node`, `assemble-element-schemas`, `canvas-layout`, миграцию | низкий  |

Порядок: 1 → 2 → 3 → 7 → 4 → 5 → 6 → 8. До R-MOD-1 полезно сделать R-DOM-3/5: адаптер
худеет, и резать его проще.

**Ориентир размера.** Модуль presentation — одна ответственность, до ~300 строк. Больше — значит, делить.

---

## R-MOD-1. `graph-flow-adapter.ts` (риск средний)

**Ответственности:**

- протокол id handle'ов (`:44-108`);
- типы data узлов (`:109-210`);
- правило `complexLogicToggle` (`:236`, переезжает в R-DOM-3);
- маппинг элемента (`:256`);
- `buildFlow` и кэш форм (`:356-610`);
- структурное разделение `share` (`:610-666`);
- обратное преобразование flow → команды (`:667-685`).

**Цель.** Модули `canvas/flow/`:

- `handle-ids.ts`;
- `flow-types.ts`;
- `graph-to-flow.ts`;
- `structural-share.ts`;
- `flow-to-commands.ts`.

Старый файл реэкспортирует их на время переезда, импорты обновляются в том же шаге.
`canvas-layout.ts:12` берёт `handle-ids`, и цикл с адаптером исчезает.

**Проверка.** Канвас стенда (`?project=stress`) открывается. Связи, выделение и dnd
работают. Профиль перерисовок не хуже (R-PERF).

## R-MOD-2. `use-editor-graph.ts` (риск средний)

**Ответственности:**

- сборка store, selection, connection, search;
- действия с элементами (`:224-356,430`), узлами (`:155-224,371`) и шагами (`:385-430`);
- переключатель логики с `confirm` (`:478`).

**Цель.** `use-element-actions.ts`, `use-node-actions.ts`, `use-step-actions.ts`. Исходный
файл остаётся сборщиком. Повторяющийся `elementTargetOf` уходит в R-CMD-3.

**Проверка.** Добавление, копирование, вырезание, вставка, удаление и перенос элементов,
узлов и шагов. Undo и redo.

## R-MOD-3. `editor-canvas.tsx` (риск средний)

**Ответственности:**

- кэш измеренных размеров (~190);
- синхронизация props со state (~208);
- drag узлов между уровнями (~320-400);
- удаление выделенного (~404);
- связь кликом (~433-500, 684);
- выделение по нажатию (~506);
- подсветка цели связи (~528);
- сборка ReactFlow.

**Цель.** Хуки `use-measured-nodes.ts`, `use-node-layer-drag.ts`, `use-click-connection.ts`
(вместе с `ClickConnectionLine`) и `use-canvas-pointer.ts`. Компонент — только сборка.

**Проверка.** Перенос узлов по уровням, связь кликом и протягиванием, Delete, «Рука», зум.

## R-MOD-4. Состояние уровня модуля (риск средний, ADR-02)

**Факт.**

- `canvas/element-dnd.ts:20`, `canvas/step-dnd.ts:14`: `let currentDrag`;
- `attributes/property-editor-registry.tsx:22`: `Map`, его заполняет побочный эффект импорта
  `builtin-property-editors.tsx:347-355`;
- `canvas/editor-canvas.tsx:723`: `STANDALONE_STORE`;
- `canvas/graph-flow-adapter.ts:554`: `formDataCache`.

Два экземпляра микрофронтенда на странице разделят это состояние между собой.

**Цель.**

- `createDragChannel<P>(mime, validate)`: один механизм вместо двух копий. Экземпляр — в
  контексте редактора. Общий `anchorFromPoint(selector, attr)` вместо `stepAnchorFromPoint`.
- Реестр редакторов свойств создаётся явно и передаётся через контекст.
- Запасной стор — `useState(createCanvasInteractionStore)`.
- Кэш форм — в `useRef` владельца пересчёта.

**Проверка.** Dnd элементов и шагов, панель атрибутов всех видов, повторное открытие редактора.

## R-MOD-5. Глобальные `window`/`document` (риск средний, конституция §7)

**Факт.**

- `canvas/use-selection.ts:28-31`: pointerdown на всём окне и `closest('.react-flow')`;
- `canvas/use-editor-graph.ts:492,505`: `window.confirm`;
- `canvas/drag-preview.ts:48`: `document.body`;
- `canvas/editor-canvas.tsx:690`;
- `canvas/nodes/use-element-drop-zone.tsx:60`.

Образец — `hotkeys/hotkeys-registry.ts:88` (`root.ownerDocument`).

**Цель.**

- Слушатели вешаются на корень редактора или его `ownerDocument`.
- Подтверждение — через MUI `Dialog` с фасадом `useConfirm()` в `features/notifications`.
  Тексты из labels, Esc — через `useDismissLayer`.
- Добавить `confirm(` в `npm run rules` (R-GOV-4).

**Проверка.** Выделение и снятие выделения кликом, превью при dnd, выключение логики с
подтверждением (OK и отмена, Esc).

## R-MOD-6. Границы фич (риск средний)

**Факт.**

- `eslint.config.js:44-49` описывает только слои. У фич нет `index.ts`, 30+ импортов идут
  во внутренние файлы чужих фич.
- Циклы по типам:
  - `canvas/use-editor-graph.ts:36` ↔ `toolbar/editor-toolbar.tsx:11`;
  - `canvas/use-canvas-search.ts:2` → `top-bar` (тип `CanvasSearchResult` объявлен у потребителя).

**Цель.**

- У каждой `features/<f>/` — `index.ts` с публичным API.
- В boundaries — элемент `feature` с правилом «другая фича — только через index».
- Общие типы — у производителя (canvas) или в `features/editor-contracts`.
- Сначала правило — warning, после переезда — error.

**Проверка.** `verify` зелёный. Smoke-тест в UI: главная → редактор → тулбар, поиск, атрибуты.

## R-MOD-7. Общие части узлов (риск средний)

**Факт.**

- Шапка узла: `scenario-node.tsx:102-122` ≈ `form-node.tsx:286-314` (TargetHandle,
  заголовок, подзаголовок, ViolationBadge, корзина).
- Слот элемента: `scenario-node.tsx:126-145` ≈ `form-step-layers.tsx:205-240`.
- Масштаб `offsetW > 0 ? rect / offset : 1` повторён трижды (`scenario-node.tsx:174`,
  `form-node.tsx:215`, `form-step-layers.tsx:153`).
- Три реализации чипа: `span` с классами (`element-card.tsx:~250`), MUI `Chip` + `neutralChip`
  (`form-node.tsx:301`), MUI `Chip` по умолчанию (`option-card.tsx:74`).

**Цель.** `nodes/node-header.tsx`, `nodes/element-slot.tsx`, `nodes/layout-scale.ts`,
`nodes/canvas-chip.tsx`. Чип — один компонент: вариант (`accent | neutral | primary |
comment`) — значение, стиль — из темы (AGENTS.md §4a: одно визуальное состояние — одно значение).

**Проверка.** Вид всех узлов и чипов не изменился (скриншот, кадр по узлу — до и после).

## R-MOD-8. Остальные крупные модули (риск низкий)

- `nodes/form-node.tsx` (532): `use-step-drop.ts` (`locateStepDrop` `:207-257`),
  `form-step-column.tsx`, стили отдельно.
- `infrastructure/element-schemas/assemble-element-schemas.ts` (674): `json-schema-refs.ts`,
  `value-kinds.ts`, `assemble-attribute.ts`, `legacy-kinds.ts` и оркестратор.
- `canvas/canvas-layout.ts` (369): `canvas-metrics.ts` (константы), `node-size-estimates.ts`,
  `canvas-layout.ts`.
- `infrastructure/persistence/graph-record-migration.ts` (426): `migrations/structure.ts`,
  `migrations/elements-to-framework.ts`, `migrations/components-to-framework.ts`. Код
  замороженный — резать, только если правишь.

**Проверка.** Dnd шагов; импорт старых файлов проекта (миграция); панель атрибутов; `npm run schemas:check`.
