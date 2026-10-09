# Handoff: blueprint-studio — детальное описание проекта и плана реализации

> **Mode:** REMOTE · **Version:** 1 · **Updated:** 2026-10-06 13:55
> **Next focus:** подробное описание того, что здесь собирались реализовать
> **(REMOTE only)** You have NO access to project files — everything needed is in this document.

---

## 1. Mission

- **What:** Автономное React-приложение (класс «native»), визуальный редактор архитектурных карт (`ServiceBlueprint`) для описания микроприложений на движке lib-app-core.
- **Why:** Позволить архитекторам и разработчикам визуально проектировать интерфейсы внутренних сервисов (формы, сценарии, компоненты), экспортируя результат как версионируемый JSON.
- **Done when:** Полностью реализован Epic 001 (Foundation) + последующие эпик-задачи по канвасу, workflow и персистентности.

---

## 2. Environment & Layout

- **Stack:**
  - Сборка: Rsbuild 2.2.0 (`@rsbuild/core`, `@rsbuild/plugin-react`)
  - Фреймворк: React 19.3.0 + TypeScript 5.7.3 (strict mode)
  - UI-кит: `@sber-friend/flamingo-components/core/icons/pickers/animations` 4.9.17 (единая версия)
  - Состояние: Effector (план), patronum (план)
  - DI: Awilix (установлен, **не используется** — см. §3)
  - Валидация: Zod 4.6.5
  - Патчи: Immer 11.1.18
  - Роутер: react-router-dom 7.18.3
  - Тесты: Vitest 5.0.0 + @testing-library/react 16.3.3
  - Canvas: `@xyflow/react` — **планируется, не установлен**
  - Workflow: XState — **планируется, не установлен**
  - Линтинг: ESLint 9.39.5 flat config + eslint-plugin-boundaries 7.2.0
  - Форматирование: Prettier 3.9.6, Husky 9.1.7, commitlint 21.2.2

- **Working tree:** Clean (все файлы закоммичены в один коммит `1760ea7`). 26 файлов в `src/`. 22 unit-теста проходят.

- **Layout:**
```
src/
├── index.tsx                           # Committed — только import('./bootstrap')
├── bootstrap.tsx                       # Committed — React 19 createRoot, БЕЗ DI-контейнера
├── domain/
│   ├── model/
│   │   ├── service-graph.ts            # Committed — ServiceGraphSchema (Zod)
│   │   ├── form-components.ts          # Committed — 12 форм-компонентов Zod-схем
│   │   ├── scenario.ts                 # Committed — Scenario, SubScenario, FormStep, ApplicationForm
│   │   └── ids.ts                      # Committed — Branded types + factory-функции
│   └── invariants/
│       ├── index.ts                    # Committed — validateGraph() оркестратор
│       ├── single-attachment-per-form.ts    # Committed — Инвариант #1 (6 тестов)
│       ├── radio-max-five-options.ts        # Committed — Инвариант #2 (4 теста)
│       ├── scenario-type-fields.ts          # Committed — Инварианты #3-4 (8 тестов)
│       ├── routing-excludes-dynamic-content.ts  # Committed — STUB/NO-OP
│       ├── index.test.ts                 # Committed — 4 теста
│       ├── single-attachment-per-form.test.ts  # Committed
│       ├── radio-max-five-options.test.ts        # Committed
│       └── scenario-type-fields.test.ts          # Committed
├── application/
│   ├── ports/
│   │   ├── element-schema-provider.ts  # Committed — IElementSchemaProvider + ElementSchema
│   │   ├── id-generator.ts             # Committed — IIdGenerator
│   │   └── clock.ts                    # Committed — IClock
│   └── commands/                       # НОВЫЙ/ПУСТОЙ — CommandBus/Command/AddFormComponent ОТСУТСТВУЮТ
├── infrastructure/
│   ├── container.ts                    # НОВЫЙ/ОТСУТСТВУЕТ — Awilix buildContainer()
│   ├── element-schemas/
│   │   ├── element-manifest.json       # Committed — 12 записей манифеста
│   │   └── manifest-schema-provider.ts # Committed — ManifestSchemaProvider (stub-адаптер)
│   └── misc/
│       ├── uuid-id-generator.ts        # Committed — crypto.randomUUID
│       └── system-clock.ts             # Committed — new Date()
└── presentation/
    ├── app/App.tsx                     # Committed — HashRouter, 3 роута
    └── pages/
        ├── project-list/ProjectListPage.tsx  # Committed — Flamingo Typography
        ├── editor/EditorPage.tsx              # Committed — заглушка "Canvas will be here"
        └── preview/PreviewPage.tsx            # Committed — заглушка "Preview will be here"
```

- **Run & verify:**
  ```bash
  npm install            # установка зависимостей
  npm run dev            # запуск dev-сервера
  npm run test           # 22 теста, все проходят
  npm run build          # сборка Rsbuild
  npm run lint           # ESLint + tsc --noEmit
  ```

---

## 3. State

### Done (what is actually committed and working)

- **[2026-09] T-000:** Stop-gate проверка. Node v22, npm 10.9.8. Flamingo 4.9.17 недоступен в публичном registry, но владелец подтвердил доступ. React 19 одобрен.
- **[2026-09] T-001:** Инициализация проекта. package.json с точными версиями (`--save-exact`), git init, зависимости.
- **[2026-09] T-002:** Bootstrap приложения. Rsbuild + TypeScript strict, hash-роутер (`createHashRouter`), 3 страницы-заглушки (`/`, `/editor`, `/preview`).
- **[2026-09] T-003:** Flamingo smoke test. Компонент `Typography` из `@sber-friend/flamingo-core` рендерится со стилями (шрифты SBSans).
- **[2026-09] T-004:** Линтеры и форматтеры. ESLint flat config с `eslint-plugin-boundaries` (4 слоя), boundaries-линтер блокирует импорты React в `domain`. Prettier, Husky, commitlint, lint-staged настроены.
- **[2026-09] T-005:** Доменная модель. Zod-схемы для всех 12 form-компонентов (discriminated union по `kind`), `ServiceGraph`, `Scenario`/`SubScenario`, `FormStep`/`ApplicationForm`, branded ID-типы. Константы: `ATTACHMENT_MAX_FILE_BYTES = 3MB`, `ATTACHMENT_MAX_TOTAL_BYTES = 50MB`, `RADIO_MAX_OPTIONS = 5`.
- **[2026-09] T-006:** Инварианты (частично). 3 из 4 реализованы:
  - Инвариант #1: Attachment — только одно поле на форму
  - Инвариант #2: Radio — максимум 5 вариантов (граничные: 5 ok, 6 violation)
  - Инвариант #3-4: Scenario type fields — `infoBlock` только для navigation, `link` только для link
  - Инвариант #5: ConfigurationItemPicker + routing — НЕ реализован (stub)
  - Инвариант #6 (workflow): Отложен на эпик 004
  - Инвариант #7 (info block styling): Ожидает UI-уровня
  - Инвариант #8 (маски ввода): Отложено (не реализуются)
- **[2026-09] T-007:** Порты и stub-адаптер. `IElementSchemaProvider`, `IIdGenerator`, `IClock` объявлены. `ManifestSchemaProvider` загружает JSON-манифест, валидирует Zod при старте, бросает `SchemaNotFoundError` на неизвестный kind. `UuidIdGenerator` и `SystemClock` реализованы.

### NOT DONE (missing from the repository)

- **T-008: Command Bus — полностью отсутствует**
  - Каталог `src/application/commands/` пуст
  - Нет `Command` interface с методом `apply(draft: ServiceGraph): void`
  - Нет `CommandBus` класса (execute/undo/redo с Immer `produceWithPatches`)
  - Нет команды `AddFormComponent(formId, stepId, component)`
  - Концептуально: это ЯДРО приложения по конституции (железное правило #1 — "любое действие пользователя = команда application-слоя, UI не мутирует состояние напрямую")

- **T-009: Composition Root (DI-контейнер) — полностью отсутствует**
  - Нет `infrastructure/container.ts`
  - Нет вызова `buildContainer()` в `bootstrap.tsx`
  - Awilix установлен, но **не используется нигде**
  - `bootstrap.tsx` создаёт React-root напрямую, без передачи контейнера в `<App />`

- **Инвариант routing-excludes-dynamic-content — stub/no-op**
  - Файл `src/domain/invariants/routing-excludes-dynamic-content.ts` существует
  - Содержит `// eslint-disable-next-line @typescript-eslint/no-unused-vars`
  - Реальная функция `checkScenarioForRoutingDynamicConflict` ничего не делает

### Architecture decisions (что и почему выбрано)

| Решение | Обоснование |
|---|---|
| Rsbuild вместо Vite | Требование владельца: скорость, SWC-компиляция |
| Awilix PROXY + деструктуризация в конструкторах | Минификация production-сборки переименовывает параметры конструктора; CLASSIC-режим ломается только в проде |
| Immer `produceWithPatches` как единственный способ мутации | Один механизм даёт: применение команды, undo/redo, будущие патч-цепочки версий |
| Effector в presentation, команды — чистые классы в application | Команды тестируются без React и Effector |
| JSON-манифест в репо за портом | Нет доступа к реальному `element-schemas` из lib-app-core; замена = новый адаптер |
| Hash-роутинг (`createHashRouter`) | Любой роут открывается без серверных rewrite |
| Без Vite/Next.js/CRA/Redux/Zustand/декораторов DI | Осознанный отказ от альтернатив |

---

## 4. Blockers & Unknowns

### Issue: Точка остановки — missing Command Bus + DI Container

- **Symptom / Expected:** По задачам T-008 и T-009 эти компоненты должны быть реализованы, но в репозитории отсутствуют. Все задачи помечены как ✅ в tasks.md, но фактически — не закоммичены.
- ✅ Ruled out: awilix не установлен — он есть в deps, но не в коде.
- 🔍 Leading theory: задачи T-008/T-009 были выполнены в отдельной сессии, которая не была закоммичена.
- ❓ Unknown: была ли реализация Command Bus/DI Container вообще сделана.

### Issue: incomplete invariant

- **Symptom:** `routing-excludes-dynamic-content.ts` — stub.
- **Expected:** Функция должна детектировать конфликты: (a) маршрутизация и динамический контент взаимоисключающи; (b) selectList с маршрутизацией → динамический контент запрещён; (c) configurationItemPicker с маршрутизацией → динамический контент запрещён.
- **Конституция, раздел 4, правила 3-5** — доменные инварианты, а не проверки в обработчиках кнопок.

### Must determine before proceeding

- ❓ Epic 002 (canvas/reactflow) — есть ли утверждённая специка или нужно создавать?
- ❓ Доступ к пакету `element-schemas` из lib-app-core — получен или stub-манифест — временное решение?
- ❓ Формальная схема `MicroAppDescriptor` (MicroApp JSON-дескриптор) — есть ли у движка lib-app-core? (Open question Q4 из proposal.md)

---

## 5. Next Steps (prioritized)

1. [ ] **Реализовать Command Bus** → `src/application/commands/command.ts` + `command-bus.ts` + `add-form-component.ts`
   - `Command` interface: `apply(draft: ServiceGraph): void`
   - `CommandBus`: execute с `produceWithPatches`, undo с `applyPatches(inversePatches)`, redo, очистка redoStack при новой команде
   - `AddFormComponent(formId, stepId, component)`: добавляет компонент, проверяет инварианты, бросает `InvariantViolationError` при нарушении (например, второй attachment)
   - Верификация: `npm run test` зелёный, execute→undo→redo работает, `toEqual`

2. [ ] **Реализовать DI Container** → `src/infrastructure/container.ts`
   - Awilix `InjectionMode.PROXY`, конструкторы с деструктуризацией
   - `buildContainer()`: `idGenerator`, `clock`, `elementSchemaProvider`, `commandBus`
   - Обновить `bootstrap.tsx`: создать контейнер, передать в `<App />`
   - Верификация: `container.resolve()` каждого ключа Cradle без throw

3. [ ] **Реализовать инвариант routing vs dynamic content** → `src/domain/invariants/routing-excludes-dynamic-content.ts`
   - Проверить каждый сценарий на конфликт маршрутизации и динамического контента
   - Покрыть тестами: валидные и нарушающие кейсы

4. [ ] **Финальная верификация Epic 001** → `npm run lint && npm run test && npm run build`
   - Все критерии приёма из spec.md раздел 4
   - README.md: как запустить, структура слоёв, ссылка на конституцию

5. [ ] **Epic 002: Canvas** (reactflow, узлы-заглушки, палитра компонентов, drag-and-drop, pan/zoom) — начать только после утверждения спеки владельцем.

---

## 6. Code & Context

### 6.1 Ключевые типы и интерфейсы

**Доменная модель — ServiceGraph:**
```typescript
export const ServiceGraphSchema = z.object({
  id: z.string().brand<'BlueprintId'>(),
  title: z.string(),
  homePage: HomePageSchema,       // listItems, widgetCards, faq?, additionalInfo?
  subScenarios: z.array(SubScenarioSchema),  // type: 'application'|'link'|'navigation'
  applicationForms: z.array(ApplicationFormSchema),  // steps: FormStep[], components: FormComponent[]
});
```

**12 Form-компонентов (discriminated union по `kind`):**
| # | kind | Ключевые атрибуты |
|---|---|---|
| 1.1 | `textField` | label, required, multiline, maxLength, placeholder |
| 1.2 | `infoBlock` | text, links: MarkdownLink[] |
| 1.3 | `datePeriod` | label, required, withTime, restrictions {noPast, noFuture} |
| 1.4 | `attachment` | label, required, allowedTypes[] (ОДНО поле на форму) |
| 1.5 | `checkbox` | label, required |
| 1.6 | `configurationItemPicker` | label, required, multiSelect, ciTypes[], disabled |
| 1.7 | `employeeSearch` | label, required, searchType: 'colleagues'|'all' |
| 1.8 | `selectList` | label, required, displayType: 'radio'|'dropdown'|'list', options[], search? |
| 1.9 | `typography` | label, displayType: 'heading' |
| 2.0 | `button` | label, displayType: 'text'|'secondary', position: 'inline'|'standalone' |
| 2.1 | `addressPicker` | label, required, displayParts: ('floor'|'room'|'zone'|'workplace')[] |
| 2.2 | `employeeLoginField` | label, required, isHidden? |

**Порты (application/ports):**
```typescript
export interface IElementSchemaProvider {
  getSchema(kind: FormComponentKind): ElementSchema;  // бросает SchemaNotFoundError
  listSchemas(): readonly ElementSchema[];
}

export interface IIdGenerator { next(): string; }

export interface IClock { now(): Date; }
```

**Command Bus (требуется к реализации):**
```typescript
export interface Command {
  readonly name: string;
  apply(draft: ServiceGraph): void;  // чистая функция-мутация
}

export class CommandBus {
  execute(current: ServiceGraph, command: Command): ServiceGraph;
  undo(current: ServiceGraph): ServiceGraph | null;
  redo(current: ServiceGraph): ServiceGraph | null;
  canUndo(): boolean;
  canRedo(): boolean;
}
```

**DI Container (требуется к реализации):**
```typescript
export interface Cradle {
  idGenerator: IIdGenerator;
  clock: IClock;
  elementSchemaProvider: IElementSchemaProvider;
  commandBus: CommandBus;
}

export function buildContainer(): AwilixContainer<Cradle> {
  const container = createContainer<Cradle>({ injectionMode: InjectionMode.PROXY });
  container.register({
    idGenerator: asClass(UuidIdGenerator).singleton(),
    clock: asClass(SystemClock).singleton(),
    elementSchemaProvider: asClass(ManifestSchemaProvider).singleton(),
    commandBus: asClass(CommandBus).singleton(),
  });
  return container;
}
```

### 6.2 JSON-манифест (stub для IElementSchemaProvider)

Файл: `src/infrastructure/element-schemas/element-manifest.json` — массив из 12 записей. Каждая запись содержит `kind`, `version`, и массив `attributes` с `{key, type, required}`. Типы атрибутов: `bool | text | number | radio | select | stringList`.

### 6.3 Инварианты (hard rules из конституции)

Каждый инвариант — чистая функция `(graph: ServiceGraph) => InvariantViolation[]` где `InvariantViolation = { rule: string, path: string, message: string }`.

| # | Правило | Статус |
|---|---|---|
| 1 | Attachment — ОДНО поле на форму | ✅ Реализован (6 тестов) |
| 2 | Radio — max 5 options | ✅ Реализован (4 теста) |
| 3 | Маршрутизация и динамический контент взаимоисключающи | ⚠️ Stub/no-op |
| 4 | Select list с маршрутизацией → динамический контент запрещён | ⚠️ Stub/no-op |
| 5 | ConfigItemPicker с маршрутизацией → динамический контент запрещён | ⚠️ Stub/no-op |
| 6 | После передачи в разработку — только минорные правки | ⏭️ Workflow-FSM (эпик 004) |
| 7 | Info block — без картинок, один цвет | ⏭️ UI-уровень (эпик 002) |
| 8 | Маски ввода | ⏭️ Не реализуются |

### 6.4 Архитектурные правила слоёв

```
domain → [только domain]
application → [domain, application]
infrastructure → [domain, application, infrastructure]
presentation → [domain, application, infrastructure/container]
```

Проверяется через `eslint-plugin-boundaries` + `no-restricted-imports` в `src/domain/` (запрет импортов React, zod, effector, awilix, xstate, @xyflow/react, @sber-friend/*).

### 6.5 Готовые сниппеты для реализации

**CommandBus (полная реализация по design.md):**
```typescript
import { type Patch, produceWithPatches, applyPatches } from 'immer';
import type { ServiceGraph } from '@domain/model/service-graph';
import type { IClock } from '@application/ports/clock';

export interface Command {
  readonly name: string;
  apply(draft: ServiceGraph): void;
}

export interface ExecutedCommand {
  command: Command;
  patches: Patch[];
  inversePatches: Patch[];
  executedAt: Date;
}

export class CommandBus {
  private undoStack: ExecutedCommand[] = [];
  private redoStack: ExecutedCommand[] = [];

  constructor(private readonly deps: { clock: IClock }) {}

  execute(current: ServiceGraph, command: Command): ServiceGraph {
    const [, patches, inversePatches] = produceWithPatches(current, (draft) => {
      command.apply(draft);
    });
    this.undoStack.push({ command, patches, inversePatches, executedAt: this.deps.clock.now() });
    this.redoStack = [];  // новая команда очищает redo
    return applyPatches(current, patches);
  }

  undo(current: ServiceGraph): ServiceGraph | null {
    const last = this.undoStack.pop();
    if (!last) return null;
    this.redoStack.push(last);
    return applyPatches(current, last.inversePatches);
  }

  redo(current: ServiceGraph): ServiceGraph | null {
    const last = this.redoStack.pop();
    if (!last) return null;
    this.undoStack.push(last);
    return applyPatches(current, last.patches);
  }

  canUndo(): boolean { return this.undoStack.length > 0; }
  canRedo(): boolean { return this.redoStack.length > 0; }
}
```

---

## 7. Глоссарий проекта

| Термин | Код | Значение |
|---|---|---|
| Микроприложение | `EngineMicroApp` | JS-приложение на движке lib-app-core |
| JSON-дескриптор | `MicroAppDescriptor` | Целевой формат будущего генератора |
| Архитектурная карта | `ServiceBlueprint` | Основной артефакт редактора |
| Граф сервиса | `ServiceGraph` | Доменная модель содержимого карты |
| Форм-компонент | `FormComponent` | 12 типов discriminated union по `kind` |
| Роли | `Role` | 'author' \| 'approver' \| 'developer' |
| Порт | `I*` | Интерфейс application-слоя |
| Адаптер | `*Provider` / `*Repository` | Реализация порта в infrastructure |

---

## 8. Архитектура эпиков

Полный roadmap (по proposal.md + design.md):

| Epic | Название | Статус | Содержимое |
|---|---|---|---|
| 001 | Foundation | 🟡 80% | Проект, слои, доменная модель, инварианты, порты, stub-адаптер, 3 страницы. **ПРОБЕЛЫ: CommandBus, DI Container** |
| 002 | Canvas | ⏳ Не начат | reactflow canvas, узлы-заглушки, палитра компонентов, drag-and-drop, pan/zoom, drawer атрибутов |
| 003 | Editor Features | ⏳ Не начат | Undo/redo UI, tree view свойств, clipboard (copy/paste), ролевые ограничения |
| 004 | Workflow & Persistence | ⏳ Не начат | XState workflow-FSM, роли (author/approver/developer), IndexedDB персистентность, экспорт файла, versioning |
| 005 | MicroApp Descriptor Generator | ⏳ Не начат | `IMicroAppDescriptorGenerator`, промежуточное представление `BlueprintIR`, экспорт в формат lib-app-core |