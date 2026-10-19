# Генератор схем элементов

Исходники — эта папка. Во фреймворк переносится **один собранный файл** `docs/schemas/generate-schema.js`
(`npm run schemas:build` в blueprint-studio) → `packages/element-schemas/scripts/generate-schema.js`,
запуск: `node generate-schema.js --all --bundle ../schemas-bundle.json`. Нужен `ts-morph` (уже есть во фреймворке).

| Файл                | Что внутри                                                       |
| ------------------- | ---------------------------------------------------------------- |
| `format.ts`         | **формат схемы** (типы, версия, порядок ключей) — правится редко |
| `config.ts`         | таблицы: пути, категории, служебные props, shared-типы           |
| `extract.ts`        | чтение кода: справочник, класс, defaultProps, методы, props      |
| `type-to-schema.ts` | TS-тип → схема                                                   |
| `emit.ts`           | сборка схемы элемента                                            |
| `shared.ts`         | общие типы (`$ref` на `shared/*.schema.json`)                    |
| `diagnostics.ts`    | коды проблем для отчёта                                          |
| `validate.ts`       | проверка ajv (если установлен)                                   |
| `cli.ts`            | запуск                                                           |

## Запуск (из папки генератора)

```sh
npx ts-node cli.ts --all --bundle ../../schemas-bundle.json   # один файл: схемы + shared + отчёт
npx ts-node cli.ts --element button                           # записать одну схему + shared + манифест
npx ts-node cli.ts --all                                      # записать все
npx ts-node cli.ts --all --check                              # сверить с диском, код 1 при расхождении
```

ajv необязателен: `npm i -D -E ajv@8.17.1` в пакете схем включает проверку схем и дефолтов.

## Что пишется

- `src/schemas/<элемент>.schema.json` — свои props элемента + `allOf: [$ref base]`;
- `src/shared/base-element.schema.json` — общие props (`BaseProps`) и события (`BaseElement.on*`), из кода при каждом прогоне;
- `src/shared/icon.schema.json` — список иконок;
- `src/index.json` — манифест.

## Правила стабильности

- Выход собирается только из типов `format.ts`; порядок ключей задаёт `canonical*`.
- Ломающее изменение формата — `FORMAT_VERSION + 1` и строка в CHANGELOG в `format.ts`.
- Что не выражено схемой — `x-ts-type` + запись в отчёте, пустых `{}` нет.
