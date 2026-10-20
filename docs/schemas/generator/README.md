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
| `component.ts`      | компоненты: поиск вызовов фабрики, props/методы/события/состав   |
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
- `src/components/<компонент>.schema.json` — схема компонента (`x-entity: component`): props = тип P
  фабрики; унаследованные целиком props элемента или база — ссылкой `allOf: [{$ref}]` на схему элемента
  или `shared/base-element` (дефолты для них — `x-base-defaults`), при Pick/Omit/переобъявлении — копией; `x-methods` = контроллер C, `x-events` = `$emit`, `x-composition` = типы
  из `createElement` во view, `x-slots`; в бандле — секция `components`;
- `src/shared/base-element.schema.json` — общие props (`BaseProps`) и события (`BaseElement.on*`), из кода при каждом прогоне;
- `src/shared/icon.schema.json` — список иконок;
- `src/index.json` — манифест.

## Устаревшие элементы

Из constants: `LegacyElementsTypesMap` (устаревший → актуальный) и `DeprecatedElementsTypes` (без замены).
Устаревший элемент остаётся в бандле (старые карты на него ссылаются) с `x-deprecated: true` и, если есть
замена, `x-replaced-by`; актуальный получает его в `x-deprecated-aliases`. Редактор: устаревший элемент в
политике — ошибка `schemas:check`, старые kind в картах при загрузке заменяются по `x-replaced-by`.

## Как находятся компоненты

Без путей и имён файлов: во всей программе lib ищутся вызовы `ComponentFactoryImpl` (по символу,
импорт под псевдонимом тоже). Имя — значение первого аргумента (член `ElementsTypes`), типы P и C —
аргументы типа вызова (явные или выведенные компилятором), поэтому файл с типами может называться
как угодно. `defaultProps` — литерал, который возвращает функция (ключи `[CONST]` сводятся).
Члены `ElementsTypes`, не ставшие ни элементом, ни компонентом, — `unclassified-type` в отчёте (`$catalog`).

## Правила стабильности

- Выход собирается только из типов `format.ts`; порядок ключей задаёт `canonical*`.
- Ломающее изменение формата — `FORMAT_VERSION + 1` и строка в CHANGELOG в `format.ts`.
- Что не выражено схемой — `x-ts-type` + запись в отчёте, пустых `{}` нет.

План и статус (генератор выполнен, далее — этап 3, потребление в blueprint-studio): [`../PLAN.md`](../PLAN.md).
