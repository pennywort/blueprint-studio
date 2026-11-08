# Инструкции и проверки для агентов — архитектура без надзора (R-GOV)

> Источник: [ревью 2026-11-08](../ревью-архитектуры-2026-11-08.md). Цель — чтобы агент при
> новой доработке сам клал правило в domain, подпись в labels, а мутацию в команду, и чтобы
> автоматика ловила отклонения. Статус: ⏳ ожидает.

## Как запустить

«Сделай шаг R-GOV-N из `docs/refactoring/R-GOV-agent-guidance.md`». Порядок работы — в
[README](README.md). AGENTS.md и конституция — общие правила владельца. Шаги, которые их
правят, помечены **[решение владельца]**: агент готовит текст и показывает владельцу diff до
коммита. После правки `.claude/agents/*` — `npm run agents:sync` в том же коммите (CLAUDE.md).

## Почему так вышло (диагноз)

- AGENTS.md говорит о слоях только как о направлении импортов (`AGENTS.md` §4: «4 слоя …
  enforced lint»). Чек-листа «куда класть код» и фразы «presentation не вычисляет доменных
  фактов» нет. §4b запрещает ветвления по `kind`, но условие по `steps.length` под этот
  запрет не попадает.
- Самая точная формулировка — конституция §4a п.1 (`specs/000-constitution.md:83`), но
  агенту сказано читать её «по необходимости».
- Автоматика: eslint-boundaries проверяет только импорты. `npm run rules`
  (`scripts/agent/rules-check.mjs`) ловит hex, `window`, иконки и тесты. Правила §4a/§4b,
  `Box`, свои `onKeyDown`, русские литералы, размер файла — только текстом.
- `rules-reviewer` (`.claude/agents/rules-reviewer.md`) не проверяет §4a/§4b, и его никто
  не обязывает запускать.

## Сводка

| Шаг      | Суть                                                                    | Владелец |
| -------- | ----------------------------------------------------------------------- | -------- |
| R-GOV-1  | AGENTS.md: §4c «Куда класть код» + шаг ревью в чек-листе §7             | да       |
| R-GOV-2  | ADR-24 «presentation не выводит доменных фактов» + строка в конституции | да       |
| R-GOV-3  | Карты слоёв `src/<слой>/README.md`                                      | нет      |
| R-GOV-4  | `npm run rules`: новые проверки с baseline                              | нет      |
| R-GOV-5  | eslint: относительные пути в infrastructure, решение по zod             | да (zod) |
| R-GOV-6  | `rules-reviewer` проверяет §4a/§4b и «есть ли функция в domain»         | нет      |
| R-GOV-7  | Шаблон новой возможности `docs/templates/feature.md`                    | нет      |
| R-GOV-8  | Убрать устаревшее и противоречия в доках                                | частично |
| R-GOV-9  | Регулярное `/architecture-review` после эпика                           | да       |
| R-GOV-10 | Configs first: аудит, умолчания правил в JSON                           | да       |
| R-GOV-11 | `schemas:check` в pre-commit                                            | нет      |

Порядок: 1 → 2 → 4 → 6 → 3 → 7 → 8 → 5 → 9 → 11; 10 — после ответа владельца.

**Статус [2026-11-08]:** R-GOV-1, 2, 6 ✅ (AGENTS.md §4c, §4d, конституция §3 п.5, rules-reviewer); ADR-24 — внести через `/update-state`.

---

## R-GOV-1. AGENTS.md: «Куда класть код» [решение владельца]

**Цель.** Новый короткий §4c, до 12 строк. Черновик:

| Что пишу                                                                | Куда                                                           |
| ----------------------------------------------------------------------- | -------------------------------------------------------------- |
| Условие/порог/тип над моделью («можно ли», «какой тип», «что удалится») | `src/domain/<понятие>.ts`: правило-данные + функция            |
| Изменение графа                                                         | команда `application/commands`, вызов через `CommandBus`       |
| Сценарий с портами (загрузка, импорт)                                   | `application/project/*` (R-CMD-2)                              |
| Текст для пользователя                                                  | `presentation/labels/editor-labels.ts`                         |
| Вид данных → вид UI                                                     | таблица в presentation (`sketch-registry`, `highlight-policy`) |
| Компонент                                                               | читает готовые значения, сам не решает                         |

Добавить ещё:

- «Перед правкой: `grep -rn <понятие> src/domain`. Функция есть — используй её. Нет — создай
  её; копировать условие нельзя.» Эталон — `domain/form-kind.ts` + `FORM_KIND_LABELS`.
- В §7 (чек-лист): «перед коммитом с кодом — `rules-reviewer`» и строка отчёта «слои:
  правила в domain — да/нет».
- Лимит §0 не нарушать: AGENTS.md подставляется в каждую сессию, так что коротко.

## R-GOV-2. ADR-24 и конституция [решение владельца]

**Цель.**

- ADR-24 в PROJECT_STATE §3 (через `/update-state`): «Presentation не выводит доменных
  фактов. Любой вывод из модели — функция domain. Адаптеры канваса — чистый маппинг данных
  в вид».
- Строка в конституции §3 и ссылка на §4a п.1. Правка конституции — стоп-условие
  (AGENTS.md §4), поэтому только с текстом от владельца.

## R-GOV-3. Карты слоёв

**Цель.** `src/domain/README.md`, `src/application/README.md`,
`src/infrastructure/README.md`, `src/presentation/README.md`. В каждом, до 40 строк:

- что лежит в слое;
- список «понятие → модуль» (element-kinds, rule-policy, layer-capacity, form-kind,
  connection-rules, …);
- «сюда не класть …».

Ссылки на них — из AGENTS.md §4c и `README.md`. Поддерживать при создании модуля: пункт в
шаблоне R-GOV-7.

## R-GOV-4. Новые проверки `npm run rules`

**Цель.** Новые правила в `scripts/agent/rules-check.mjs`. Для существующего кода —
baseline-файл (`scripts/agent/rules-baseline.json`, счётчик по файлу): старое даёт
предупреждение, новое — ошибку. Baseline уменьшается по мере выполнения R-DOM, R-MOD.

| Правило                                                         | Где                                             | Ссылка     |
| --------------------------------------------------------------- | ----------------------------------------------- | ---------- |
| Кириллица в строковом литерале                                  | `src/presentation/**` кроме `labels/`           | R-DOM-9    |
| Кириллица в литерале                                            | `src/domain/**` (кроме сообщений `Error`)       | R-DOM-9    |
| `kind === '…'` / `case '…':` по виду сущности                   | `src/presentation/**`                           | §4b, R-DOM |
| `.steps/.elements/.options.length` в сравнении с числом         | `src/presentation/**`                           | R-DOM      |
| Импорт `Box` из `@material-ui/core`                             | `src/**`                                        | AGENTS §4  |
| `onKeyDown`/`addEventListener('keydown'` вне `features/hotkeys` | `src/presentation/**` (поля ввода — исключение) | AGENTS §4  |
| `confirm(` / `alert(`                                           | `src/**`                                        | R-MOD-5    |
| Файл больше 400 строк растёт                                    | `src/**`                                        | R-MOD      |

Комментарии и `.disabled` исключать. Ложные срабатывания гасить точечным маркером
`// rules-allow: <правило> — <причина>`, а не ослаблением правила (AGENTS.md §4).

## R-GOV-5. eslint [zod — решение владельца]

- `eslint.config.js:154-173`: в `no-restricted-imports` добавить относительные пути
  `**/infrastructure/**` из presentation. Boundaries `:84` сузить до `infrastructure/container`.
- zod в domain описан по-разному: конституция §3 («только в schemas/»), ADR-10 («в domain
  запрещён»), `eslint.config.js:16` («допустим в domain/model»). Фактически `domain/model`
  на zod. Вопрос владельцу: (1) закрепить «zod — только `domain/model`» в eslint и тексте
  ADR (рекомендуется); (2) иное.

## R-GOV-6. `rules-reviewer`

**Цель.** В `.claude/agents/rules-reviewer.md`:

- описание «§4, §4a, §4b»;
- пункты: «условие или порог над моделью в presentation — есть ли функция в `src/domain`?»,
  «новый литерал на русском вне labels», «параллельный механизм (§4a)», «вердикт §4b»,
  «модуль растёт больше 400 строк»;
- `npm run agents:sync`.

## R-GOV-7. Шаблон новой возможности

**Цель.** `docs/templates/feature.md`, до 40 строк. По шагам:

1. понятие → `domain/<x>.ts` (`X_RULE` + `xOf()`);
2. подпись → labels;
3. мутация → команда + регистрация;
4. сценарий с портами → `application/project`;
5. UI: компонент читает значение;
6. хоткей → `features/hotkeys`;
7. схема и генерируемость (§4b);
8. запись в карту слоя (R-GOV-3).

Ссылка — из AGENTS.md §4a.

## R-GOV-8. Устаревшее и противоречия (частично — владелец)

- `docs/refactoring/README.md` — «UI только `@blueprint-vendor/*`». Исправлено в этом
  ревью; осталось `R-BOX-layout.md:7,13,78`.
- ADR-10 и PROJECT_STATE (UI-кит flamingo) — через `/update-state`.
- `README.md:12` — `npm run test (Vitest)`: скрипта нет, тесты запрещены.
- AGENTS.md: иконки — только через фасад `presentation/icons/editor-icons.ts` (так требуют
  eslint и rules); описание `rules` в §5 неполное.
- CLAUDE.md: упомянуть `/architecture-review`.
- Конституция §3: «React + Effector» → «Effector запланирован» [владелец].
- Ссылка на `P-SCH-schema-clarification.md` (файла нет): помечена в README.

## R-GOV-9. Регулярное ревью [решение владельца]

**Цель.** Правило в AGENTS.md §7 или docs/refactoring/README.md: `/architecture-review`
после каждого эпика или раз в месяц. Результат — новый `docs/ревью-архитектуры-<дата>.md` и
планы здесь. Повторно найденное не дублировать, а обновлять статус.

## R-GOV-10. Configs first: аудит и умолчания в JSON [решение владельца]

**Факт (аудит 2026-11-08).** Принцип записан в AGENTS.md §4d. Правила «что куда можно» уже
данные: `editor-policy.json` (виды, атрибуты, умолчания) и `EditorRules` (связи, лимиты,
ёмкость, строгость; переопределение — `public/config/editor-settings.json`). Но:

- **умолчания `EditorRules` — TS-константы** (`DEFAULT_*` в `domain/*`), а конституция §4a п.5
  так и требует («умолчания — в коде»);
- **остались `if` вместо полей конфига** (план — R-CFG):
  - L-I7 «одно правило на цель»: `invariants/logic-rules.ts:100`, `connection-rules.ts:112` (R-CFG-3);
  - «один переход на источник»: `invariants/step-transitions.ts:26`, `commands/add-step-transition.ts:27` (R-CFG-3);
  - «Главная закреплена на 0» в 5 местах домена и команд и в `layer-policy.ts:47` (R-CFG-4, R-DOM-2);
  - «смена колонки рвёт правила»: `commands/move-element.ts:86-93` (R-CFG-4);
  - меню узлов и запрет второй Главной: `editor-toolbar.tsx:65-69,167`, `use-editor-graph.ts:183` (R-CFG-7);
  - тексты нарушений внутри инвариантов (R-CFG-11);
- `RULE_BY_KIND` (`invariants/routing-excludes-dynamic-content.ts:16`) администратору недоступен (R-ADM-6);
- UI не показывает лимиты заранее (`elementCountLimits`, `variants.max`) — нарушение видно
  только после команды (R-CFG-5).

**Вопрос владельцу.** Где хранить умолчания правил:

1. JSON-файл умолчаний (`infrastructure/settings/default-editor-rules.json`). Схема и тип
   остаются в domain, DI отдаёт файл как `defaults` секции `rules`. Один формат с политикой.
   Нужна правка конституции §4a п.5 (рекомендуется, если правила будет читать не только разработчик).
2. Оставить TS-таблицы в domain, как сейчас. JSON — только переопределение администратора.

## R-GOV-11. `schemas:check` в pre-commit

**Факт.** `npm run schemas:check` (проверка `editor-policy.json` по схемам) не входит ни в
`verify`, ни в `.husky/pre-commit`. Ошибка в политике всплывёт только при старте.

**Цель.** В pre-commit — запуск только при изменённых `src/infrastructure/element-schemas/**`
(через lint-staged или проверку `git diff --cached --name-only`).
