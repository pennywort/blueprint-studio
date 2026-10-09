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
> **UPDATED:** 2026-10-09
> **CURRENT_EPIC:** 001 (Foundation, ~95%)

---

## 1. MISSION

<!-- Что это и зачем. Меняется ТОЛЬКО по явному решению владельца [owner]. -->

Автономный визуальный редактор архитектурных карт (`ServiceBlueprint`) для описания микроприложений на движке lib-app-core. Пользователи: архитекторы и разработчики. Выходной артефакт: версионируемый JSON (`MicroAppDescriptor`, генератор — Epic 005).

**Форма поставки [owner, 2026-10-06]:** микрофронтенд (remote module, Module Federation), встраивается в host-приложение на Rsbuild.

---

## 2. STACK

<!-- status: installed | planned | removed
Версии — ТОЛЬКО из package.json. planned = решение принято, пакет не установлен. -->

| Слой | Пакет | Версия | Статус |
|---|---|---|---|
| Сборка | @rsbuild/core + @rsbuild/plugin-react | 2.2.0 | installed |
| Микрофронтенд | Module Federation (Rsbuild MF plugin) | — | planned [owner 2026-10-06] |
| Фреймворк | react + react-dom | 19.3.0 | installed |
| Язык | typescript (strict) | 5.7.3 | installed |
| UI-кит | @sber-friend/flamingo-components (core/icons/pickers/animations) | 4.9.17 | installed |
| Состояние | effector + patronum | — | planned |
| DI | awilix | 13.0.5 | installed, используется (container.ts) |
| Валидация | zod | 4.6.5 | installed |
| Патчи/undo | immer | 11.1.18 | installed |
| Роутер | react-router-dom (createHashRouter) | 7.18.3 | installed — под вопросом в микрофронте, см. §6 |
| Тесты | vitest + @testing-library/react | 5.0.0 / 16.3.3 | installed |
| Canvas | @xyflow/react | — | planned [owner 2026-10-06: подтверждён как canvas-движок] |
| Workflow | xstate | — | planned (Epic 004) |
| Линтинг | eslint (flat) + eslint-plugin-boundaries | 9.39.5 / 7.2.0 | installed |
| Форматирование | prettier + husky + commitlint + lint-staged | 3.9.6 / 9.1.7 / 21.2.2 | installed |

---

## 3. ARCHITECTURE DECISIONS

<!-- ADR-lite. status: active | superseded. Новая запись — только из кода/коммита или [owner].
При отмене решения старое НЕ удаляется — статус меняется на superseded, добавляется новая строка. -->

| ID | Решение | Обоснование | Статус |
|---|---|---|---|
| ADR-01 | Rsbuild вместо Vite | Требование владельца: скорость, SWC | active |
| ADR-02 | Микрофронтенд: приложение — remote module (Module Federation), host — на Rsbuild | [owner 2026-10-06] Встраивание в существующий host | active |
| ADR-03 | @xyflow/react (react-flow) как canvas-движок | [owner 2026-10-06] | active |
| ADR-04 | Awilix PROXY + деструктуризация в конструкторах | CLASSIC-режим ломается при минификации в проде | active, реализовано в container.ts |
| ADR-05 | Immer produceWithPatches — единственный механизм мутации | Применение команды + undo/redo + будущие патч-цепочки версий | active, реализовано в command-bus.ts |
| ADR-06 | Effector в presentation, команды — чистые классы в application | Команды тестируются без React/Effector | active |
| ADR-07 | JSON-манифест в репо за портом IElementSchemaProvider | Нет доступа к element-schemas из lib-app-core; замена = новый адаптер | active |
| ADR-08 | Hash-роутинг (createHashRouter) | Любой роут без серверных rewrite | active — пересмотреть в контексте микрофронта (§6) |
| ADR-09 | Без Vite/Next.js/CRA/Redux/Zustand/декораторов DI | Осознанный отказ от альтернатив | active |
| ADR-10 | 4 слоя: domain → application → infrastructure → presentation, enforced eslint-plugin-boundaries; в domain запрещены react/zod/effector/awilix/xstate/@xyflow/@sber-friend | Изоляция домена, тестируемость | active |

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
- 48 unit-тестов в репо (подсчёт по `it(`). ВНИМАНИЕ: фактический прогон test/lint/build на момент миграции 2026-10-09 не выполнялся — проверить после npm install на локальной машине

### 4.2 NOT DONE (пробелы)

- Module Federation не настроена (пакет не установлен, конфигурация отсутствует) — ждёт решения контракта микрофронтенда, §6
- effector/patronum не установлены, presentation-слой без стейт-менеджера (страницы — заглушки)
- Страницы /editor и /preview — заглушки без реализации (Epic 002+)

---

## 5. INVARIANTS

<!-- status: implemented | stub | deferred | dropped. tests = кол-во тестов. -->

| # | Правило | Статус | Тесты |
|---|---|---|---|
| 1 | Attachment — одно поле на форму | implemented | 6 |
| 2 | Radio — max 5 options | implemented | 4 |
| 3 | Маршрутизация и динамический контент взаимоисключающи | implemented | 6 (общий файл с #4, #5) |
| 4 | Select list с маршрутизацией → динамический контент запрещён | implemented | 6 (общий файл) |
| 5 | ConfigItemPicker с маршрутизацией → динамический контент запрещён | implemented | 6 (общий файл) |
| 6 | После передачи в разработку — только минорные правки (workflow FSM) | deferred (Epic 004) | 0 |
| 7 | Info block — без картинок, один цвет | deferred (Epic 002, UI-уровень) | 0 |
| 8 | Маски ввода | dropped | 0 |

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

---

## 7. NEXT STEPS

<!-- Приоритизировано, максимум 7 пунктов. Выполненное удаляется (факт уходит в §4.1). -->

1. [ ] Верификация после миграции на локальную машину: npm install + test + lint + build зелёные, затем /check-state
2. [ ] NEW: определить контракт микрофронтенда (exposes, shared, роутинг) — блокирует адаптацию bootstrap под remote
3. [ ] NEW: установить и настроить Module Federation plugin для Rsbuild, проверить интеграцию с host
4. [ ] Финальная верификация Epic 001: lint + test + build + README
5. [ ] Epic 002 Canvas (@xyflow/react): декомпозиция утверждена [owner], старт по сессиям S1–S15 (docs/сессии-реализации.md, docs/промпт-старта-реализации.md)

---

## 8. EPICS ROADMAP

<!-- status: done | in-progress | not-started. % — грубая оценка, обновляется при закрытии задач. -->

| Epic | Название | Статус | Содержимое |
|---|---|---|---|
| 001 | Foundation | in-progress ~95% | Слои, домен, инварианты, порты, CommandBus, DI-контейнер, страницы-заглушки. Осталось: верификация на локальной машине, MF-контракт |
| 002 | Canvas | not-started | @xyflow/react canvas, узлы, палитра, drag-and-drop, pan/zoom, drawer атрибутов. Декомпозиция утверждена, сессии S1–S15 |
| 003 | Editor Features | not-started | Undo/redo UI, tree view, clipboard, ролевые ограничения |
| 004 | Workflow & Persistence | not-started | XState FSM, роли, IndexedDB, экспорт, versioning |
| 005 | MicroApp Descriptor Generator | not-started | IMicroAppDescriptorGenerator, BlueprintIR, экспорт в формат lib-app-core |

---

## 9. CHANGELOG

<!-- APPEND-ONLY. Формат: - YYYY-MM-DD | кто (owner|agent:<имя>) | что изменилось -->

- 2026-10-06 | owner | Миграция из handoff.md v1 → PROJECT_STATE schema v2. Новые решения: микрофронтенд (remote, Module Federation), host на Rsbuild, @xyflow/react подтверждён. Добавлены open questions по MF-контракту.
- 2026-10-08 | owner | Добавлен дизайн-документ «дизайн-сложная-логика.md»: условная видимость элементов (option Select → visible цели), расширяемая модель LogicCondition, задачи T-060…T-068, открытые вопросы L-Q1…L-Q5.
- 2026-10-09 | agent:kimi | Миграция проекта на локальную машину (Kimi Work). Сверка с коммитом af8ba3e: T-008 CommandBus, T-009 DI-контейнер, T-010 FormStep, инварианты #3–5 — закоммичены и перенесены из §4.2 в §4.1 (ранее PROJECT_STATE отставал от репо). awilix 13.0.5 → installed. Вопрос про спеку Epic 002 закрыт (декомпозиция утверждена). Прогон test/lint/build не выполнялся — назначен шагом 1 в §7. Добавлен KIMI.md (точка входа для агента), docs пополнены декомпозицией, дизайн-доками, сессиями и макетами.
