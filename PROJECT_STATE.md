# PROJECT STATE — blueprint-studio

<!--
════════════════════════════════════════════════════════════════
SCHEMA RULES (SCHEMA_VERSION: 2)
Этот файл — единственный источник правды о СОСТОЯНИИ проекта для
агентов без доступа к файлам. Правила обновления:

1. Структура секций НЕ меняется: нельзя добавлять, удалять,
   переименовывать или переставлять секции. Нельзя менять шапку
   колонок таблиц.
2. Каждый факт обязан иметь источник: git, package.json, файл в
   репо, или явное сообщение владельца (помечается [owner]).
   Неверифицируемое НЕ пишется в фактические секции — оно идёт в
   §6 OPEN QUESTIONS с пометкой UNKNOWN.
3. Статусы — только из enum'ов, указанных в комментариях к секциям.
4. §8 CHANGELOG — append-only: строки только добавляются в конец,
   никогда не редактируются и не удаляются.
5. При каждом обновлении: бампнуть UPDATED и добавить строку в §8.
6. Краткость обязательна: одна строка = один факт. Детали — в
   полноценных spec/design документах, здесь только состояние.
════════════════════════════════════════════════════════════════
-->

> **SCHEMA_VERSION:** 2
> **UPDATED:** 2026-10-12
> **CURRENT_EPIC:** 002 (Canvas, in-progress)

---

## 1. MISSION

<!-- Что это и зачем. Меняется ТОЛЬКО по явному решению владельца [owner]. -->

Автономный визуальный редактор архитектурных карт (`ServiceBlueprint`) для описания микроприложений на движке lib-app-core. Пользователи: архитекторы и разработчики. Выходной артефакт: версионируемый JSON (`MicroAppDescriptor`, генератор — Epic 005).

**Форма поставки [owner, 2026-10-06]:** микрофронтенд (remote module, Module Federation), встраивается в host-приложение на Rsbuild.

---

## 2. STACK

<!-- status: installed | planned | removed
Версии — ТОЛЬКО из package.json. planned = решение принято, пакет не установлен. -->

| Слой            | Пакет                                                            | Версия                 | Статус                                                                                                  |
| --------------- | ---------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------- |
| Сборка          | @rsbuild/core + @rsbuild/plugin-react                            | 2.2.0                  | installed                                                                                               |
| Микрофронтенд   | Module Federation (Rsbuild MF plugin)                            | —                      | planned [owner 2026-10-06]                                                                              |
| Фреймворк       | react + react-dom                                                | 19.3.0                 | installed                                                                                               |
| Язык            | typescript (strict)                                              | 5.7.3                  | installed                                                                                               |
| UI-кит          | @sber-friend/flamingo-components (core/icons/pickers/animations) | 4.9.17                 | TEMPORARY: недоступен, шимы `file:vendor/flamingo/*` поверх @material-ui/core 4.12.4 [owner 2026-10-09] |
| Подмена UI-кита | @material-ui/core + @material-ui/icons                           | 4.12.4 / 4.11.3        | installed TEMPORARY — удаляются вместе с шимами (KIMI.md §4.1)                                          |
| Состояние       | effector + patronum                                              | —                      | planned                                                                                                 |
| DI              | awilix                                                           | 13.0.5                 | installed, используется (container.ts)                                                                  |
| Валидация       | zod                                                              | 4.6.5                  | installed                                                                                               |
| Патчи/undo      | immer                                                            | 11.1.18                | installed                                                                                               |
| Роутер          | react-router-dom (createHashRouter)                              | 7.18.3                 | installed — под вопросом в микрофронте, см. §6                                                          |
| Тесты           | vitest + @testing-library/react (+ @testing-library/dom, jsdom)  | 5.0.0 / 16.3.3         | installed                                                                                               |
| Canvas          | @xyflow/react                                                    | 12.12.0                | installed [коммит b2dfd1e]                                                                              |
| Workflow        | xstate                                                           | —                      | planned (Epic 004)                                                                                      |
| Линтинг         | eslint (flat) + eslint-plugin-boundaries                         | 9.39.5 / 7.2.0         | installed                                                                                               |
| Форматирование  | prettier + husky + commitlint + lint-staged                      | 3.9.6 / 9.1.7 / 21.2.2 | installed                                                                                               |

---

## 3. ARCHITECTURE DECISIONS

<!-- ADR-lite. status: active | superseded. Новая запись — только из кода/коммита или [owner].
При отмене решения старое НЕ удаляется — статус меняется на superseded, добавляется новая строка. -->

| ID     | Решение                                                                                                                                                                                                                                            | Обоснование                                                               | Статус                                                         |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------- |
| ADR-01 | Rsbuild вместо Vite                                                                                                                                                                                                                                | Требование владельца: скорость, SWC                                       | active                                                         |
| ADR-02 | Микрофронтенд: приложение — remote module (Module Federation), host — на Rsbuild                                                                                                                                                                   | [owner 2026-10-06] Встраивание в существующий host                        | active                                                         |
| ADR-03 | @xyflow/react (react-flow) как canvas-движок                                                                                                                                                                                                       | [owner 2026-10-06]                                                        | active                                                         |
| ADR-04 | Awilix PROXY + деструктуризация в конструкторах                                                                                                                                                                                                    | CLASSIC-режим ломается при минификации в проде                            | active, реализовано в container.ts                             |
| ADR-05 | Immer produceWithPatches — единственный механизм мутации                                                                                                                                                                                           | Применение команды + undo/redo + будущие патч-цепочки версий              | active, реализовано в command-bus.ts                           |
| ADR-06 | Effector в presentation, команды — чистые классы в application                                                                                                                                                                                     | Команды тестируются без React/Effector                                    | active                                                         |
| ADR-07 | JSON-манифест в репо за портом IElementSchemaProvider                                                                                                                                                                                              | Нет доступа к element-schemas из lib-app-core; замена = новый адаптер     | active                                                         |
| ADR-08 | Hash-роутинг (createHashRouter)                                                                                                                                                                                                                    | Любой роут без серверных rewrite                                          | active — пересмотреть в контексте микрофронта (§6)             |
| ADR-09 | Без Vite/Next.js/CRA/Redux/Zustand/декораторов DI                                                                                                                                                                                                  | Осознанный отказ от альтернатив                                           | active                                                         |
| ADR-10 | 4 слоя: domain → application → infrastructure → presentation, enforced eslint-plugin-boundaries; в domain запрещены react/zod/effector/awilix/xstate/@xyflow/@sber-friend                                                                          | Изоляция домена, тестируемость                                            | active                                                         |
| ADR-11 | Колонка узла = уровень навигации: опциональный персистентный `layerDepth` у SubScenario/ApplicationForm переопределяет глубину из связей; новый узел падает на max+1, перенос между уровнями — dnd с подсветкой drop zone, Главная закреплена на 0 | [owner 2026-10-12] Замечания приёмки S11 (F2/F6); осознанное изменение D7 | active, реализовано (set-page-layer-depth.ts, graph-depths.ts) |
| ADR-12 | Единое удаление и выделение всех сущностей (узлы, элементы, связи): клик = выделение (чёрная рамка цвета стрелок), Delete/Backspace = удаление; выделение узла и элемента взаимоисключающи                                                         | [owner 2026-10-12] Замечание приёмки S11 (F5/F7)                          | active, реализовано (use-editor-graph.ts, editor-canvas.tsx)   |

---

## 4. CURRENT STATE

<!-- Только проверенное. DONE = закоммичено и работает. NOT DONE = отсутствует в репо. -->

### 4.1 DONE

- [T-001] Проект инициализирован, точные версии (--save-exact), git; актуальный коммит `af8ba3e`, 36 файлов в src/
- [T-002] Bootstrap: Rsbuild + TS strict, hash-роутер, 3 страницы-заглушки (/, /editor, /preview)
- [T-003] Flamingo smoke test: Typography рендерится со стилями (шрифты SBSans)
- [T-004] ESLint flat + boundaries (4 слоя), Prettier, Husky, commitlint, lint-staged
- [T-005] Доменная модель: Zod-схемы 12 form-компонентов (discriminated union по kind), ServiceGraph, Scenario/SubScenario, FormStep/ApplicationForm (FormStepSchema содержит components), branded IDs. Константы: ATTACHMENT_MAX_FILE_BYTES=3MB, ATTACHMENT_MAX_TOTAL_BYTES=50MB, RADIO_MAX_OPTIONS=5
- [T-006] Инварианты #1, #2 реализованы; #3–5 реализованы (routing-excludes-dynamic-content.ts, 6 тестов, покрывает правила 3/4/5)
- Инвариант scenario-type-fields (spec.md 5.3): реализован, 8 тестов; в таблицу §5 (ТЗ-правила 1-8) не входит
- [T-007] Порты IElementSchemaProvider/IIdGenerator/IClock + адаптер ManifestSchemaProvider (JSON-манифест 12 записей, валидация Zod при старте, SchemaNotFoundError), UuidIdGenerator, SystemClock
- [T-008] Command Bus: command.ts + command-bus.ts (execute/undo/redo через produceWithPatches + enablePatches) + add-form-component.ts + errors.ts; 12 тестов [коммит af8ba3e]
- [T-009] DI Container: infrastructure/container.ts (Awilix PROXY, strict, Cradle: idGenerator/clock/elementSchemaProvider/commandBus; манифест через .inject), buildContainer() подключён в bootstrap.tsx; 3 теста [коммит af8ba3e]
- [T-010] Расхождение FormStepSchema vs step.components устранено: FormStepSchema содержит components [коммит af8ba3e]
- Верификация на локальной машине выполнена: npm install + test + lint + build зелёные; TEMPORARY-подмена Flamingo → шимы поверх MUI v4 (vendor/flamingo/*, findDOMNode-полифилл, legacy-peer-deps) [owner 2026-10-09, коммит 3feb1ce]
- [T-004 эпик 002] Доменная модель страниц и связей: страницы — верхнеуровневые сущности ServiceGraph (homePage?, subScenarios[], applicationForms[]), персистентный orderIndex, PageLink (sourceElementId → targetId), координат нет (D2) [коммит a3deb1a]
- [T-010/T-011 эпик 002] Тема редактора (src/presentation/theme/: createEditorTheme, EditorThemeProvider, useEditorTheme, токены theme.editor.canvas) + стилизация react-flow токенами темы (D6) [коммит cd920b6]
- [T-020/T-021/T-022 эпик 002] Каркас страницы редактора: EditorTopBar (поиск, «Сохранить»/«Предпросмотр»/«На согласование»), EditorToolbar (4 кнопки, меню добавления узлов/элементов, панели-заглушки), компоновка EditorPage [коммит d8c312e]
- [T-023 эпик 002] Уведомления: EditorNotificationsProvider + фасад useEditorNotifications (showSaveSuccess/showSaveError/showCommandFailure), единый Snackbar на страницу; «Сохранить» → snackbar «Сохранено» (заглушка успеха до T-053) [коммит 41de58e]
- [T-024 эпик 002] Пустое состояние канваса: EmptyCanvasState (иллюстрация-пазлы из макета, «Здесь пока пусто», hasNodes — локальный проп до подписки на граф в T-030+) [коммит 41de58e]
- [T-030 эпик 002] Адаптер graph ↔ flow: graphToFlow/flowConnectionToLink/flowNodesToLayerOrder, чистые функции в presentation/features/canvas/graph-flow-adapter.ts, точка интеграции positions для T-036 [коммит 54579b7]
- [T-035 эпик 002] 13 команд canvas поверх CommandBus (Add/RemoveScenario, Add/RemoveForm, Add/RemoveFormStep, Add/RemoveElement, UpdateElementProps, Connect/Disconnect/ReconnectElements, ReorderInLayer) + graph-lookup.ts; каскады связей при удалении; Connect/Reconnect — структурная часть, перенос слоя при перескоке отмечен метками T-036 [коммит 54579b7]
- Домен: ApplicationForm получила обязательный orderIndex (D12/D13, форма в слоях на общих основаниях), добавлен тип PageEntityId [коммит 54579b7]
- 162 unit-теста в репо (31 файл), последний полный прогон зелёный [2026-10-12]; политика [owner]: тесты НИКОГДА не пишем и НИКОГДА не запускаем (ни все, ни точечно), верификация = lint+build + ручная проверка (KIMI.md §7)
- [T-031/T-032/T-036 эпик 002] Кастомные узлы (home/subScenario/form + ElementCard), layout-движок computeLayout (колонка=глубина, стек по orderIndex), связи drag'ом + reconnect + удаление рёбер; демо-граф на канвасе [коммит c1f312f]
- [T-033/T-034 эпик 002] Автосжатие узлов (порог 6, видны 3 + кнопка раскрытия), добавление узлов/элементов из тулбара, удаление узлов/шагов корзиной, каскады связей [коммит 30fcae6]
- [T-037 эпик 002] «Сложная логика»: LogicRule в домене, команды Enable/DisableComplexLogic + Add/RemoveLogicRule, option-handle'ы Select'а, пунктирные рёбра правил, инварианты L-I1…L-I6 [коммит 7e7ecee]
- [S12-fix эпик 002] Правки приёмки S11 [owner 2026-10-12]: F1 главная `/` — dev-разводящая с карточками проектов (Демо-карта → /editor + stub-карточки); F2 новый узел падает на следующий уровень (layerDepth); F6 dnd узла между уровнями с подсветкой drop zone (команда SetPageLayerDepth); F3 запрет дублей навигационных связей (ConnectElements); F4 рёбра поверх узлов (z-index); F5/F7 единое выделение (чёрная рамка) + Delete/Backspace для узлов/элементов/связей; F8 рёбра smoothstep; evaluateVisibility (домен, ИЛИ+каскад) + бейдж «Скрыт в предпросмотре»; legacy `complexLogic` удалён из form-components (оставлено hasComplexLogic)
- Хэндоф для другого агента: пример схемы элемента (JSON Schema draft-07, поля elementType/x-category/properties) — docs/пример-схемы-элемента.json [owner 2026-10-12]; использовать при панели атрибутов (T-040/T-041) и генераторе (Epic 005)

### 4.2 NOT DONE (пробелы)

- Module Federation не настроена (пакет не установлен, конфигурация отсутствует) — ждёт решения контракта микрофронтенда, §6
- effector/patronum не установлены, presentation-слой без стейт-менеджера (TEMPORARY: граф в useState useEditorGraph, мутации только через CommandBus)
- Панель атрибутов не реализована (T-040/T-041): данные — stub-манифест (ADR-07), схема элемента по docs/пример-схемы-элемента.json; инспектор/свитч «Сложной логики» в панель — T-067 (сейчас TEMPORARY на чипе карточки)
- Страница /preview — заглушка без реализации (T-051, ждёт пакет preview lib-app-core); семантика видимости пока демонстрируется бейджем «Скрыт в предпросмотре» на карточке
- Хранилище ServiceGraph персистентное отсутствует (T-053, Epic 004); «Сохранить» — заглушка snackbar

---

## 5. INVARIANTS

<!-- status: implemented | stub | deferred | dropped. tests = кол-во тестов. -->

| #   | Правило                                                             | Статус                          | Тесты                   |
| --- | ------------------------------------------------------------------- | ------------------------------- | ----------------------- |
| 1   | Attachment — одно поле на форму                                     | implemented                     | 6                       |
| 2   | Radio — max 5 options                                               | implemented                     | 4                       |
| 3   | Маршрутизация и динамический контент взаимоисключающи               | implemented                     | 6 (общий файл с #4, #5) |
| 4   | Select list с маршрутизацией → динамический контент запрещён        | implemented                     | 6 (общий файл)          |
| 5   | ConfigItemPicker с маршрутизацией → динамический контент запрещён   | implemented                     | 6 (общий файл)          |
| 6   | После передачи в разработку — только минорные правки (workflow FSM) | deferred (Epic 004)             | 0                       |
| 7   | Info block — без картинок, один цвет                                | deferred (Epic 002, UI-уровень) | 0                       |
| 8   | Маски ввода                                                         | dropped                         | 0                       |

Формат инварианта: чистая функция `(graph: ServiceGraph) => InvariantViolation[]`, `InvariantViolation = { rule, path, message }`.

---

## 6. BLOCKERS & OPEN QUESTIONS

<!-- Всё неопределённое. UNKNOWN — не выдумывать ответ, ждать владельца или проверки в коде. -->

- ❓ UNKNOWN: доступ к пакету element-schemas из lib-app-core — получен или stub-манифест постоянный?
- ❓ UNKNOWN: формальная схема MicroAppDescriptor у движка lib-app-core (Q4 из proposal.md)
- ❓ NEW [owner 2026-10-06]: кто владеет роутингом в микрофронте — host или remote? Текущий createHashRouter (ADR-08) может конфликтовать с host-роутером
- ❓ NEW [owner 2026-10-06]: shared-зависимости Module Federation: react, react-dom, react-router-dom, flamingo, effector — singleton-политика и выравнивание версий с host
- ❓ NEW [owner 2026-10-06]: контракт remote-модуля — что экспортируется (mount-функция / компонент App), нужен ли standalone-режим для разработки
- ❓ NEW [owner 2026-10-06]: изоляция стилей Flamingo (SBSans) между host и remote
- ❓ NEW [S8, отложено владельцем 2026-10-10]: при удалении формы заявки (RemoveForm) поле `applicationFormId` сценариев типа application продолжает ссылаться на удалённую форму — каскад чистит только `links[]`; решить позже
- ❓ NEW [S10, отложено владельцем 2026-10-12]: в сжатом узле (T-033) карточки с исходящими связями остаются видимыми в конце списка (иначе react-flow роняет ребро без source-handle) — подтвердить поведение по дизайну; если не подходит, менять отображение
- ❓ NEW [S10, отложено владельцем 2026-10-12]: меню элементов тулбара для выделенной формы добавляет компонент в ПЕРВЫЙ шаг (в конкретный шаг — через «+» шага); подтвердить дефолт
- ✅ RESOLVED [S12-fix, owner 2026-10-12]: поштучное удаление элементов — единое правило проекта «выделение + Delete/Backspace» (ADR-12), отдельная корзина на карточке элемента не нужна; команда RemoveElement подключена к deleteSelectedElement в useEditorGraph
- ❓ NEW [S12-fix, owner 2026-10-12]: цветовая палитра темы будет меняться отдельным агентом с доступом к файлам — текущие токены theme.editor.canvas не финальные

---

## 7. NEXT STEPS

<!-- Приоритизировано, максимум 7 пунктов. Выполненное удаляется (факт уходит в §4.1). -->

1. [ ] Epic 002, S12: schema-driven панель атрибутов (T-040/T-041) по docs/пример-схемы-элемента.json; свитч «Сложной логики» в инспектор (T-067)
2. [ ] Epic 002: предпросмотр /preview с evaluateVisibility (T-062/T-068) — доменная функция готова
3. [ ] NEW: определить контракт микрофронтенда (exposes, shared, роутинг) — блокирует адаптацию bootstrap под remote
4. [ ] NEW: установить и настроить Module Federation plugin для Rsbuild, проверить интеграцию с host
5. [ ] Далее по docs/сессии-реализации.md (S13+)

---

## 8. EPICS ROADMAP

<!-- status: done | in-progress | not-started. % — грубая оценка, обновляется при закрытии задач. -->

| Epic | Название                      | Статус           | Содержимое                                                                                                                                                                                                                                                       |
| ---- | ----------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 001  | Foundation                    | in-progress ~95% | Слои, домен, инварианты, порты, CommandBus, DI-контейнер. Верификация на локальной машине пройдена. Осталось: MF-контракт и настройка Module Federation                                                                                                          |
| 002  | Canvas                        | in-progress ~75% | @xyflow/react 12.12.0. Закрыты: T-004, T-010/T-011, T-020/021/022, T-023/T-024, T-030, T-035, T-031/T-032/T-036 (c1f312f), T-033/T-034 (30fcae6), T-037 (7e7ecee) + правки приёмки S11 (F1–F8, ADR-11/ADR-12). Дальше S12: панель атрибутов (T-040/T-041, T-067) |
| 003  | Editor Features               | not-started      | Undo/redo UI, tree view, clipboard, ролевые ограничения                                                                                                                                                                                                          |
| 004  | Workflow & Persistence        | not-started      | XState FSM, роли, IndexedDB, экспорт, versioning                                                                                                                                                                                                                 |
| 005  | MicroApp Descriptor Generator | not-started      | IMicroAppDescriptorGenerator, BlueprintIR, экспорт в формат lib-app-core                                                                                                                                                                                         |

---

## 9. CHANGELOG

<!-- APPEND-ONLY. Формат: - YYYY-MM-DD | кто (owner|agent:<имя>) | что изменилось -->

- 2026-10-06 | owner | Миграция из handoff.md v1 → PROJECT_STATE schema v2. Новые решения: микрофронтенд (remote, Module Federation), host на Rsbuild, @xyflow/react подтверждён. Добавлены open questions по MF-контракту.
- 2026-10-08 | owner | Добавлен дизайн-документ «дизайн-сложная-логика.md»: условная видимость элементов (option Select → visible цели), расширяемая модель LogicCondition, задачи T-060…T-068, открытые вопросы L-Q1…L-Q5.
- 2026-10-09 | agent:kimi | Миграция проекта на локальную машину (Kimi Work). Сверка с коммитом af8ba3e: T-008 CommandBus, T-009 DI-контейнер, T-010 FormStep, инварианты #3–5 — закоммичены и перенесены из §4.2 в §4.1 (ранее PROJECT_STATE отставал от репо). awilix 13.0.5 → installed. Вопрос про спеку Epic 002 закрыт (декомпозиция утверждена). Прогон test/lint/build не выполнялся — назначен шагом 1 в §7. Добавлен KIMI.md (точка входа для агента), docs пополнены декомпозицией, дизайн-доками, сессиями и макетами.
- 2026-10-09 | agent:kimi | update-state после приёмки S7 (владелец подтвердил в диалоге): зафиксированы S4–S7 эпика 002 — T-004 (a3deb1a), T-010/T-011 (cd920b6), T-020/021/022 (d8c312e), T-023/T-024 (41de58e). @xyflow/react 12.12.0 → installed; TEMPORARY-подмена Flamingo→MUI v4 отражена в §2; верификация на локальной машине подтверждена (87 тестов, прогон зелёный); CURRENT_EPIC → 002; /editor больше не заглушка, /preview — остаётся.
- 2026-10-10 | owner | Решение: unit-тесты больше не пишутся и не запускаются (новый код — без тестов; верификация = lint+build; точечный прогон только при изменении ранее написанного кода с тестами; существующие тесты не удаляются). Отражено в конституции §8 П4/§9, KIMI.md §7, docs/промпт-старта-реализации.md, docs/сессии-реализации.md. Добавлен отложенный вопрос §6 про applicationFormId при RemoveForm (из S8).
- 2026-10-10 | agent:kimi | update-state после приёмки S8 (владелец подтвердил в диалоге): зафиксированы T-030 (адаптер graph ↔ flow) и T-035 (13 команд canvas), коммит 54579b7; ApplicationForm.orderIndex и PageEntityId — в §4.1; 162 теста (31 файл), последний полный прогон зелёный; Epic 002 → ~45%; следующая сессия — укрупнённая S9 (T-031+T-036+T-032, промпт docs/промпт-сессии-S9.md).
- 2026-10-12 | agent:kimi | update-state после правок приёмки S11 (S12-fix): зафиксированы S9 (T-031/T-032/T-036, c1f312f), S10 (T-033/T-034, 30fcae6), S11 (T-037, 7e7ecee) — ранее не попадали в state; F1–F8 [owner]: dev-разводящая на `/`, layerDepth + dnd между уровнями с drop zone (ADR-11), запрет дублей связей, рёбра поверх узлов и тип smoothstep, единое выделение+Delete (ADR-12), evaluateVisibility + бейдж «Скрыт в предпросмотре», legacy complexLogic удалён. Вопрос про корзину элемента закрыт (ADR-12). Добавлен docs/пример-схемы-элемента.json — хэндоф для панели атрибутов. Epic 002 → ~75%; lint/build/162 теста зелёные.
- 2026-10-12 | owner | Политика тестирования ужесточена: тесты НИКОГДА не пишутся и НИКОГДА не запускаются (даже точечно); верификация только lint+build + ручная проверка. Зафиксировано в KIMI.md §7 и §4.1.
