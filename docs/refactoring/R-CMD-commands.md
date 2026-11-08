# Команды и use-case'ы application — одно ядро вместо копий (R-CMD)

> Источник: [ревью 2026-11-08](../ревью-архитектуры-2026-11-08.md). Включает R-ARC-7 (шаг
> R-CMD-2) и опирается на R-ENT-3/4. Строки — на коммит `1309575`. Статус: ⏳ ожидает.

## Как запустить

«Сделай шаг R-CMD-N из `docs/refactoring/R-CMD-commands.md`». Порядок работы — в [README](README.md).

## Сводка

| Шаг     | Суть                                                                | Риск    | Владелец       |
| ------- | ------------------------------------------------------------------- | ------- | -------------- |
| R-CMD-1 | Один каскад удаления для 5 команд (скрытый баг с `logicRules`)      | высокий | нет            |
| R-CMD-2 | Use-case'ы проекта: загрузка, сохранение, экспорт, импорт (R-ARC-7) | средний | нет            |
| R-CMD-3 | Фабрики сущностей и id — в application, не в хуках                  | средний | нет            |
| R-CMD-4 | Удаление нескольких узлов — одна команда, один шаг undo             | низкий  | да (поведение) |
| R-CMD-5 | Хелперы уровней и вставка по якорю — общее ядро                     | низкий  | нет            |
| R-CMD-6 | Удалить мёртвую `AddFormComponent`                                  | низкий  | нет            |
| R-CMD-7 | `routing.*` — третий механизм перехода (R-ARC-4, вопрос В4)         | средний | да             |

Порядок: 1 → 6 → 3 → 2 → 5; 4 и 7 — после ответа владельца.

---

## R-CMD-1. Один каскад удаления (риск высокий, баг)

**Факт.** Цепочку «собрать id удаляемых элементов → отфильтровать `links` → отфильтровать
`logicRules` → `validStepTransitions` → сохранить глубины» повторяют пять команд:
`remove-form.ts:28-48`, `remove-form-step.ts:36-45`, `remove-element.ts:33-46`,
`remove-scenario.ts:24-29`, `remove-home-page.ts:23`. Копии уже разошлись: при удалении
страницы `logicRules` не чистятся, хотя матрица связей (`domain/connection-matrix.ts:110`,
настройки администратора) может включить логику на страницах. Тогда останутся висящие
правила, и инвариант `logic-rules` начнёт отклонять следующие команды.

**Цель.** `application/commands/cascade-remove.ts`: `cascadeRemoveElements(draft, elementIds,
rules)` (ссылки, правила, переходы) и `cascadeRemoveTargets(draft, targetIds)`. Все пять
команд вызывают его. Глубины сохраняет уже существующий `preservePageDepths` / аналог для шагов.

**Проверка.** Удаление подсценария со связями, формы, шага с переходами, элемента с
правилом логики. Undo возвращает всё. Импорт графа с логикой на странице (если матрица
позволяет): удаление страницы не даёт нарушений.

## R-CMD-2. Use-case'ы проекта (бывший R-ARC-7, риск средний)

**Факт.** Порты вызывает presentation:

- `canvas/editor-store.ts:20-80`: `graphRepository.load/save`, `graphFileCodec`, сброс истории;
- `pages/project-list/ProjectListPage.tsx:83-176`: `serialize`, `parse`, импорт копией с
  новым id и «(копия)», создание пустого проекта.

**Цель.** `application/project/`: `LoadProject`, `SaveProject`, `ExportProject`,
`ImportProject` (режимы «заменить» / «копией»), `CreateProject`, `DeleteProject`. Это
классы под Awilix PROXY с зависимостями-портами, регистрация — в `infrastructure/container`.
Presentation вызывает их из контейнера. Правила (сброс истории R-ARC-1, конфликт id при
импорте) живут только там. Учесть ADR-06: сценарии не зависят от React.

**Проверка.** Главная: создать, открыть, экспортировать, импортировать как копию и с
заменой, удалить проект. В редакторе правка сохраняется и после перезагрузки остаётся.
Undo после открытия другого проекта пуст.

## R-CMD-3. Фабрики и id (риск средний)

**Факт.** Presentation сам берёт `idGenerator` и собирает доменные объекты:

- `canvas/use-editor-graph.ts:97,197-204`: «форма создаётся с одним пустым шагом»;
- `ProjectListPage.tsx:83`: пустой граф;
- `element-catalog/element-catalog.tsx:53`: `cloneElementWithId`.

Сопоставление «контейнер/узел → цель команды» написано трижды:
`use-editor-graph.ts:268-286,329-344,440-454` (Главная определяется сравнением
`pageId === homePage?.id`).

**Цель.**

- Команды принимают намерение (`AddForm { title }`) и сами берут `IdGenerator` из DI.
  Фабрика `newApplicationForm` — в domain.
- `elementTargetOf(graph, container)` — в `application/commands/graph-lookup.ts`, рядом с `AddElement`.

**Проверка.** Добавить подсценарий, форму (с одним шагом), элемент в страницу, в шаг и в
пустой шаг. Копировать и вставить элемент. Добавить из каталога.

## R-CMD-4. Удаление нескольких узлов — один шаг undo [решение владельца] (риск низкий)

**Факт.** `use-editor-graph.ts:551-558` (`removeNodes`) выполняет по команде на узел: Delete
трёх узлов = три шага undo. `RemoveElement(...ids)` уже удаляет пачкой.

**Вопрос владельцу.** Меняется поведение undo: (1) один шаг на всё удаление (рекомендуется,
как у элементов); (2) оставить как есть.

**Цель (1).** `RemoveNodes(ids)` или составная команда в `CommandBus` (сначала проверь,
поддерживает ли шина batch).

## R-CMD-5. Хелперы уровней и вставка по якорю (риск низкий)

**Факт.**

- «Следующий уровень = max + 1» встречается в 4 местах: `domain/form-step-depths.ts:60`,
  `commands/graph-lookup.ts:36`, `add-element.ts:68`, `add-form-component.ts:37`.
- Цикл «явный `layerDepth` → карта» повторён в `graph-depths.ts:27-31`,
  `form-step-depths.ts:33-38`, `step-element-depths.ts:23-28`.
- Presentation считает глубины дважды за пересчёт: `canvas-layout.ts:173,179,245` и
  `graph-flow-adapter.ts:369,576,588`.
- `move-element.ts:66-105` вставляет по якорю своим `splice` мимо `domain/ordered-move.ts`.
- Правило N4 «смежных уровней» написано дважды: `layer-placement.ts:14` и
  `step-placement.ts:18` — это R-ENT-3 из `R-ENT-entities.md`, делать там.

**Цель.**

- В `domain/layer-depths.ts` — `explicitDepthsOf(items)` и `nextLayerDepth(depths)`.
- `move-element` использует `moveByAnchor`/`insertByAnchor`.
- Глубины считаются один раз за пересчёт и передаются и раскладке, и адаптеру (вместе с R-MOD-1).

**Проверка.** Перенос элемента между колонками и шагами, перенос шага, перенос страницы
между уровнями. Положение и порядок — как раньше.

## R-CMD-6. Мёртвая команда (риск низкий)

**Факт.** `application/commands/add-form-component.ts` используют только `*.disabled`; её
дублирует `add-element.ts:60-68`.

**Цель.** Удалить команду и её регистрацию. `*.disabled` не трогать (AGENTS.md §4).

## R-CMD-7. `routing.*` — третий механизм перехода [решение владельца] (риск средний)

**Факт.** `domain/model/canvas-element.ts:27-31` (`routing.targetStepId/targetScenarioId`)
существует рядом с `links` и `stepTransitions`. UI его не задаёт; используется только в
`invariants/routing-excludes-dynamic-content.ts:33` и в миграции
`graph-record-migration.ts:146`.

**Вопрос** — В4 в `R-SCH-element-schemas.md` (не дублировать). После решения: удалить поле с
миграцией или вычислять его из `links`/`stepTransitions`.
