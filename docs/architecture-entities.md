# Сущности канваса × возможности (карта техдолга)

> [owner 2026-10-15] Принцип — AGENTS.md §4a: сущность = данные (zod + union по `kind`),
> возможность = чистая функция/хук, различия — параметры. Наследования нет.
> ✅ — общее ядро; ❌ — параллельные механизмы (кандидат на объединение по решению владельца).

Сущности: **блок** (Главная, подсценарий, форма заявки — `PageEntry` в `domain/graph-walk.ts`),
**шаг формы** (живёт только в форме; связи — только внутри своей формы),
**элемент** (карточка в блоке или шаге — `ElementContainer` в `domain/element-containers.ts`).

| Возможность           | Блок                                                      | Шаг формы                                          | Элемент                                         | Статус                                                            |
| --------------------- | --------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------- |
| Уровни (колонки)      | `domain/graph-depths.ts`                                  | `domain/form-step-depths.ts`                       | `domain/step-element-depths.ts`                 | ✅ ядро `domain/layer-depths.ts`                                  |
| Допустимые цели связи | `domain/connection-rules.ts`                              | то же (scope — своя форма)                         | то же (scope — свой шаг)                        | ✅                                                                |
| Контейнер элементов   | `walkElementContainers`                                   | то же                                              | —                                               | ✅                                                                |
| Каскад размещения     | `commands/layer-placement.ts`                             | `commands/step-placement.ts`                       | —                                               | ❌ «те же правила» дважды                                         |
| Перенос / порядок     | `commands/reorder-in-layer.ts`, `set-page-layer-depth.ts` | `commands/move-form-step.ts`, `swap-form-steps.ts` | `commands/move-element.ts`                      | ❌                                                                |
| DnD                   | react-flow (узлы)                                         | HTML5, `canvas/step-dnd.ts`                        | HTML5, `canvas/element-dnd.ts`                  | ❌                                                                |
| Выделение             | `selectedNodeId`                                          | `selectedStepId`                                   | `selectedElementId` (`canvas/use-selection.ts`) | ❌ три id вместо `{kind, id}`                                     |
| Рамка состояния       | `.react-flow__node.selected` (theme), `dropTarget`        | `stepSelected`, `dropTarget`                       | `cardSelected`, `cardInvalid`                   | ❌ + цель связи — `outline` handle (`react-flow-theme-styles.ts`) |

Целевое состояние для ❌: одно ядро с параметром-различием (scope / рёбра); для рамки —
одно значение `'connect-target' | 'drop-target' | 'selected' | 'invalid' | null`
с приоритетом в этом порядке и одной геометрией.

---

# План объединения (рефакторинг R-ENT) [owner 2026-10-15: отложен, делать по запросу]

## Как запустить в новой сессии

Скажи агенту одну из фраз:

- «Сделай шаг R-ENT-1 из `docs/architecture-entities.md`» — один шаг;
- «Сделай R-ENT-1 и R-ENT-2 из `docs/architecture-entities.md`» — несколько по порядку.

Агенту: прочитай ТОЛЬКО этот файл и файлы, перечисленные в шаге; PROJECT_STATE — через
`npm run state:summary`. Один шаг = одна ветка работы = один коммит
`refactor(canvas): R-ENT-N — …`. После шага: `npm run ui` по сценариям шага, коммит, merge (§7),
в таблице выше поменять ❌ на ✅, в ответе — что сделано и какие сценарии проверены.

## Общие условия для всех шагов

- **Поведение для пользователя НЕ меняется** (кроме R-ENT-1, где исчезает двойная рамка).
  Нашёл расхождение старого поведения блоков и шагов — не выбирай сам, спроси владельца.
- Тесты не пишем и не запускаем (AGENTS.md §4) — проверка только `npm run ui`.
- Мутации — только командами `CommandBus`; слои `domain → application → presentation`;
  цвета — из темы; target-handles в покое невидимы (ADR-14); комментарии — по-русски со ссылкой
  на R-ENT-N и исходные решения (N4, D7, ADR-15, S10, F7…).
- Публичные имена команд (`ReorderInLayer`, `MoveFormStep`, …) и их аргументы можно
  оставить — объединяется ядро под ними, а не API для UI. Так diff меньше.
- Шаги независимы, рекомендуемый порядок — по возрастанию риска: 1 → 2 → 3 → 4. Шаг 5 — только
  после отдельного решения владельца.

---

## R-ENT-1. Рамка состояния — одно значение с приоритетом (риск низкий, ~30 мин)

**Сейчас (6 механизмов, рисуют рамку независимо):**

- выделение блока — `react-flow-theme-styles.ts`, правило
  `.react-flow__node.selected [data-testid^="canvas-node-"]…` (inset 2px `canvas.edge`);
- ошибка блока — `nodes/node-styles.ts` `invalid` (inset 2px `error.main`), подключается в
  `scenario-node.tsx` и `form-node.tsx` (`violations ? nodeClasses.invalid`);
- цель dnd блока/шага — `nodes/node-styles.ts` `dropTarget` (фон + `outline` `nodeHoverBorder`),
  в `scenario-node.tsx`, `form-node.tsx` (блок и `swapTarget` шага);
- выделение шага — `form-node.tsx` `stepSelected` (inset 2px);
- выделение / ошибка элемента — `element-card.tsx` `cardSelected` (border + inset 1px),
  `cardInvalid` (border);
- цель связи — `react-flow-theme-styles.ts`, `.editor-target-available:hover` (`outline`
  на прозрачном target-handle, `outlineOffset: -3` — заплатка, совмещённая с рамкой выделения).

**Цель:**

1. Тип `EntityFrame = 'connect-target' | 'drop-target' | 'selected' | 'invalid' | null` и чистая
   функция `resolveEntityFrame({ selected, invalid, dropTarget })` — новый файл
   `presentation/features/canvas/nodes/entity-frame.ts`. Приоритет: drop-target > selected > invalid.
2. Блок, шаг и карточка элемента ставят ровно один атрибут `data-frame={frame ?? undefined}`
   на тот же DOM-узел, где сейчас висят классы рамок. Классы `invalid`, `dropTarget`,
   `stepSelected`, `cardSelected`, `cardInvalid` и правило `.react-flow__node.selected …`
   удаляются (фон `nodeHoverBackground` у dropTarget сохранить — это не рамка).
3. Стили всех рамок — в одном месте, `react-flow-theme-styles.ts`: одна геометрия
   `inset 0 0 0 2px <цвет>` (у блока — вместе с `theme.shadows[1]`), меняется только цвет:
   `selected` → `canvas.edge`, `invalid` → `error.main`, `drop-target` → `nodeHoverBorder`,
   `connect-target` → `canvas.edgeActive`.
4. Цель связи — наивысший приоритет: в React состояния «курсор над целью» нет, поэтому
   CSS: `[data-frame]:has(> .react-flow__handle.editor-target-available:hover)` и
   `:not([data-frame]):has(> …:hover)` → та же геометрия цветом `edgeActive`. С handle
   убрать `outline`/`outlineOffset` (полая окружность `::after` остаётся).
   Handle — прямой потомок узла с рамкой во всех трёх местах (проверить: `scenario-node.tsx`,
   `form-node.tsx` блок и шаг, `element-card.tsx` — внутри `Card`).
5. Шаг формы не даёт рамку блоку: правило `:not(:has([data-step-selected]))` сохранить
   через `data-frame` (у формы с выделенным шагом `selected` не ставится).

**Проверка `npm run ui`:** выделить блок / шаг / элемент → у каждого ровно один
`[data-frame="selected"]`; блок с нарушением → `data-frame="invalid"`, при выделении →
`selected`; потянуть связь на выделенный блок → одна рамка (скриншот
`--shot .agent-logs/frame.png@[data-testid=canvas-node-…]`).

---

## R-ENT-2. Выделение — одно значение `{kind, id}` (риск низкий, ~30 мин)

**Сейчас:** `canvas/use-selection.ts` — три `useState`: `selectedNodeId`, `selectedStepId`,
`selectedElementId`, и правила их взаимного сброса раскиданы по `selectNode`/`selectElement`/
`clearSelection`/`forgetNode` (например, `clearSelection` не сбрасывает `selectedStepId` явно).
Используют: `use-editor-graph.ts` (~30 мест), `use-canvas-nodes.ts`, `canvas-interaction.tsx`,
`editor-canvas.tsx`, `use-canvas-search.ts`, `nodes/element-card.tsx`, `nodes/form-node.tsx`,
`nodes/form-step-layers.tsx`.

**Цель:** одно состояние
`Selection = { kind: 'node'; id } | { kind: 'step'; formId; id } | { kind: 'element'; id } | null`.
`selectedNodeId/StepId/ElementId` остаются как ПРОИЗВОДНЫЕ селекторы (у шага `selectedNodeId` =
`formId` — как сейчас: тулбар добавляет элементы в выделенный шаг, Delete удаляет шаг),
поэтому потребители почти не меняются. Взаимоисключение — по построению типа.

**Проверка `npm run ui`:** клик по блоку → элементу → шагу → пустому полю: всегда выделено
не больше одного; Delete на элементе удаляет элемент, на шаге — шаг, не форму; тулбар
добавляет элемент в выделенный шаг; поиск (`use-canvas-search`) выделяет найденное.

---

## R-ENT-3. Каскад размещения по уровням — одно ядро (риск средний, ~1,5 ч)

**Сейчас (код почти построчно одинаков):**

| Блоки — `commands/layer-placement.ts`     | Шаги — `commands/step-placement.ts`                    |
| ----------------------------------------- | ------------------------------------------------------ |
| `removeNonAdjacentLinks` (рёбра `links`)  | `removeNonAdjacentStepTransitions` (`stepTransitions`) |
| `placeLinkTargetIntoNextLayer`            | `placeStepTransitionTarget` → `placeFormStepIntoLayer` |
| глубины `computeGraphDepths`              | `computeAllFormStepDepths`                             |
| закрепление `preservePageDepths`          | `preserveFormStepDepths` (`depth-preservation.ts`)     |
| порядок — общий `orderIndex` всех страниц | порядок — позиция в массиве `form.steps`               |

**Различия, которые станут параметрами** (адаптер слоя):
`edges` (список рёбер в draft + чтение/запись), `sourceOf(edge)` (владелец источника),
`targetOf(edge)`, `computeDepths(draft)`, `preserveDepths(...)`, `setDepth(id, depth)`
(у Главной — запрещено, ADR-15), `ordering` — получить колонку в порядке и переставить
по якорю (`moveByAnchor` из `domain/ordered-move.ts`; для страниц — перенумерация `orderIndex`
0..n-1, для шагов — массив `form.steps`).

**Цель:** `application/commands/layered-placement.ts` с
`removeNonAdjacentEdges(adapter, draft, affects)` и
`placeIntoLayer(adapter, draft, id, depth, depthsBefore, anchor?)`; адаптеры
`pageLayer` и `formStepLayer`. Старые функции оставить тонкими обёртками (их зовут ~15 команд:
`connect-elements`, `reconnect-elements`, `set-page-layer-depth`, `move-element`,
`move-form-step`, `swap-form-steps`, `add-step-transition`, `remove-*`…), удалить
по желанию следующим шагом.

**Осторожно:** у страниц есть ветка «та же колонка — не перекидывать в конец», у шагов —
«якорь задан — ставить по якорю». Сохранить обе ветки как есть.

**Проверка `npm run ui`** (до и после — одинаковый результат, сравни
`--eval` порядка/уровней узлов): связь элемента на блок через колонку → цель встаёт на
«источник + 1» в конец колонки; связь в тот же слой не двигает цель; перенос блока dnd на
другой уровень → несмежные связи рвутся, остальные блоки не прыгают (ADR-15); то же для шагов:
переход шаг → шаг, перенос шага на другой уровень.

---

## R-ENT-4. Перенос и порядок — одно ядро (риск средний, ~1,5 ч)

**Сейчас:** блоки — две команды, UI зовёт их раздельно (`use-editor-graph.ts`:
`ReorderInLayer` ~стр. 128, `SetPageLayerDepth` ~стр. 174); шаги — одна `MoveFormStep`
(уровень + якорь сразу, ~стр. 305) и `SwapFormSteps` (~стр. 320); элементы — `MoveElement`
(~стр. 354, своя логика контейнеров). Валидация (`validateGraph` →
`InvariantViolationError`) скопирована в каждую.

**Цель:** на ядре R-ENT-3 — одна функция `moveInLayers(adapter, draft, id, { depth?, anchor? })`;
`ReorderInLayer`, `SetPageLayerDepth`, `MoveFormStep` становятся тонкими командами над ней.
`SwapFormSteps` и `MoveElement` — оставить (своя семантика), только перевести на общие
хелперы, если это уменьшает код. Нужен ли блокам обмен местами, как у шагов, — вопрос
владельцу, сам не добавляй.

**Проверка `npm run ui`:** dnd блока внутри колонки (до/после соседа), на другую колонку,
на колонку с якорем; dnd шага внутри уровня, на другой уровень, на середину шага (обмен);
Ctrl+Z после каждого — откат одним шагом.

---

## R-ENT-5. DnD — общий адаптер (риск высокий; только по решению владельца)

**Сейчас:** блоки — dnd react-flow (`onNodeDrag*` в `editor-canvas.tsx`, подсветка колонки
`layers/layer-drop-highlight.tsx`); шаги — HTML5 (`canvas/step-dnd.ts`, `form-step-layers.tsx`);
элементы — HTML5 (`canvas/element-dnd.ts`, `nodes/use-element-drop-zone.tsx`).
react-flow не умеет вложенный dnd внутри узла, поэтому полностью свести к одному механизму
нельзя. Возможный объём — общий расчёт «куда упадёт» (колонка + якорь) для всех трёх,
источники событий остаются разными. Перед стартом — согласовать с владельцем.

---

# Известная проблема: dnd в пустое место колонки шага формы [owner 2026-10-15: отложено]

**Как устроено.** Рядов в модели нет: шаг хранит только порядок элементов и колонку
(`layerDepth`). Экран строится из порядка: элемент встаёт в последний ряд, если его
колонки там свободны, иначе — в новый ряд ниже (`layers/layer-bands.ts`). Поэтому
порядок на экране всегда равен порядку в списке. Дерево Select'а (варианты + зависимые
элементы правее) занимает свои ряды целиком — правее него внутри этих рядов пусто.

**Проблема.** Место вставки при dnd задаёт карточка-якорь в колонке (до/после неё).
Если бросить элемент в пустое место колонки (например, справа вверху, над деревом
Select'а), якоря нет — элемент уходит в конец списка, то есть вниз шага.
Поставить элемент в правую колонку выше Select'а сейчас нельзя.

**Как решить (когда скажет владелец).** Определять место по высоте броска: найти ряд под
курсором и вставить элемент в список перед первым элементом следующего ряда.

**История.** Раньше укладка была first-fit (элемент «запрыгивал» в верхний свободный ряд),
и полоса-индикатор обещала место, куда элемент не вставал. Исправлено 2026-10-15:
укладка сохраняет порядок; полоса «после Select'а» рисуется под всем его деревом.
