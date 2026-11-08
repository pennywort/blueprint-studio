# Доменные правила из presentation — в domain (R-DOM)

> Источник: [ревью 2026-11-08](../ревью-архитектуры-2026-11-08.md). Продолжает R-ARC-6 и
> заменяет R-ARC-5 (шаг R-DOM-6). Строки — на коммит `1309575`; если сдвинулись, ищи по имени.
> Статус: ⏳ ожидает.

## Как запустить

«Сделай шаг R-DOM-N из `docs/refactoring/R-DOM-domain-rules.md`». Порядок работы — в
[README](README.md). Шаги с пометкой **[решение владельца]** начинай только после ответа владельца.

## Эталон (обязателен для каждого шага)

Коммит `1309575` — тип формы (D1):

- `domain/form-kind.ts`: тип-значение `FormKind`, правило-данные `FORM_KIND_RULE`, чистая функция `formKindOf`;
- `presentation/labels/editor-labels.ts`: подпись `FORM_KIND_LABELS[kind]`;
- в данных узла лежит значение, а не строка; компонент только подставляет подпись.

**Признак нарушения:** в presentation есть условие над моделью (по `kind`, `.length`, роли,
наличию поля), которое отвечает на предметный вопрос: _можно ли, какой тип, какой номер,
что удалится_. Правило — одно на домен. Его читают и команда/инвариант, и UI.

## Сводка

| Шаг      | Суть                                                                  | Риск    | Владелец |
| -------- | --------------------------------------------------------------------- | ------- | -------- |
| R-DOM-1  | Точка связи на карточке — по `connectable` вида, не по «комментарию»  | высокий | нет      |
| R-DOM-2  | Таблица видов страниц: закрепление уровня, цель связи                 | средний | нет      |
| R-DOM-3  | Доступность и каскад «Сложной логики» — domain                        | высокий | нет      |
| R-DOM-4  | Вид связи по жесту и таблица видов рёбер                              | средний | нет      |
| R-DOM-5  | Уровень навигации и номер шага — domain                               | низкий  | нет      |
| R-DOM-6  | Нарушение несёт цель `{kind, id}` (бывший R-ARC-5)                    | средний | нет      |
| R-DOM-7  | Совместимость и видимость атрибута — одна таблица                     | средний | нет      |
| R-DOM-8  | Меню добавления — одна функция domain, вид комментария из таблицы     | низкий  | нет      |
| R-DOM-9  | Подписи — только `labels`; адресат комментария — значение, а не текст | средний | да       |
| R-DOM-10 | Явный тип формы в модели (`formKind`)                                 | низкий  | да       |

Порядок: 1 → 3 → 2 → 4 → 6 → 7 → 5 → 8; 9 и 10 — после ответа владельца.

---

## R-DOM-1. Точка связи — по правилу вида (риск высокий)

**Факт.** `presentation/features/canvas/nodes/element-card.tsx:183,303` скрывает source-handle
по `commentAudience !== undefined`. Правило «вид участвует в связях» уже есть:
`domain/element-kinds.ts:34` (`connectable`), его читает домен (connection-rules). Если
администратор выключит `connectable` у вида, точка на карточке останется, а связь из неё
будет отклонена.

**Цель.** Адаптер (`graph-flow-adapter.ts`, `elementToElementData`) кладёт в данные карточки
`connectable: boolean` из `kindRules(rules, kind).connectable`, а карточка читает только его.

**Проверка.** `npm run ui`: у кнопки и select точка-источник есть, у комментария — нет.
Протягивание связи кнопка → подсценарий работает.

## R-DOM-2. Таблица видов страниц (риск средний)

**Факт.** Правило «Главная закреплена на уровне 0 и не бывает целью связи» записано в
четырёх местах:

- `canvas/layers/layer-policy.ts:47` (`movableKinds`);
- `application/commands/set-page-layer-depth.ts:34` (`entry.kind === 'home'`);
- `canvas/nodes/scenario-node.tsx:106` (`type === 'home' ? null : <TargetHandle>`);
- неявно — список кандидатов в `domain/connection-rules.ts` (`navigationTargets`).

**Цель.** `domain/page-kinds.ts`: `PAGE_KIND_RULES: Record<'home' | 'subScenario' | 'form',
{ pinnedLayer: number | null; linkTarget: boolean }>` и функции `isPageMovable(kind)`,
`isLinkTarget(kind)`. Их читают все четыре места. Образец — `domain/layer-capacity.ts`.

**Проверка.** Главную нельзя перетащить на другой уровень, подсценарий и форму — можно.
К Главной связь не протягивается.

## R-DOM-3. «Сложная логика»: доступность и каскад (риск высокий)

**Факт.**

- Правило «когда показывать переключатель» (атрибут с store `ext` + варианты +
  `capabilities.logic` или уже включён) лежит в адаптере: `graph-flow-adapter.ts:236-250`
  (`complexLogicToggle`). Вызывает его хук `use-editor-graph.ts:481`.
- Последствия переключения считает хук для `confirm`: `use-editor-graph.ts:487-502`.
  Выключение удаляет правила источника, включение — переходы вариантов. Команда
  `UpdateElementProps` делает то же самое сама, то есть это два расчёта одного каскада.

**Цель.**

- `domain/complex-logic.ts`: `complexLogicAvailability(rules, element, container, hasAttribute)`
  и `complexLogicCascade(graph, elementId, enable) → { ruleIds, transitionIds }`.
- Команда применяет каскад, хук показывает его размер в подтверждении. Расчёт — один.
- Связано: ADR-23, `docs/дизайн-сложная-логика.md` (L-I*).

**Проверка.** Включение и выключение логики у select в шаге формы. Подтверждение
показывается, только если есть что удалять. После undo правила и переходы возвращаются.

## R-DOM-4. Вид связи по жесту (риск средний)

**Факт.** Решение «жест создаёт переход шага / правило логики / ссылку на страницу» написано
дважды: в `canvas/use-connection.ts:60-112` (`connect`) и в `:173-196`
(`isConnectionAllowed`). Ветвление по `edge.data.kind` при reconnect и удалении —
`use-connection.ts:122,145-151`; `reconnectable: false` задаётся отдельно в
`graph-flow-adapter.ts:510,542`.

**Цель.**

- `domain/connection-rules.ts`: `classifyConnection(source, target) → 'link' | 'logicRule' | 'stepTransition' | null`.
  Его читают и `connect`, и `isConnectionAllowed`.
- Таблица видов рёбер `EDGE_KINDS: Record<kind, { reconnectable; removeCommand }>` в
  presentation (это поведение UI). Её читают адаптер и `use-connection`.

**Проверка.** Протянуть все три вида связи, переподключить ссылку, удалить каждое ребро.
Недопустимые цели не подсвечиваются (ADR-14).

## R-DOM-5. Уровень навигации и номер шага (риск низкий)

**Факт.** В адаптере `graph-flow-adapter.ts:410,421` стоят `levelOffset = homePage ? 0 : 1`
и `depth + levelOffset || 1`, в `:591` — «номер шага = индекс занятого уровня + 1».

**Цель.** В `domain/graph-depths.ts` — `navigationLevel(graph, depth)`, в
`domain/form-step-depths.ts` — `formStepNumbers(form, transitions)`. Адаптер берёт числа
оттуда, а `editor-labels` делает из них подписи. Эти номера нужны и генератору UI.

**Проверка.** Подписи «Первый/Второй уровень навигации» с Главной и без неё (D8). «Шаг N» у
шагов разных колонок; у шагов одной колонки номер общий.

## R-DOM-6. Нарушение несёт цель (бывший R-ARC-5, риск средний)

**Факт.** У `InvariantViolation` (`domain/invariants/index.ts:17-23`) нет цели. Строку пути
строит domain (`element-containers.elementViolationPath`), а presentation разбирает её
шестью регулярками: `canvas/violation-markers.ts:26-81`. Любое изменение формата пути без
предупреждения ломает подсветку.

**Цель.** В нарушении — `target: { kind: 'page' | 'step' | 'element' | 'edge'; id; pageId? }`.
`violation-markers` читает `target`, регулярки удаляются, `path` остаётся для текста.

**Проверка.** Импорт графа с нарушениями (`--upload`): бейджи на тех же узлах, элементах и шагах.

## R-DOM-7. Атрибуты: совместимость и видимость (риск средний)

**Факт.** Совместимость значения с типом атрибута проверяется в двух местах:
`attributes/attributes-panel.tsx:158-180` (`isValueCompatible`) и
`infrastructure/element-schemas/assemble-element-schemas.ts:273-290`. Видимость
(`visibleWhen`) вычисляет компонент: `attributes-panel.tsx:78-81`.

**Цель.** В `application/ports/element-schema-provider.ts` (или рядом, в `application/element-schema/`) —
`ATTRIBUTE_VALUE_GUARDS: Record<type, (v) => boolean>` и `isAttributeVisible(attribute, values)`.
Их читают сборка схем и панель.

**Проверка.** Панель атрибутов у select, input и checkbox. Зависимое поле появляется и
исчезает. Несовместимое значение отображается только для чтения, как сейчас.

## R-DOM-8. Меню добавления (риск низкий)

**Факт.** Один и тот же фильтр `kindRules(...).inAddMenu` написан в `toolbar/editor-toolbar.tsx:74-86`
и в `canvas/use-editor-graph.ts:67-74`. Литерал вида — `editor-toolbar.tsx:142`
(`onAddElement?.('comment')`) в обход `COMMENT_KIND`/family.

**Цель.** `domain/element-kinds.ts`: `addableKinds(rules, kinds)` и
`kindOfFamily(rules, 'comment')`. Литералов вида в presentation не остаётся.

**Проверка.** Меню «+» в узле и в тулбаре показывает тот же состав, кнопка комментария
добавляет комментарий.

## R-DOM-9. Подписи и адресат комментария [решение владельца] (риск средний)

**Факт.**

- `domain/model/canvas-element.ts:61`: `DEFAULT_COMMENT_AUDIENCE = 'Разработчику'`. Русская
  подпись хранится в модели (и в файлах проекта).
- Около 116 строк с русскими литералами вне `presentation/labels`. Среди них:
  - «Сложная логика» (`element-card.tsx:290`) и «Предвыбор» (`option-card.tsx:74`);
  - «Пустой уровень», «Добавить шаг» (`form-node.tsx:356,369`);
  - отказы и confirm-тексты (`use-editor-graph.ts:270,277,446,492,506`);
  - `NEW_SCENARIO_TITLE`/`NEW_FORM_TITLE` (`default-elements.ts:9-10`);
  - «Новый проект», «(копия)» (`ProjectListPage.tsx:116,170-176`).
- `form-node.tsx:295` сравнивает `data.title` с подписью `NODE_KIND_LABELS.form`, то есть
  зависит от локализации.

**Вопрос владельцу.** Адресат комментария:

1. Хранить как перечисление (`developer`, …), подпись брать из labels. Нужна миграция
   файла проекта (рекомендуется).
2. Оставить свободный текст как данные пользователя и вынести в labels только значение по
   умолчанию.

**Цель (без вопроса).**

- Литералы переезжают в `editor-labels.ts`.
- Причины отказов возвращаются кодом, подпись берётся из таблицы.
- Сравнение с подписью в `form-node` заменяется флагом «заголовок по умолчанию».

**Проверка.** Тексты на канвасе, в меню и в подтверждениях не изменились (визуально — `--text`).

## R-DOM-10. Явный тип формы [решение владельца] (риск низкий)

**Факт.** Тип формы выводится только из числа шагов (`domain/form-kind.ts`). Степпер из
одного шага выразить нельзя, генератор UI может только повторить правило. Вопрос — ОВ-19 в
`docs/открытые-вопросы.md`.

**Цель (если «да»).** Необязательное поле `formKind` в `ApplicationFormSchema`
(`domain/model/scenario.ts`). `formKindOf` возвращает поле, а если его нет — вывод по шагам.
Переключатель — в панели атрибутов формы, через команду. Описать поле в `docs/формат-файла-проекта.md`.
