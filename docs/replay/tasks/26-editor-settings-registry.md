# Задача 26 — Реестр настроек: администратор и пользователь

| Поле                         | Значение                          |
| ---------------------------- | --------------------------------- |
| change id                    | `editor-settings-registry`        |
| Эпик                         | 002                               |
| Номера (T-xxx / ADR / D / R) | ADR-21, R-ADM-1, R-ADM-4, R-CFG-9 |
| Реальные коммиты (справка)   | 0ce47d8, 4de6def                  |

## Цель

Настройки редактора меняются без пересборки, по слоям.

## Состав (что реализовано и должно попасть в change)

- Один реестр секций SettingsSection (key, scope admin/user, defaults, merge/append/replace)
- Слои: умолчания ← администратор (для всех, на лету) ← пользователь
- EditorRules передаются явно (CommandContext, validateGraph(graph, rules)); битая секция не применяется, ошибка — уведомлением
- Политика элементов и хоткеи — секции реестра; документ администратора public/config/editor-settings.json
- Скрытая страница #/settings — просмотр действующих настроек

## Не входит (не описывать)

- R-ADM-2 (бэкенд), R-ADM-3, 5, 6.

## Где проверять по коду

- `src/application/settings/settings-section.ts`
- `src/application/settings/resolve-settings.ts`
- `src/application/ports/settings-sources.ts`
- `src/infrastructure/settings/http-admin-settings-source.ts`
- `public/config/editor-settings.json`
- `src/presentation/pages/settings/SettingsPage.tsx`
