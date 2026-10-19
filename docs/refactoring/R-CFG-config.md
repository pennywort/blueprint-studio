# Правила редактора — данные, а не ветвления (план R-CFG)

> [owner 2026-10-16] Результат аудита `A-CFG-config-audit.md`. Принципы — AGENTS.md §4a
> (policy as data, обратимость, Open/Closed, одно понятие — один механизм, одно правило —
> один источник). Эталон — `domain/layer-capacity.ts`. Дубли сущностей × возможностей —
> в `R-ENT-entities.md`; здесь на них только ссылки.
> Классы: **A** — доменная таблица (TS), **B** — конфиг редактора (JSON + zod, через порт),
> **C** — тема/токены (`editor-theme.ts`), **D** — оставить в коде.

## 1. Сводка

1. «Что умеет вид элемента» (источник логики, участие в связях, место в меню) — ветвления
   `kind === 'selectList' / 'comment'` в 8 + 6 местах. Главный кандидат: **реестр видов** (A).
2. «Что умеет блок» (логика и переходы только в шаге формы) — 6 мест → **возможности контейнеров** (A).
3. «Главная закреплена на уровне 0» — 6 мест → поле `pinned` политики уровней (A).
4. Правила связей (L-I7 «одно правило на цель» — помечено «временно», область логики «шаг»,
   «один переход на источник») — по 2 копии: инвариант + подсветка UI → **таблица связей** (A).
5. Лимиты конституции §4 (radio ≤ 5, вложение — одно) — число в одном месте, но UI их не читает:
   ошибка видна только после команды → **лимиты по видам блоков** в конфиге (B, решение владельца
   2026-10-16): «в шаге формы attachment ≤ 1, в подсценарии ≤ 2» — правка значения.
6. Подписи видов — 3 параллельных словаря; `form-node.tsx` сравнивает заголовок с литералом
   `'Форма заявки'` → единый словарь (A), затем JSON (B).
7. Внешний конфиг (B) — только после шагов 1–7: иначе конфиг ляжет поверх копий логики.
   Нужна передача правил в команды (`CommandBus` → контекст команды) — самый дорогой шаг.

Эффект: смена/отмена правила заказчика = правка одного значения; ~30 ветвлений уходят в таблицы.

## 2. Карта находок

Копий — сколько мест реализуют одно правило. Польза/стоимость: В — высокая, С — средняя, Н — низкая.

| ID  | Область          | Где                                                                                                                                                                                                                                                                                                                            | Что захардкожено                                                                                                                                                   | Копий                                                   | Класс                                                                        | Польза / стоимость                                 |
| --- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------- |
| F01 | Связи / сущности | `domain/connection-rules.ts:87`, `domain/invariants/logic-rules.ts:61`, `commands/enable-complex-logic.ts:21`, `commands/disable-complex-logic.ts:26`, `canvas/use-editor-graph.ts:441`, `canvas/graph-flow-adapter.ts:301`, `attributes/attributes-panel.tsx:129`, `pages/editor/EditorPage.tsx:199`                          | источник «Сложной логики» — только `selectList`                                                                                                                    | 8                                                       | A                                                                            | В / С (8 файлов, механически)                      |
| F02 | Связи / меню     | `domain/connection-rules.ts:95,114`, `canvas/graph-flow-adapter.ts:244`, `toolbar/editor-toolbar.tsx:78`, `canvas/use-editor-graph.ts:65`, `model/canvas-element.ts:105`                                                                                                                                                       | комментарий не участвует в связях и не в меню                                                                                                                      | 6                                                       | A                                                                            | В / Н                                              |
| F03 | Сущности (блоки) | `domain/connection-rules.ts:82`, `domain/step-transitions.ts:27`, `canvas/graph-flow-adapter.ts:261` (`inStep`), `canvas/use-selection.ts:110`, `EditorPage.tsx:199`, `invariants/logic-rules.ts:88`                                                                                                                           | логика и переходы — только у элементов шага формы                                                                                                                  | 6                                                       | A                                                                            | В / С                                              |
| F04 | Связи            | `invariants/logic-rules.ts:99`, `domain/connection-rules.ts:92`; раскладка рассчитывает на ≤1 родителя: `canvas/canvas-layout.ts:102`, `canvas/graph-flow-adapter.ts:363`                                                                                                                                                      | L-I7: у цели ≤ 1 правила видимости («временно, до уточнения с заказчиком»)                                                                                         | 2 + 2                                                   | A                                                                            | В / Н (число); снять лимит >1 — нужна раскладка, С |
| F05 | Связи            | `invariants/logic-rules.ts:88` + `connection-rules.ts:94` (цели = элементы своего шага)                                                                                                                                                                                                                                        | область логики — шаг (L-I5; уже менялась «форма → шаг»)                                                                                                            | 2                                                       | A                                                                            | С / С                                              |
| F06 | Связи            | `invariants/step-transitions.ts:24` + `commands/add-step-transition.ts:28`                                                                                                                                                                                                                                                     | у источника — один переход на шаг                                                                                                                                  | 2                                                       | A                                                                            | Н / Н                                              |
| F07 | Связи / уровни   | `connection-rules.ts:49` (страницы) и `step-transitions.ts:44` (шаги)                                                                                                                                                                                                                                                          | цель связи — «любой следующий уровень»; размещение — «источник + 1»; каскад N4 — рвать несмежные                                                                   | 2 (+ `layer-placement` / `step-placement`, см. R-ENT-3) | A                                                                            | С / С                                              |
| F08 | Уровни           | `domain/graph-walk.ts:63`, `domain/graph-depths.ts:28`, `commands/set-page-layer-depth.ts:36`, `commands/layer-placement.ts:62`, `commands/depth-preservation.ts:22`, `layers/layer-policy.ts:43` (`movableKinds`)                                                                                                             | Главная закреплена на уровне 0 (ADR-15)                                                                                                                            | 6                                                       | A                                                                            | В / С                                              |
| F09 | Уровни           | `layers/layer-policy.ts:20`                                                                                                                                                                                                                                                                                                    | политика уровней в presentation смешивает домен (ёмкость, `movableKinds`) и геометрию                                                                              | 1                                                       | A + C                                                                        | С / Н                                              |
| F10 | Уровни           | `commands/move-element.ts:76`                                                                                                                                                                                                                                                                                                  | смена колонки элемента рвёт все его правила [owner 2026-10-13]                                                                                                     | 1                                                       | A                                                                            | Н / Н                                              |
| F11 | Ограничения      | `model/form-components.ts:10–12`, `invariants/single-attachment-per-form.ts:18` (литерал `> 1`), `invariants/radio-max-five-options.ts:20`                                                                                                                                                                                     | лимиты §4 зашиты на одну область (вложение — «на форму»); меню и панель атрибутов лимитов не знают; `ATTACHMENT_MAX_*` — мёртвый код (файлы редактор не загружает) | 1 + 0 в UI                                              | B (решение владельца 2026-10-16)                                             | В / Н                                              |
| F12 | Ограничения      | `invariants/routing-excludes-dynamic-content.ts:15`, `invariants/scenario-type-fields.ts:11–38`                                                                                                                                                                                                                                | вид → id правила; тип сценария → допустимые поля (4 `if`)                                                                                                          | 1                                                       | A                                                                            | Н / Н                                              |
| F13 | Сущности         | `model/canvas-element.ts:93`, `graph-flow-adapter.ts:255,279`, `canvas/default-elements.ts:41`                                                                                                                                                                                                                                 | семейство вида (страница / форма / комментарий) — функция + литералы                                                                                               | 4                                                       | A                                                                            | С / Н                                              |
| F14 | Сущности         | `canvas/default-elements.ts:47` (`switch` на 12 видов), `:16–19`                                                                                                                                                                                                                                                               | значения нового элемента/узла по умолчанию                                                                                                                         | 1                                                       | B                                                                            | С / С                                              |
| F15 | Меню             | `toolbar/editor-toolbar.tsx:69` (порядок — манифест схем) и `canvas/use-editor-graph.ts:64` (порядок — словарь подписей)                                                                                                                                                                                                       | два списка «что можно добавить» с разным источником порядка                                                                                                        | 2                                                       | A → B                                                                        | С / Н                                              |
| F16 | Меню             | `toolbar/editor-toolbar.tsx:60`, `use-editor-graph.ts:147–171`                                                                                                                                                                                                                                                                 | меню узлов и ветвление по виду узла                                                                                                                                | 2                                                       | A                                                                            | Н / Н                                              |
| F17 | Визуальные       | см. R-ENT-1 (6 механизмов рамки); ещё: рамка элемента 1px (`nodes/element-card.tsx:38`) против 2px у блока и шага                                                                                                                                                                                                              | приоритет и геометрия рамки состояния                                                                                                                              | 6                                                       | C (+ порядок приоритета — константа)                                         | В / С — делает R-ENT-1                             |
| F18 | Визуальные       | `react-flow-theme-styles.ts:21,29` и `nodes/node-styles.ts:61,67` (толщина 2 «как у связи»); handle 12px — `react-flow-theme-styles.ts:55`, `node-styles.ts:48`; радиусы 8/12/16/24 — 10 файлов                                                                                                                                | толщины, размеры handle, радиусы                                                                                                                                   | 2–10                                                    | C                                                                            | С / Н                                              |
| F19 | Раскладка        | `canvas/canvas-edges.tsx:13,29`                                                                                                                                                                                                                                                                                                | радиус рёбер 10, тип пути smoothstep                                                                                                                               | 1                                                       | C                                                                            | Н / Н                                              |
| F20 | Раскладка        | `canvas/canvas-layout.ts:21–85`                                                                                                                                                                                                                                                                                                | ширины, зазоры (уже таблица; 15 правок за октябрь)                                                                                                                 | 1                                                       | C — видимые размеры; D — оценки высот (`elementHeight`, `nodeHeaderHeight`…) | С / С                                              |
| F21 | Меню / dnd       | `canvas/step-dnd.ts:57,80`, `canvas/element-dnd.ts:80`                                                                                                                                                                                                                                                                         | пороги dnd: половина — до/после, средняя треть — обмен                                                                                                             | 2                                                       | D                                                                            | — (меняется редко, внутренняя механика)            |
| F22 | Тексты           | `graph-flow-adapter.ts:182–228` (`ELEMENT_KIND_LABELS`, литералы `'List item'` в `:279`, «Главная», «Шаг N», уровни навигации), `toolbar/editor-toolbar.tsx:61`, `attributes/element-attribute-meta.ts:45`, `nodes/form-node.tsx:296` (сравнение с литералом `'Форма заявки'` при `NEW_FORM_TITLE` в `default-elements.ts:19`) | подписи видов, узлов, шагов                                                                                                                                        | 3 словаря + литералы                                    | A → B                                                                        | С / Н                                              |
| F23 | Тексты           | 7 файлов `domain/invariants/*`                                                                                                                                                                                                                                                                                                 | тексты нарушений внутри проверок                                                                                                                                   | 7                                                       | A (B — позже)                                                                | Н / Н                                              |
| F24 | Тексты / панель  | `attributes/element-attribute-meta.ts:45–233`                                                                                                                                                                                                                                                                                  | мета атрибутов (D4) — TS; `options` повторяют `z.enum` из `form-components.ts`                                                                                     | 1 + дубль enum                                          | B                                                                            | С / С                                              |

**Частота правок** (комментарии `[owner …]` в `src`: 13.10 — 51, 14.10 — 54, 15.10 — 52, 16.10 — 18;
коммиты с 01.10): чаще всего менялись `form-node.tsx` (33), `use-editor-graph.ts` (31),
`editor-canvas.tsx` (26), `graph-flow-adapter.ts` (24), `canvas-layout.ts` (15). Уже отменённые
решения: «List item только на страницах» → любой блок; L-I5 «форма» → «шаг»; L-I7 помечено «временно».
Это первые кандидаты: F01–F05, F13, F22.

## 3. Целевая модель конфигурации

### 3.1. Структура

Две части: **правила** (домен, читают инварианты, команды и UI) и **представление** (только UI).

```ts
// domain/editor-rules.ts — значения по умолчанию = сегодняшнее поведение
EditorRules = {
  elementKinds: Record<CanvasElementKind, {
    family: 'page' | 'form' | 'comment';     // F13; заменяет isPageElementKind/isCommentKind
    connectable: boolean;                    // F02: источник/цель связей
    logicSource: boolean;                    // F01: может включить «Сложную логику»
    logicTarget: boolean;                    // F02: цель правила
  }>;
  containers: Record<'page' | 'formStep', { // F03
    logic: boolean; stepTransitions: boolean;
  }>;
  connections: {
    navigation: { targetLevels: 'following' | 'next'; onMove: 'drop-non-adjacent' };  // F07
    logic: { scope: 'step' | 'form'; maxRulesPerTarget: number };                       // F04, F05
    stepTransitions: { targetLevels: 'following' | 'next'; maxPerSource: number };      // F06, F07
  };
  layers: Record<'pages' | 'formSteps' | 'stepElements', {
    capacity: LayerCapacity;                 // как сейчас (layer-capacity.ts)
    movableKinds?: string[];
    pinned?: Record<string, number>;         // F08: { home: 0 }
    onColumnChange?: 'drop-rules' | 'keep';  // F10
  }>;
  limits: {                                  // F11 — решение владельца 2026-10-16
    // Сколько элементов вида может лежать в блоке данного вида. Нет записи — без ограничения.
    // 'form' — сумма по всем шагам формы; 'formStep' — один шаг; 'home' / 'subScenario' — страница.
    elementCount: Record<'home' | 'subScenario' | 'form' | 'formStep', Partial<Record<CanvasElementKind, number>>>;
    // Сколько вариантов у списка выбора данного вида отображения.
    selectOptions: Partial<Record<'radio' | 'dropdown' | 'list', number>>;
  };
  // По умолчанию = сегодня: elementCount: { form: { attachment: 1 } }, selectOptions: { radio: 5 }.
  // Пример владельца: { formStep: { attachment: 1 }, subScenario: { attachment: 2 } }.
};

// presentation/config/editor-ui.ts — только UI
EditorUi = {
  addMenu: { elements: CanvasElementKind[]; nodes: AddableNodeKind[] };   // F15, F16 (порядок = порядок массива)
  defaults: Record<CanvasElementKind, object>;                            // F14
  labels: { kinds; nodes; stepLabel: 'Шаг {n}'; navigationLevels; violations: Record<ruleId, string> };  // F22, F23
  attributeMeta: Record<CanvasElementKind, ElementAttributeMeta>;          // F24
};
// геометрия и цвета рамок, толщины, радиусы — в editor-theme.ts (C): F17–F20
```

### 3.2. zod-схема (эскиз)

```ts
const KindRulesSchema = z.object({ family: z.enum(['page','form','comment']), connectable: z.boolean(),
  logicSource: z.boolean(), logicTarget: z.boolean() });
const LayerRulesSchema = z.object({ capacity: z.record(z.coerce.number().int().nonnegative(), z.number().int().positive()),
  movableKinds: z.array(z.string()).optional(), pinned: z.record(z.string(), z.number().int().nonnegative()).optional(),
  onColumnChange: z.enum(['drop-rules','keep']).optional() });
export const EditorRulesSchema = z.object({
  version: z.literal(1),
  elementKinds: z.record(z.string(), KindRulesSchema.partial()),   // частичная запись поверх умолчаний
  containers: ..., connections: ..., layers: z.record(z.enum(['pages','formSteps','stepElements']), LayerRulesSchema.partial()),
  limits: z.object({
    elementCount: z.record(z.enum(['home','subScenario','form','formStep']), z.record(z.string(), z.number().int().nonnegative())),
    selectOptions: z.record(z.enum(['radio','dropdown','list']), z.number().int().positive()),
  }).partial(),
}).partial().strict();
```

Проверки сверх типов (`superRefine`): каждый `kind` — из `CanvasElementSchema`; `logicSource` — только у
вида с `options` (сегодня `selectList`); `maxRulesPerTarget > 1` отклоняется, пока раскладка шага
строит дерево с одним родителем (F04); `options` в `attributeMeta` ⊆ значений `z.enum` поля.

### 3.3. Загрузка

- Схема и умолчания — в `domain` (zod уже используется доменом); слияние «умолчания ← конфиг» — чистая функция `resolveEditorRules(raw)`.
- Правит конфиг **администратор редактора или разработчик** (решение владельца 2026-10-16). Поэтому два слоя:
  1. умолчания — `editor-config.json` в репозитории (правит разработчик, попадает в сборку);
  2. настройки администратора — поверх умолчаний, без пересборки: хранятся за портом.
- Порт `application/ports/editor-config-source.ts`: `IEditorConfigSource { loadDefaults(): unknown; loadOverrides(): unknown; saveOverrides(raw: unknown): void }`
  (как `IKeybindingsStorage`). Адаптер сейчас — встроенный JSON + локальное хранилище (как хоткеи); когда
  появится бэкенд — новый адаптер, остальной код не меняется. Без `window` — совместимо с Module Federation.
- Как администратор вносит настройки (импорт JSON-файла или экран настроек) — отдельная задача после R-CFG-9.
- DI: `editorRules` в cradle (`container.ts`), значение — результат `resolveEditorRules(source.load())`.
- Команды: `CommandBus` получает `editorRules` в deps и передаёт `apply(draft, ctx)`; `validateGraph(graph, rules)`.
  Конфиг граф не мутирует — только параметризует проверки и каскады (immer и undo не меняются).
- UI читает правила через хук `useEditorRules()` (контекст из cradle) — те же значения, что у инвариантов.

### 3.4. Невалидный конфиг

- Встроенный файл (часть сборки) — **падает на старте** с понятной ошибкой zod, как манифест схем
  (`manifest-schema-provider.ts:41`): ошибка видна разработчику сразу.
- Настройки администратора проверяются **при сохранении**: невалидные не сохраняются, администратор видит,
  какое поле неверно; остаются прежние настройки. Если сохранённые настройки всё же не прошли проверку при
  старте (например, после обновления редактора) — они игнорируются целиком, работают умолчания, показывается
  уведомление.
- Граф, ставший невалидным при новых правилах (например, лимит radio 5 → 3), не чинится и не
  блокируется: нарушения видны маркерами (`violation-markers.ts`). Откат правила = откат значения.

## 4. Шаги

Порядок: объединение дублей → доменные таблицы → внешний конфиг. Поведение для пользователя
не меняется, если шаг не говорит иное. Один шаг = один коммит `refactor(<область>): R-CFG-N — …`.
Откат любого шага — `git revert <коммит>` (данные графа и формат файла проекта не меняются, кроме R-CFG-9 — там тоже нет).

### R-CFG-1. Реестр видов элементов (A) — F01, F02, F13

✅ 2026-10-16: `domain/element-kinds.ts` — `ELEMENT_KIND_RULES` (family, connectable, logicSource, logicTarget
и `inAddMenu` — до R-CFG-7), `kindRules`, `canBeLogicSource` и тонкие обёртки `isPageElementKind` / `isCommentKind` /
`isFormComponentKind` (перенесены из `model/canvas-element.ts`). Проверки F01, F02, F13 читают таблицу.

- Новый `domain/element-kinds.ts`: таблица `ELEMENT_KIND_RULES` (family, connectable, logicSource, logicTarget)
  и функции `kindRules(kind)`, `canBeLogicSource(element)`.
- Заменить проверки: 8 мест F01, 6 мест F02, `isPageElementKind`/`isCommentKind`/литералы F13 (функции
  оставить тонкими обёртками над таблицей, чтобы diff был меньше).
- **Проверка `npm run ui`:** у Select в шаге есть чип/переключатель «Сложная логика», у других видов нет;
  комментарий не тянет и не принимает связь; меню тулбара и «+» шага без комментария.

### R-CFG-2. Возможности блоков (A) — F03

✅ 2026-10-16: `domain/container-capabilities.ts` — `CONTAINER_CAPABILITIES` (logic, stepTransitions),
`containerCapabilities`, `supportsLogic` / `supportsStepTransitions`. Проверки F03 читают таблицу;
`inFormStep` в `use-selection` заменён производным `logicAvailable`. Доводка [owner 2026-10-16: «включил
для страниц — заработала полноценно»]: команды и переключатель логики, инвариант L-I5 (`containerKey`),
маркеры нарушений читают таблицу; `findFormElement` удалён; на странице у Select'а с логикой —
карточки вариантов (`scenario-node.tsx`). `page.logic: true` включает логику на страницах целиком.

✅ 2026-10-16 (объединение): `container-capabilities.ts` слит в единую матрицу связей
`domain/connection-matrix.ts` — `CONNECTION_MATRIX`: роль источника (`element` / `option` /
`logicOption`) × цель (`page` / `step` / `element`) → виды блоков, из которых связь разрешена.
Возможности блока (`containerCapabilities`, `supportsLogic`, `supportsStepTransitions`) — производные
матрицы. Включить логику на страницах теперь = `logicOption.element: ['page', 'formStep']`.
[owner 2026-10-16]: вариант Select'а со «Сложной логикой» — только внутри своего шага (переходы на
шаг запрещены; при включении логики они удаляются каскадом с подтверждением).

- ~~`domain/container-capabilities.ts`~~ → `domain/connection-matrix.ts` (см. объединение выше).
- Заменить `container.kind === 'formStep'` в 6 местах F03; `inFormStep` в `use-selection` — производное.
- **Проверка:** Select на странице — без логики и переходов; в шаге — с ними.

### R-CFG-3. Правила связей таблицей (A) — F04, F05, F06, F07

- `domain/connection-policy.ts`: `logic.scope`, `logic.maxRulesPerTarget = 1`, `stepTransitions.maxPerSource = 1`,
  `targetLevels: 'following'`. Инварианты (`logic-rules.ts`, `step-transitions.ts`) и `connection-rules.ts`
  читают одно значение. Общая функция «цели следующих уровней» для страниц и шагов.
- `maxRulesPerTarget > 1` не поддерживается раскладкой (F04) — в коде явная проверка с комментарием.
- **Проверка:** элемент, у которого уже есть правило, не подсвечивается целью; второй переход с того же
  варианта заменяет первый; связь на блок «через уровень» по-прежнему ставит цель на «источник + 1».

### R-CFG-4. Политика уровней в домене (A) — F08, F09, F10

- `domain/layer-rules.ts`: `PAGE / FORM_STEP / STEP_ELEMENT` — `capacity` (из `layer-capacity.ts`),
  `movableKinds`, `pinned: { home: 0 }`, `onColumnChange: 'drop-rules'`.
- 6 мест F08 читают `pinned`; `layers/layer-policy.ts` оставляет только геометрию и ссылается на доменную запись.
- Лучше после R-ENT-3 (общее ядро каскада): тогда `pinned` и каскад — параметры одного адаптера.
- **Проверка:** Главная не переносится на другой уровень dnd; перенос подсценария между уровнями,
  несмежные связи рвутся; элемент в другую колонку шага теряет правила.

### R-CFG-5. Лимиты одной таблицей (A) — F11, F12

✅ 2026-10-16, частично: `domain/rule-policy.ts` — `ELEMENT_COUNT_LIMITS` (вид × вид блока × max; вложение —
одно **на шаг формы**, а не на форму, [owner 2026-10-16]) и `RULE_SEVERITY` (`error` — блокирует, `warning` —
только подсветка, `off` — правило выключено) для любого правила по его id. `collectViolations` — все включённые
нарушения для канваса, `validateGraph` — только блокирующие (команды не менялись). Осталось: radio в таблице,
подсказки UI, мёртвые `ATTACHMENT_MAX_*`.

- `domain/limits.ts`: `elementCount` по видам блоков и `selectOptions` (§3.1), значения = сегодняшние.
  Два инварианта (`single-attachment-per-form`, `radio-max-five-options`) заменяются одним общим
  `element-limits`: считает элементы каждого вида в каждом блоке по таблице. Тексты нарушений — с видом
  блока («В шаге формы не больше 1 поля Attachment»). `ATTACHMENT_MAX_*` удалить (файлы не загружаются).
  Таблицы «вид → id правила» и «тип сценария → поля» (F12).
- Перед шагом — правка конституции §4 (п. 1–2: «значения по умолчанию, меняются конфигом») по решению
  владельца 2026-10-16 (стоп-условие AGENTS.md §4: сам агент конституцию не меняет — нужен явный ок).
- Подсказки UI (пункт меню неактивен с подсказкой, если лимит в блоке исчерпан; кнопка «добавить вариант»
  неактивна) — читают ту же таблицу. Это изменение поведения — рекомендую, вопрос 2 ниже.
- **Проверка:** 6 вариантов radio → маркер нарушения как раньше; второе вложение в форме → уведомление как раньше.

### R-CFG-6. Единый словарь подписей (A) — F22, F23 — делать первым (решение владельца 2026-10-16)

✅ 2026-10-16, частично: названия видов элементов и узлов, «Шаг N», уровни навигации — stub
`presentation/labels/editor-labels.ts`. Осталось: тексты нарушений, `NEW_*_TITLE`.

- `presentation/config/labels.ts`: виды, узлы («Главная», «Подсценарий», «Форма заявки»), «Шаг {n}»,
  уровни навигации. `ELEMENT_KIND_LABELS`, литералы `'List item'`, `NODE_MENU_ITEMS`, `HOME_NODE_TITLE`,
  `NEW_*_TITLE` читают его. В `form-node.tsx:296` сравнение — с константой, не с литералом.
- Тексты нарушений — `VIOLATION_MESSAGES[ruleId]` (шаблоны с параметрами) в домене.
- **Проверка:** подписи чипов, меню, шапок узлов, «Шаг N», тексты маркеров нарушений — без изменений.

### R-CFG-7. Одно меню добавления (A) — F15, F16

- `addMenu.elements` — один упорядоченный список (порядок — как в тулбаре сейчас, по манифесту), его читают
  тулбар и «+» шага. Если порядок в «+» шага сейчас другой — **спросить владельца**, какой оставить.
- **Проверка:** состав и порядок пунктов в обоих меню совпадают.

### R-CFG-8. Токены геометрии (C) — F17, F18, F19, F20

- После R-ENT-1. В `editor-theme.ts` — `shape`: `frameWidth`, `edgeWidth`, `edgeRadius`, `handleSize`,
  `radius: { icon: 8, card: 12, node: 16, pill: 24 }`; путь рёбер (`smoothstep`) — поле темы.
- Видимые размеры `canvas-layout.ts` (ширины, зазоры) — в тему; оценки высот остаются в коде (D).
  Рамка элемента 1px против 2px у блока — **вопрос владельцу** перед выравниванием.
- **Проверка:** скриншоты блока, шага, элемента, ребра до/после (`--shot`) совпадают.

### R-CFG-9. Внешний конфиг правил (B) — всё из R-CFG-1…5

- zod-схема и `resolveEditorRules` (§3.2–3.3), порт `IEditorConfigSource`, адаптер с `editor-config.json`,
  `editorRules` в DI, `CommandBus` → `apply(draft, ctx)`, `validateGraph(graph, rules)`, хук `useEditorRules()`.
- Самый дорогой шаг: сигнатура ~25 команд. JSON-файл с умолчаниями = сегодняшние таблицы.
- **Проверка:** без настроек администратора — поведение как раньше; `selectOptions.radio: 3` → 4 варианта дают маркер;
  `elementCount: { subScenario: { attachment: 2 } }` → третье вложение в подсценарии даёт нарушение;
  `logic.maxRulesPerTarget: 0` → старт падает с ошибкой схемы.
- Откат: удалить файл (работают умолчания) или `git revert`.

### R-CFG-10. Мета атрибутов, умолчания и подписи в JSON (B) — F14, F22, F24

- `infrastructure/element-schemas/element-meta.json` (рядом с манифестом, D4), `element-defaults.json`
  (каждое значение проверяется `CanvasElementSchema` при старте), `labels.json`.
- **Проверка:** панель атрибутов каждого вида, новый элемент каждого вида — как раньше.

### R-CFG-11. Единый реестр правил и ошибок (A → B) — [owner 2026-10-19]

- Каждое правило карты — одна запись: `id`, где проверяется (scope), параметры, строгость
  (`error` / `warning` / `off`), шаблон сообщения. Её читают проверка графа, подсветка на канвасе и
  подсказки UI. Сейчас это размазано: `rule-policy.ts` (строгость), `layer-capacity.ts`,
  `ELEMENT_COUNT_LIMITS`, тексты — внутри файлов `domain/invariants/*`.
- Новое правило/смена текста/отключение — правка записи, без `if` в коде; потом — внешний конфиг (R-CFG-9).
- Сюда же — решение В5 из `R-SCH-element-schemas.md` (отклонять ли правку на уже невалидной карте).
- **Проверка:** все нынешние нарушения показываются с теми же текстами; `off` у правила — маркера нет.

## 5. Решения владельца (2026-10-16)

- Лимиты (вложения, варианты списка и т. п.) — в конфиге, **по видам блоков** (шаг формы, подсценарий, …);
  пример: в шаге формы attachment ≤ 1, в подсценарии ≤ 2. Конституция §4 становится «значениями по умолчанию».
- Конфиг правит **администратор редактора или разработчик**: умолчания в репозитории + настройки администратора
  поверх них, без пересборки (§3.3).
- Лимиты — «сомнительные и легко отключаемые»: снять лимит = удалить запись в конфиге, изменить = поменять
  число; ни ядро, ни инварианты при этом не правятся.
- Подписи видов — **один источник**. Формат пока не ясен, поэтому сначала единый stub-словарь
  (R-CFG-6, делать первым шагом, раньше R-CFG-1): все места читают его, формат сменится в одном месте.
- Байтовых лимитов нет: редактор строит карту и не загружает файлы. `ATTACHMENT_MAX_*` удаляются (R-CFG-5).
- Конституция §4: лимиты п. 1–2 помечены как значения по умолчанию (правка 2026-10-16, «делай как считаешь нужным»).
- В проекте хранится **номер версии правил**; проверка — текущими правилами, нарушения — маркерами.
- Подсказки UI по лимитам — **включать** (пункт меню неактивен, если лимит в блоке исчерпан).

## 6. Открытые вопросы

1. Вложение на странице сейчас не считается вообще (инвариант смотрит только формы) — с таблицей по видам
   блоков это решается записью `home` / `subScenario`; по умолчанию оставить без ограничения?
