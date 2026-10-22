# Настройки редактора: администратор и пользователь (план R-ADM)

> [owner 2026-10-22] Всё, что можно отключить, поменять или переопределить, — секция одного
> реестра настроек, а не `if` в коде. Администратор переопределяет секции для всех пользователей
> стенда (на лету, без пересборки), пользователь — только секции со `scope: 'user'` для себя.
> Один механизм и один формат документа для обоих слоёв. Продолжение [R-CFG](R-CFG-config.md)
> (R-CFG-9 выполнен здесь).

## 1. Модель

```
умолчания секций (код/JSON владельца)  ←  документ администратора  ←  документ пользователя
        defaults                           IAdminSettingsSource        IUserSettingsStorage
                                           (все пользователи)          (только scope: 'user')
```

| Где                                                              | Что                                                                                                                                  |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `application/settings/settings-section.ts`                       | `SettingsSection<T>`: key, title, scope, defaults, `apply(base, over)`                                                               |
|                                                                  | фабрики: `mergeSection` (deepMerge, `null` удаляет ключ), `appendSection` (список, как keybindings.json), `replaceSection` (целиком) |
| `application/settings/resolve-settings.ts`                       | чистая сборка слоёв; ошибка секции → `issues`, секция остаётся на нижнем слое                                                        |
| `application/settings/editor-settings.ts`                        | `EditorSettings` (DI singleton): `get(section)`, `snapshot()`, `subscribe`, `load()`, `watch()`, `setUserOverride()`                 |
| `application/ports/settings-sources.ts`                          | порты `IAdminSettingsSource` (load + watch), `IUserSettingsStorage`                                                                  |
| `infrastructure/settings/http-admin-settings-source.ts`          | документ по HTTP + опрос; тело — объект или JSON-строка (бэкенд)                                                                     |
| `infrastructure/settings/local-storage-user-settings-storage.ts` | личный документ в localStorage (старый ключ хоткеев переносится)                                                                     |
| `infrastructure/container.ts`                                    | регистрация; секции presentation передаёт `bootstrap.tsx` (границы слоёв)                                                            |
| `presentation/features/settings/use-settings.ts`                 | `useSettingsSection`, `useSettingsSnapshot`, `useEditorRules`                                                                        |
| `presentation/features/settings/settings-issues-notifier.tsx`    | ошибки настроек — снекбаром                                                                                                          |
| `public/config/editor-settings.json`                             | документ администратора (пока файл)                                                                                                  |

Принципы (AGENTS.md §4a): секцию объявляет владелец рядом с умолчаниями; ядро о содержимом не
знает (Open/Closed); значение читают и домен, и UI из одного места; модульных синглтонов нет —
правила передаются явно (`CommandContext`, `validateGraph(graph, rules)`, хуки).

## 2. Секции

| Ключ           | Владелец                                                            | Scope | Слияние | Что переопределяет                                                                             |
| -------------- | ------------------------------------------------------------------- | ----- | ------- | ---------------------------------------------------------------------------------------------- |
| `rules`        | `application/settings/rules-settings.ts` → `domain/editor-rules.ts` | admin | merge   | строгость, лимиты по блокам, ёмкость уровней, виды элементов, матрица связей                   |
| `editorPolicy` | `infrastructure/element-schemas/editor-policy-settings.ts`          | admin | replace | состав элементов и атрибутов, порядок меню, подписи, умолчания; проверка — как `schemas:check` |
| `keybindings`  | `presentation/features/hotkeys/keybindings-settings.ts`             | user  | append  | хоткеи (формат keybindings.json VS Code, `-command` снимает)                                   |

Новая секция = файл секции у владельца + строка в регистрации (container или bootstrap).
Ядро, порты и адаптеры не меняются.

## 3. Документ (администратор и пользователь — один формат)

```json
{
  "version": 1,
  "rules": {
    "elementCountLimits": { "subScenario": { "attachment": 2 }, "formStep": { "attachment": null } },
    "severity": { "element-count-limit": "warning", "radio-max-five-options": "off" },
    "elementKinds": { "radio-group": { "variants": { "max": 3 } } }
  },
  "keybindings": [{ "key": "mod+d", "command": "-edit.duplicate" }]
}
```

- `$`-ключи и `version` — служебные. Неизвестная секция, неверное поле, секция `admin` в документе
  пользователя → уведомление; остальные секции применяются.
- Битая секция не ломает редактор: работает значение нижнего слоя.
- Карта, ставшая невалидной по новым правилам, не блокируется — нарушения видны маркерами.

## 4. Шаги

### R-ADM-1. Ядро настроек, правила в DI, политика и хоткеи — ✅ 2026-10-22

Реестр секций, слои, порты, адаптеры (файл + localStorage), `EditorSettings` в DI; правила домена
передаются параметром во все проверки, команды (`CommandContext`) и UI; политика элементов и
хоткеи — секции. Опрос файла администратора — 15 с (`bootstrap.tsx`).
**Проверено (`npm run ui`):** без настроек — как раньше; подмена файла на стенде во время работы →
через ≤ 15 с появились маркеры нарушений по новому лимиту; битая секция → снекбар, прочее работает.

### R-ADM-2. Бэкенд: настройки в базе (JSON-строка) — ⏳ задача на интеграцию

- Бэкенд: таблица/запись с документом настроек (JSON-строка), `GET` отдаёт её как есть.
- Фронт: в `bootstrap.tsx` сменить `adminSettings.url` на эндпоинт — адаптер уже понимает тело
  JSON-строкой. Опрос остаётся; при SSE/WebSocket — новый адаптер `IAdminSettingsSource.watch`.
- Под Module Federation URL передаёт хост (опция `buildContainer`), относительный путь — §7.

### R-ADM-3. Запись настроек администратора — ⏳ вместе с R-ADM-2

- Порт: `IAdminSettingsSource.save(document): Promise<void>` (`PUT` на бэкенд); у файла — нет.
- `EditorSettings.setAdminOverride(section, value)`: проверка секцией ДО отправки (неверное не
  сохраняется, ошибка — у поля), затем `save` и `applyAdmin`.
- Права проверяет бэкенд; фронт только скрывает панель.

### R-ADM-4. Скрытая панель настроек — ⏳

- Роут `#/settings` (hash-роутер), разделы — `editorSettings.listSections()` в порядке регистрации.
- Вкладки «Для всех» (админ, видна при роли от хоста/бэкенда) и «Мои» (секции `scope: 'user'`).
- Форма секции — из её zod-схемы (как панель атрибутов строится из JSON-схемы): поле показывает
  умолчание, общее и личное значения, кнопку «сбросить» (`null`/удаление ключа).
- Первая версия допустима как JSON-редактор секции с проверкой `section.apply` на лету.
- Хоткеи: таблица команд `HOTKEY_COMMANDS` × комбинации (R-HK-5).

### R-ADM-5. Запрет пользовательского переопределения администратором — ⏳ по запросу

`"$locked": ["keybindings"]` в документе администратора — секция становится `admin` для всех.
Одна проверка в `resolveSettings`.

### R-ADM-6. Кандидаты в секции (из R-CFG) — ⏳

| Кандидат                                                    | Секция / scope                    | Источник сейчас                                  |
| ----------------------------------------------------------- | --------------------------------- | ------------------------------------------------ |
| Подписи видов/узлов/шагов, тексты нарушений (R-CFG-6/10/11) | `labels` / admin                  | словари в коде                                   |
| Правила маршрутизации по виду (`RULE_BY_KIND`)              | `rules` (поле)                    | `invariants/routing-excludes-dynamic-content.ts` |
| Подсветка: приоритет и рамки                                | `highlight` / admin; цвета — тема | `theme/editor-theme.ts` (highlight)              |
| Геометрия канваса (ширины, зазоры) — R-CFG-8                | `canvasLayout` / user?            | `CANVAS_LAYOUT`, `FORM_STEP_LAYOUT`              |
| Период автосохранения, стартовый проект                     | `editor` / user                   | —                                                |

Порядок: сначала одно ядро на понятие (R-CFG/R-ENT), потом секция — конфиг поверх двух копий
логики не делаем.

## 5. Параллельные механизмы (известные)

- Два меню добавления фильтруют виды одинаково (`use-editor-graph.ts`, `editor-toolbar.tsx`) — R-CFG-7.
- Строгость (`rules.severity`) и тексты нарушений живут раздельно — R-CFG-11.
