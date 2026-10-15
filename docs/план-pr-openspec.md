# План PR для SDD + OpenSpec: «как будто всё ещё предстоит сделать»

> Дата анализа: 2026-10-15. Источники: `PROJECT_STATE.md` (§4.1 DONE, §9 CHANGELOG, ADR-01…18),
> `docs/декомпозиция-canvas-редактор.md` (T-001…T-053, D1–D13), `docs/дизайн-сложная-логика.md`
> (T-060…T-068, L1–L8), `specs/000-constitution.md`, `specs/001-foundation/spec.md`,
> `docs/ревью-архитектуры-2026-10-13.md` (R1–R4), git-история (90 коммитов, см. §1).
> Код не менялся. Тесты в проекте отключены (`*.disabled`) по решению владельца — в плане их нет.

---

## 1. Находки по истории (важно для плана)

1. **В ветке видно только 73 коммита, и самый ранний (`30fcae6`, 2026-10-10) — корневой, с полным деревом.**
   Репозиторий shallow (`git rev-parse --is-shallow-repository` = true).
2. **Но ранняя история существует в базе объектов**: цепочка из 17 коммитов `af8ba3e → … → c1f312f`
   (2026-10-09…10) не является предком `HEAD`, однако читается (`git log c1f312f`). Это реальные
   «ранние коммиты»: foundation, шимы Flamingo, тема, каркас, адаптер, команды, узлы, layout.
   Сейчас на них нет ни одной ветки/тега → **сборщик мусора может их удалить**. Сохрани:
   `git branch legacy/pre-graft c1f312f` (и `git bundle create legacy.bundle legacy/pre-graft`),
   а в исходном клоне сделай `git fetch --unshallow`.
3. Реальный порядок работ = порядок задач в `PROJECT_STATE §9`. Многие коммиты — «доводка» (fix/revert/refactor)
   к уже существующим фичам. По твоей идее они **сворачиваются внутрь крупной задачи**, а не становятся PR.
4. Часть кода — «мёртвая» в финале и в PR воспроизводиться **не должна**: сжатие узлов T-033
   (добавлено, затем выключено флагом и удалено в R4-A13), `8c942a5` + его revert `eae152f`,
   legacy `complexLogic`, миграция старых графов (listItems/widgetCards/components → `elements`, ADR-17),
   `*.test.ts.disabled`. Подробно — в §5.

---

## 2. Как построить историю «с ранних коммитов»

Идея: эталон — текущий `HEAD` (тег `final`). Новый репозиторий растёт PR за PR, и после последнего PR
дерево обязано совпасть с эталоном.

### Шаги

1. **Подготовка.** Теги: `final` на текущем `HEAD`; `legacy/pre-graft` на `c1f312f` (см. §1.2).
2. **Base-коммит нового репо (не PR или PR-00):** `.gitignore`, `README`, `LICENSE`, `openspec init`
   (`openspec/project.md` ← перенос `specs/000-constitution.md`: глоссарий, слои, инварианты, стек,
   Definition of Done). Конституция — «проектный» документ OpenSpec, а не change.
3. **Каждый PR = ветка `change/<id>` от `main`** + одна папка `openspec/changes/<id>/`
   (`proposal.md`, `design.md`, `tasks.md`, `specs/<capability>/spec.md` с ADDED/MODIFIED-требованиями).
   После merge — `openspec archive <id>`, чтобы `openspec/specs/` накапливал актуальные capability.
4. **Содержимое PR берётся «срезом из финала», а не воспроизведением хроники:**
   `git checkout final -- <пути PR>`, затем убрать «вперёд-ссылки» (стабы вместо будущих фич — см. «Стабы»
   в карточках), прогнать `npm run verify` + `npm run rules` (в каждом PR сборка и lint зелёные).
   Для PR 01–10 лучше брать реальные коммиты из `legacy/pre-graft` (`git cherry-pick`/`checkout <hash> -- paths`),
   они действительно маленькие и ближе к «ранним». Для поздних — срез из финала.
5. **Принцип «финальная модель сразу».** Ранние PR сразу используют итоговые структуры
   (единый `CanvasElement`/`elements` из ADR-17, `layerDepth`, `StepTransition` вводится в своём PR).
   Так исчезают миграции и переписывания, которых в «предстоящем» мире нет.
6. **Контроль.** После последнего PR: `git diff final main --stat` пуст (кроме осознанных исключений:
   `PROJECT_STATE.md`, `docs/`, `openspec/`). В середине — `git diff final -- <paths PR>` показывает только
   то, что ещё не влито.
7. **Даты и авторство.** Можно сохранить реальные даты (`GIT_AUTHOR_DATE`/`GIT_COMMITTER_DATE` из `git log`
   и `§9 CHANGELOG`) и автора, но не выдумывать даты, которых не было; это честнее и проходит ревью.
8. **Теги релизов по эпикам:** `v0.1.0` после PR-06 (Foundation), `v0.2.0` после PR-27 (Canvas).
9. **Merge-стратегия:** squash merge (1 PR = 1 коммит в `main`, conventional по-русски, как требует commitlint),
   либо merge-commit, если хочется видеть внутри PR отдельные «доводки».
10. **Что оставить на конец, не размазывая по PR:** `PROJECT_STATE.md` (журнал), `CLAUDE.md/QWEN.md/AGENTS.md`,
    `.claude/*`, `scripts/agent/*` (PR-29, опционально раньше как PR-00b).
11. **Решение владельца:** тесты. В реальной истории до 2026-10-12 было 162 теста; сейчас они `.disabled`.
    Для «правдоподобных» PR 03–10 их можно вернуть (в PR с доменом/командами). Политика AGENTS.md §4 запрещает —
    решать тебе; в плане тестов нет.

### Шаблон набора документов на PR (минимум)

| Файл                   | Что в нём                                                                        |
| ---------------------- | -------------------------------------------------------------------------------- |
| `proposal.md`          | Зачем (Why), что меняется (What), что не входит (Non-goals), влияние             |
| `design.md`            | Решения и альтернативы (ADR из карточки), модель, диаграмма потоков/слоёв        |
| `tasks.md`             | Чек-лист из строки «Состав» карточки (T-xxx → подпункты)                         |
| `specs/<cap>/spec.md`  | `ADDED/MODIFIED Requirements` + `#### Scenario` (Given/When/Then) из «Критериев» |
| (опц.) `acceptance.md` | Ручной сценарий проверки в UI (в проекте верификация = lint+build+ручная)        |

Предлагаемые capability для `openspec/specs/`: `service-graph-model`, `invariants`, `element-schemas`,
`command-bus`, `editor-shell`, `editor-theme`, `canvas-layout`, `canvas-nodes`, `canvas-links`,
`canvas-selection`, `canvas-dnd`, `form-steps`, `complex-logic`, `attributes-panel`, `violations`,
`search`, `persistence`, `canvas-performance`, `comment-elements`.

---

## 3. Сводная таблица PR (порядок слияния)

| PR  | Change id                           | Эпик | Крупная задача                                               | Зависит от |
| --- | ----------------------------------- | ---- | ------------------------------------------------------------ | ---------- |
| 01  | `bootstrap-project-tooling`         | 001  | Каркас приложения и инженерные гейты                         | base       |
| 02  | `ui-kit-flamingo-shims`             | 001  | Временная подмена UI-кита (TEMPORARY)                        | 01         |
| 03  | `domain-service-graph-model`        | 001  | Доменная модель ServiceGraph                                 | 01         |
| 04  | `domain-invariants`                 | 001  | Доменные инварианты и `validateGraph`                        | 03         |
| 05  | `element-schema-port-manifest`      | 001  | Порты и манифест схем элементов                              | 03         |
| 06  | `command-bus-di-container`          | 001  | CommandBus (Immer-патчи) и DI-контейнер                      | 03, 05     |
| 07  | `editor-theme-system`               | 002  | Тема редактора и стилизация react-flow                       | 02         |
| 08  | `editor-page-shell`                 | 002  | Каркас страницы редактора, уведомления, пустое состояние     | 07         |
| 09  | `page-graph-model`                  | 002  | Страницы как верхнеуровневые сущности и связи                | 03         |
| 10  | `canvas-commands`                   | 002  | Команды редактирования графа                                 | 06, 09     |
| 11  | `canvas-layered-layout`             | 002  | Адаптер graph↔flow и слоистая раскладка                      | 09, 10     |
| 12  | `canvas-nodes-and-elements`         | 002  | Кастомные узлы Главная/Подсценарий/Форма и карточки          | 11, 08     |
| 13  | `canvas-links-and-connection-rules` | 002  | **Связи между блоками, элементами и слоями**                 | 12         |
| 14  | `canvas-add-remove-blocks`          | 002  | Добавление/удаление блоков и уровни (layerDepth)             | 13         |
| 15  | `canvas-selection-deletion`         | 002  | Единое выделение и удаление                                  | 13         |
| 16  | `canvas-universal-elements-dnd`     | 002  | Универсальные элементы и drag-and-drop                       | 14, 15     |
| 17  | `complex-logic`                     | 002  | «Сложная логика»: условная видимость                         | 16         |
| 18  | `form-steps-layout`                 | 002  | Шаги формы заявки как слоистый граф                          | 17         |
| 19  | `form-step-transitions`             | 002  | Переходы между шагами и ветвление                            | 18         |
| 20  | `attributes-panel`                  | 002  | Schema-driven панель атрибутов + инспектор логики            | 17, 05     |
| 21  | `violation-highlighting`            | 002  | Подсветка нарушений инвариантов                              | 04, 20     |
| 22  | `canvas-search`                     | 002  | Поиск по канвасу                                             | 16         |
| 23  | `graph-persistence-projects`        | 002  | Сохранение в IndexedDB, список проектов, «На согласование»   | 21         |
| 24  | `canvas-performance-stress`         | 002  | Стенд производительности и оптимизация канваса               | 19, 23     |
| 25  | `canvas-architecture-refactor`      | 002  | Разрез состояния редактора, чистка долга по ревью            | 24         |
| 26  | `comment-elements`                  | 002  | Комментарии разработчику (элемент и часть элемента)          | 25         |
| 27  | `epic-002-hardening`                | 002  | Сквозная приёмка эпика (опционально, если остались «хвосты») | 26         |
| 28  | `dev-agent-tooling`                 | —    | Инфраструктура агентов и журнал состояния                    | любое      |

PR-27 — резерв: если после срезов окажется, что какие-то «доводки» не вошли ни в одну карточку, они собираются тут.
PR-28 можно двигать на любую позицию (его нет в `src/`).

---

## 4. Карточки PR

Формат: **Цель → Состав → Реальные коммиты-источники → Ключевые пути → Критерии → Стабы/Не входит.**

### PR-01 `bootstrap-project-tooling` (Epic 001)

- **Цель:** запускаемый каркас приложения и гейты качества, нарушить которые нельзя закоммитить.
- **Состав:** T-001/T-002 foundation: Rsbuild 2.2 + React 19 + TS strict, `createHashRouter` (ADR-08), 3 роута-заглушки
  (`/`, `/editor`, `/preview`), динамический import в `index.tsx` (MF-гигиена, конституция §7), ESLint flat +
  `eslint-plugin-boundaries` (4 слоя, ADR-10), Prettier, Husky, commitlint, lint-staged, точные версии (`.npmrc`).
- **Источники:** `af8ba3e` (часть), `3529985`; спека `specs/001-foundation` §2 п.1–2, §4 п.1, 5.
- **Пути:** `package.json`, `rsbuild.config.ts`, `tsconfig.json`, `eslint.config.js`, `.husky/`, `commitlint.config.js`,
  `src/index.tsx`, `src/bootstrap.tsx`, `src/presentation/app/App.tsx`.
- **Критерии:** `npm run dev` показывает 3 роута; `lint`+`build` зелёные; демо-импорт React в `domain` ловится линтером.
- **Не входит:** Module Federation (не настроен до сих пор — §4.2 NOT DONE).

### PR-02 `ui-kit-flamingo-shims` (Epic 001, TEMPORARY)

- **Цель:** UI только из `@blueprint-vendor/*`, пока недоступен внутренний registry.
- **Состав:** шимы `vendor/flamingo/*` (реэкспорты MUI v4 4.12.4), polyfill `findDOMNode` для React 19,
  `legacy-peer-deps`, smoke-страница (Typography, шрифты BPSans), запрет `@material-ui/*` в `src`, реестр подмен
  `docs/temporary-registry.md`.
- **Источники:** `3feb1ce`, `4ff54c3`; T-003 smoke (Flamingo).
- **Пути:** `vendor/`, `package.json`, `.npmrc`, `docs/temporary-registry.md`.
- **Критерии:** страница рендерит Flamingo-компонент со стилями; `grep @material-ui src` пуст.
- **Замечание:** шимы дополняются реэкспортами и дальше — по мере нужд PR-08, 20 (добавляй недостающее в тот PR, где понадобилось).

### PR-03 `domain-service-graph-model` (Epic 001)

- **Цель:** вся предметная модель как Zod-схемы, независимая от React.
- **Состав:** T-005: 12 компонентов формы (discriminated union по `kind`), `ServiceGraph`, Scenario/SubScenario,
  FormStep/ApplicationForm, branded ID, константы (`ATTACHMENT_MAX_FILE_BYTES=3 МБ`, `…TOTAL=50 МБ`, `RADIO_MAX_OPTIONS=5`);
  T-010 (FormStep содержит components — устранение расхождения typecheck).
- **Источники:** `af8ba3e` (domain/model); `specs/001-foundation/spec.md` §5; `docs/business-requirements.md` §7–8.
- **Пути:** `src/domain/model/*`.
- **Критерии:** `tsc` strict зелёный; в `domain` нет react/zod-запрещённого по ADR-10 (zod разрешён только в model — следуй конституции §3).
- **Модель сразу финальная:** единый `CanvasElement` (ADR-17) вводится в PR-16, но ID-типы и `PageEntityId` — здесь.

### PR-04 `domain-invariants` (Epic 001)

- **Состав:** T-006: #1 одно вложение на форму, #2 Radio ≤ 5, #3–5 маршрутизация vs динамический контент,
  `scenario-type-fields`, `validateGraph(graph) → InvariantViolation[]` (`{rule, path, message}`). Инварианты 6–7 — deferred, 8 — dropped.
- **Источники:** `af8ba3e`; конституция §4; PROJECT_STATE §5.
- **Пути:** `src/domain/invariants/*`.
- **Критерии:** каждое правило конституции §4 имеет чистую функцию; `validateGraph` агрегирует.
- **Не входит:** `single-root-level` (PR-14), `logic-rules` (PR-17), `step-transitions` (PR-19) — добавляются своими PR.

### PR-05 `element-schema-port-manifest` (Epic 001)

- **Состав:** T-007: порты `IElementSchemaProvider`/`IIdGenerator`/`IClock`, `ManifestSchemaProvider` (JSON-манифест из
  12 записей, Zod-валидация на старте, `SchemaNotFoundError`), `UuidIdGenerator`, `SystemClock` (ADR-07, D3).
- **Пути:** `src/application/ports/*`, `src/infrastructure/element-schemas/element-manifest.json`, `src/infrastructure/misc/*`.
- **Критерии:** сломанный манифест → понятная ошибка при старте; граница application→infrastructure только через порты.

### PR-06 `command-bus-di-container` (Epic 001)

- **Состав:** T-008 `CommandBus` (execute/undo/redo через `produceWithPatches`, ADR-05), `AddFormComponent`, ошибки команд;
  T-009 Awilix `InjectionMode.PROXY`, composition root `buildContainer()` в `bootstrap.tsx` (ADR-04).
- **Критерии:** undo возвращает состояние `toEqual` исходному, redo повторяет; единственный механизм мутации — патчи Immer.
- **Тег:** `v0.1.0` (закрытие Epic 001).

### PR-07 `editor-theme-system` (Epic 002, E1)

- **Состав:** T-010/T-011: объект темы по механике MUI v4 (palette, overrides, `EditorThemeProvider`, `useEditorTheme`,
  токены `theme.editor.canvas`), стилизация react-flow (background, controls, minimap) только токенами (D6), запрет hex в компонентах.
  Установка `@xyflow/react` 12.12.0 (ADR-03).
- **Источники:** `cd920b6`, `b2dfd1e`; D6.
- **Пути:** `src/presentation/theme/*`, `react-flow-theme-styles.ts`.
- **Критерии:** цвета только из темы; `npm run rules` не находит hex.
- **Потом внутри этого PR сворачиваются:** добавления токенов (рамка выделения, цвет ошибки, стрелка) — они вводятся тут сразу итоговыми.

### PR-08 `editor-page-shell` (Epic 002, E2)

- **Состав:** T-020 TopBar (поиск-поле, «Сохранить», «Предпросмотр», «На согласование»), T-021 левый тулбар (4 кнопки),
  T-022 компоновка EditorPage (панель атрибутов скрыта без выделения), T-023 уведомления (`EditorNotificationsProvider`,
  `useEditorNotifications`, единый Snackbar), T-024 пустое состояние канваса.
- **Источники:** `d8c312e`, `41de58e`; макеты `docs/design-mockups/*`.
- **Стабы:** поиск, сохранение и «На согласование» — заглушки (реализации в PR-22/23); кнопки без действий.
- **Критерии:** страница `/editor` собирается по макету; «Сохранить» → snackbar «Сохранено» (заглушка).

### PR-09 `page-graph-model` (Epic 002)

- **Состав:** T-004 (эпик 002): страницы (Главная, подсценарии, формы) — верхнеуровневые сущности ServiceGraph (D13),
  персистентный `orderIndex` (в т.ч. у `ApplicationForm`), `PageLink {sourceElementId → targetId}`, координат нет (D2),
  `PageEntityId`.
- **Источники:** `a3deb1a`, `54579b7` (часть про `ApplicationForm.orderIndex`).
- **Пути:** `src/domain/model/{scenario,page-link,service-graph}.ts`, `graph-walk.ts`.

### PR-10 `canvas-commands` (Epic 002, E3)

- **Состав:** T-035: команды `Add/RemoveScenario`, `Add/RemoveForm`, `Add/RemoveFormStep`, `Add/RemoveElement`,
  `UpdateElementProps`, `Connect/Disconnect/ReconnectElements`, `ReorderInLayer`, `graph-lookup.ts`, каскады связей при удалении.
  Политика: UI не мутирует состояние, всё — через CommandBus.
- **Источники:** `54579b7`.
- **Критерии:** каждая команда обратима (undo/redo); удаление узла рвёт входящие/исходящие связи.

### PR-11 `canvas-layered-layout` (Epic 002, E3)

- **Состав:** T-030 `graphToFlow`/`flowConnectionToLink`/`flowNodesToLayerOrder`; T-036 `computeLayout`
  (колонка = глубина от Главной по кратчайшему пути, стек по `orderIndex`; D7, D13); общее ядро уровней
  `computeLayerDepths`/`layer-depths.ts`; персистентный `layerDepth` (ADR-11) и «Главная закреплена на уровне 0».
- **Источники:** `54579b7`, `c1f312f`; ADR-11; R3 (измеренные размеры → `computeLayout(graph, measured)`).
- **Критерии:** раскладка детерминирована и не хранит координаты; зазоры колонок считаются по измеренным размерам (без «огромных вертикальных зазоров»).

### PR-12 `canvas-nodes-and-elements` (Epic 002, E3)

- **Состав:** T-031 кастомные узлы (Home/SubScenario/Form), карточки элементов (`element-card`), `node-types`, `node-styles`,
  `EditorCanvas` + контролы (зум-границы, undo/redo группой слева), демо-граф.
- **Источники:** `c1f312f`; позже: `2d11634` (одна рамка нарушения), `10b58f2` (точки входа на линии рамки),
  `65fc534` (рамка выделения внутри сущности).
- **Стабы:** связей и dnd пока нет; элементы статичны.
- **Критерии:** граф отображается слоями по макету; мин. зум 10%.

### PR-13 `canvas-links-and-connection-rules` (Epic 002, E3) — «Связи между блоками, элементами и слоями»

- **Цель:** пользователь связывает элемент одного уровня с блоком следующего; правила допустимости — единые и доменные.
- **Состав:** T-032 (создание связи протягиванием и кликом, reconnect, удаление, smoothstep-рёбра со стрелкой);
  R1 — единое правило `connectableTargets` (`domain/connection-rules.ts`, ADR-14): навигация → блоки следующих уровней;
  «Сложная логика» → элементы того же шага. ADR-13: связь только между смежными уровнями, перенос → каскадный разрыв
  (`removeNonAdjacentLinks`). ADR-14: target-handles в покое невидимы и не ловят мышь, появляются только при протягивании и
  только у допустимых целей (полые окружности, цвет подсветки под курсором). Drop/клик — по всей сущности (блок без коннекторов тоже).
  Запрет дублей связей.
- **Источники:** `c1f312f`, `a0c14f8` (F4), `8ca9bf9` (R1), `ff008e4`, `37a9147`, `40bd3a7`, `dfcf4aa`, `576f11e`,
  `e47f925`, `4d6a56f` (N9). **Не воспроизводить:** `8c942a5` + revert `eae152f`.
- **Пути:** `src/domain/connection-rules.ts`, `use-connection.ts`, `connect-elements.ts`, `reconnect-elements.ts`,
  `disconnect-elements.ts`, `graph-flow-adapter.ts`.
- **Критерии:** недопустимые цели не подсвечиваются; связь на не-смежный уровень невозможна/рвётся; стрелка читаемая, handle удобный.
- **Мелочи внутри PR:** ширина стрелки, нулевой уровень без target-handle, `nodeDragThreshold`, прицел на всём полотне,
  отмена клик-связи (TEMPORARY №7).

### PR-14 `canvas-add-remove-blocks` (Epic 002, E3)

- **Состав:** T-034 меню добавления узлов/элементов из тулбара, удаление корзиной, каскады; F2 новый блок падает на
  следующий уровень (`layerDepth`, `AddScenario/AddForm` считают колонку); F6 перенос блока между уровнями с подсветкой
  drop-zone (`SetPageLayerDepth`); ADR-15 — один блок на нулевом уровне (инвариант `single-root-level`), блок без связей остаётся
  на своём уровне (`preservePageDepths`); `RemoveForm` чистит `applicationFormId` и связи (S8); тулбар добавляет в выделенный шаг (S10).
- **Источники:** `30fcae6`, `a0c14f8`, `5b367e7` (N3/N5), `cc65a1f`, `5bffe11`, `6e782f4`.
- **Не входит:** автосжатие узлов T-033 — оно позже выключено и удалено, в плане его нет (см. §5).

### PR-15 `canvas-selection-deletion` (Epic 002, E3)

- **Состав:** ADR-12: единый клик = выделение (рамка цвета стрелок), Delete/Backspace = удаление для узлов, элементов, связей;
  взаимоисключающее выделение (связь, блок, шаг, элемент не выделяются вместе); защита от зацикливания `onSelectionChange`;
  снятие выделения по `onPaneClick`; клик по коннектору/кнопке выделяет; z-index рёбер над узлами; рамка внутри сущности.
- **Источники:** `a0c14f8` (F5), `5b367e7`, `a63f207` (N6–N12), `6e782f4`, `40bd3a7`, `2846939`, `65fc534`.
- **Критерии:** после выделения элемента блок не «мигает»; удаление выделенной связи отменяется undo.

### PR-16 `canvas-universal-elements-dnd` (Epic 002, E3)

- **Состав:** ADR-17 — единый union `CanvasElement` (List item, Widget card и 12 форм-компонентов), единый список `elements`
  у Главной/подсценария/шага; `AddElement`+`createDefaultElement`: любой элемент в любой блок; `MoveElement` (порядок + смена владельца,
  `layerDepth`) с каскадом N4; общее ядро `layers/` + `LayerPolicy.movableKinds`, `useElementDropZone`, `element-dnd`;
  доводка dnd: варианты Select — `nodrag`, подсказки drop, drag карточки не тащит блок.
- **Источники:** `5b367e7` (N2), `aee4437`, `9377f85`, `412b0e0`, `5bffe11`, `2a57ce3`.
- **Не воспроизводить:** миграцию старых графов (`preprocess` legacy) — в «предстоящем» мире старых графов нет.

### PR-17 `complex-logic` (Epic 002, T-037/T-060…T-068)

- **Цель:** условная видимость элементов («если вариант Select = X, показать цели»).
- **Состав:** `LogicRule`/`LogicCondition` (T-060), флаг `hasComplexLogic` (T-061), `evaluateVisibility` с каскадом (T-062),
  инварианты L-I1…L-I6 (+L-I7 «одно правило на цель» — временно выключено, TEMPORARY) (T-063), команды
  `Enable/DisableComplexLogic`, `Add/RemoveLogicRule` + каскад удаления (T-064), проекция в пунктирные рёбра логики и
  option-handles (T-065/T-066), бейдж «Скрыт в предпросмотре». Рёбра логики — прямой горизонталью, стиль как у навигационных (решение N1).
- **Источники:** `7e7ecee`, `a0c14f8` (F7/F8), `029d9d2`, `eb05cdd` (примеры логики в форме заявок);
  `docs/дизайн-сложная-логика.md`.
- **Критерии:** правило нельзя создать на недопустимую цель (ADR-14); отключение логики каскадно удаляет правила.
- **Не входит:** инспектор логики (T-067) — в PR-20.

### PR-18 `form-steps-layout` (Epic 002)

- **Состав:** ADR-16 — шаг формы раскладывается колонками по правилам «Сложной логики» (цель напротив варианта-источника,
  варианты Select карточками `option-card`), `step-element-depths`, `form-step-layers`, шаг растёт по горизонтали;
  `AddFormStep` («+ Добавить шаг», D1), `RemoveFormStep` (рвёт связи, сохраняет уровни), dnd по колонкам шага; расширение шага на время drag;
  выделение формы и шага клик-ом (S10).
- **Источники:** `5b367e7` (N3), `2a57ce3`, `853ec4c`, `029d9d2`, `5bffe11`.
- **Пути:** `src/domain/step-element-depths.ts`, `nodes/form-node.tsx`, `nodes/form-step-layers.tsx`, `nodes/option-card.tsx`.

### PR-19 `form-step-transitions` (Epic 002)

- **Состав:** сущность `StepTransition` (от элемента шага или варианта Select'а → на более поздний шаг той же формы, один переход
  у источника), `Add/RemoveStepTransition`, инвариант, каскады; цель встаёт сразу за источником; переходы назад рвутся;
  `MoveFormStep` (dnd шагов за заголовок), общая перестановка `moveByAnchor` для страниц и шагов;
  ADR-18 — шаги по уровням (`form-step-depths`, `FormStep.layerDepth`), ветвление шагов друг под другом, `formStepLabel`.
- **Источники:** `90b6fdc`, `194aebc`, `6ac3950`, `a5a1b14`, `de44405`, `cfe25f2`.
- **Критерии:** несмежные переходы рвутся (N4); цель — на уровне «источник + 1».

### PR-20 `attributes-panel` (Epic 002, E4)

- **Состав:** T-040 `PropertyEditorRegistry` (text, stringList, bool, number, radio, select, optionList, linkList),
  T-041 рендерер панели по схеме `IElementSchemaProvider` + мета D4 (секции «Тип»/«Настройки», условная видимость, «Комментарий для разработчика»),
  stub-схемы List item/Widget card (`page-element-manifest.json`), буфер ввода 300 мс, T-067 инспектор сложной логики. Правая панель — только для элементов (D10).
- **Источники:** `2cdd042`, `6926e8c`, `f1d4e77`; `docs/пример-схемы-элемента.json`.
- **Не входит:** T-042 (IconPicker, AttachmentField, DeviceUrlMapEditor) и полные схемы List item/Widget card/FAQ — отложено владельцем до появления схем.

### PR-21 `violation-highlighting` (Epic 002)

- **Состав:** T-043: `validateGraph` после каждой команды → `mapViolationsToCanvas` (path → узел/элемент), рамка цвета ошибки,
  бейдж с тултипом (`violation-markers.ts`, `violation-badge.tsx`); одна рамка вместо двух.
- **Источники:** `dacf61f`, `2d11634`.
- **Открытый вопрос (не решать в PR):** команды сейчас жёстко отклоняют нарушения, подсветка видна только для внешних графов.

### PR-22 `canvas-search` (Epic 002, E5)

- **Состав:** T-050 / D5: поиск в TopBar по узлам и элементам, выделение + `fitView`/`setCenter`, авто-раскрытие сжатых узлов/шагов
  (без сжатия — выделяет и раскрывает шаг).
- **Источники:** `a6937ad` (часть).

### PR-23 `graph-persistence-projects` (Epic 002, E5)

- **Состав:** T-053 порт `IGraphRepository` + `IndexedDbGraphRepository` (Zod при чтении), загрузка при открытии (`CommandBus.reset`),
  «Сохранить» → snackbar по результату; F1 главная `/` — разводящая со списком проектов («Демо-карта»); T-052 «На согласование»
  disabled с тултипом до Epic 004; миграция записей хранилища.
- **Источники:** `a6937ad`, `a0c14f8` (F1), `8676750` (миграция записи).
- **Не входит:** серверное хранилище; `/preview` (T-051 — отдельная большая задача, отложена владельцем).

### PR-24 `canvas-performance-stress` (Epic 002)

- **Состав:** стенд «Стенд производительности» — проект на главной (`/#/editor?project=stress`, параметры графа в query); R2:
  структурное разделение `graphToFlow`, батч измерений за кадр, стор `canvas-interaction` + контекст действий, `memo` узлов/карточек,
  Box → div в узлах.
- **Источники:** `5443aa0`, `54f70c0`, `1e27190` (сразу в итоговой форме — «проект на главной», без второго приложения `stress.html`).
- **Критерии:** измеримое время загрузки и отклика на стенде (цифры — в `docs/ревью-архитектуры-2026-10-13.md`).

### PR-25 `canvas-architecture-refactor` (Epic 002)

- **Состав:** R3 — разрез `use-editor-graph` на `editor-store`, `use-selection`, `use-connection`, `use-canvas-search`,
  `use-canvas-nodes`; `ReorderInLayer` с якорем; R4 — единый обход страниц (`graph-walk`), `PageEntry` с дискриминатором и id только
  через `to*Id`, `findFormElement`, общий `useElementDropZone` + `node-styles`, «текущий drag» модулем вместо id в MIME.
- **Источники:** `d562b14`, `0de81eb`, `8676750`, `b607c70`, `a5a1b14`.
- **Замечание:** если PR 12–24 строятся срезом из финала, большая часть этой структуры уже есть. Тогда PR-25 уменьшается до
  «обоснование разбиения + документы» — либо вообще сливается с PR-24. Решение за тобой.

### PR-26 `comment-elements` (Epic 002)

- **Состав:** комментарий-элемент (адресат «Разработчику») из третьей кнопки тулбара в любой блок; поле `comment` элемента показывается
  голубым блоком под карточкой («комментарий-часть»); комментарий вне связей и сложной логики; подложка с прямыми верхними краями;
  схема и мета в панели атрибутов.
- **Источники:** `c1492e4`, `53cd88b`, `ff81554`.

### PR-27 `epic-002-hardening` (опционально)

- Сборщик «хвостов»: что после срезов не попало ни в один PR. Заполняется по результату `git diff final main`.

### PR-28 `dev-agent-tooling` (вне эпиков)

- **Состав:** `AGENTS.md`, `CLAUDE.md`, `QWEN.md`, `.claude/{agents,commands,settings.json}`, `scripts/agent/*` (`verify`, `rules`, `ui`,
  `lint-file`, `stop-check`, `sync-agents`), `scripts/project-state.mjs`, `PROJECT_STATE.md`.
- **Источники:** `df5914e`, `1148aff`, `071b2c4`, `299df76`, `606ae99`, `651fc5f`.
- **Почему отдельно:** это инструментарий, не продукт; нет влияния на `src/`.

---

## 5. Что НЕ воспроизводить (мёртвый груз истории)

| Что                                                                  | Почему                                                                                                       |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Автосжатие узлов T-033 (порог 6 + «раскрыть»)                        | выключено флагом `ELEMENTS_COLLAPSE_ENABLED=false` и удалено в `b607c70` (R4-A13); вопрос к заказчику открыт |
| `8c942a5` «видимый соединяемый handle шага формы» и `eae152f` revert | откат; противоречит ADR-14                                                                                   |
| Legacy `complexLogic` на элементах                                   | удалён в `a0c14f8` (F8)                                                                                      |
| Миграция `listItems/widgetCards/components → elements`               | ADR-17: в новой истории модель сразу единая                                                                  |
| Второе приложение `stress.html`/`src/stress-demo`                    | заменено проектом на главной (`1e27190`)                                                                     |
| `*.test.ts(x).disabled`, `*.fixture.ts.disabled`, `vitest.*`         | политика AGENTS.md §4 (решение владельца — см. §2 п.11)                                                      |
| `KIMI.md`, `.kimi/`, `docs/archive/`                                 | архив; читать запрещено правилами репо                                                                       |
| Промпты сессий `docs/промпт-сессии-S*.md`                            | исторические, в OpenSpec не нужны (источник для design.md, но не файлы)                                      |

## 6. Мелкие правки → в какую крупную задачу сворачиваются

| «Мелочь» из истории                                                    | PR       |
| ---------------------------------------------------------------------- | -------- |
| Стрелка на конце, ширина стрелки, угол между стрелками                 | 13       |
| Handle удобного размера, подсветка цели под курсором, полые окружности | 13       |
| Точки входа рёбер на линии рамки, ребро правила до карточки            | 12/13    |
| Мин. зум 10%, без дёрганья при dnd                                     | 12/16    |
| Рамка выделения внутри сущности, одна рамка нарушения                  | 12/15/21 |
| Флеер выделения, зацикливание `onSelectionChange`                      | 15       |
| z-index рёбер над узлами                                               | 15       |
| Огромный зазор при переносе в колонку                                  | 11       |
| Рёбра логики прямой горизонталью, высота шага по дереву строк          | 17/18    |
| Редакторы вариантов Select и ссылок                                    | 20       |
| Прыжок блока на уровень 0 при удалении связи                           | 14       |
| Новый элемент шага — в следующую колонку                               | 18       |

## 7. Что осталось «не сделано» (в плане PR нет)

Из `PROJECT_STATE §4.2/§7`: Module Federation и контракт микрофронтенда; effector/patronum (состояние графа пока в `useState`);
T-042 + наполнение схем List item/Widget card/FAQ; `/preview` (T-051); серверное хранилище; Epic 003 (undo/redo UI, tree view, clipboard,
роли), Epic 004 (XState workflow, versioning, экспорт), Epic 005 (генератор `MicroAppDescriptor`). Это следующие change после PR-27.

Открытые вопросы к владельцу для переноса в `design.md` как «Open Questions»: §6 PROJECT_STATE (12 пунктов, в т.ч. L-I7, сжатие T-033,
политика валидации T-043, финальная палитра темы).

## 8. Рекомендуемая последовательность работ с агентом на один PR

1. `git switch -c change/<id> main`.
2. Взять срез: `git checkout final -- <пути из карточки>` (или `cherry-pick` из `legacy/pre-graft` для PR 01–12).
3. Убрать вперёд-ссылки на ещё не влитые фичи (стабы), не ослабляя tsconfig/eslint.
4. `npm run verify` и `npm run rules` — зелёные; при UI — `npm run ui -- …`.
5. Другой агент: `openspec/changes/<id>/` по карточке (Цель→proposal, Состав→tasks, ADR→design, Критерии→scenarios).
6. Коммит (conventional, по-русски), push, PR; после merge — `openspec archive <id>`.
7. Раз в 5 PR — сверка `git diff final main --stat`: непокрытое должно сокращаться монотонно.
