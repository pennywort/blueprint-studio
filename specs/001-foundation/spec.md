//specs/001-foundation/spec.md

# 001-foundation — Спецификация: Фундамент

> **Эпик:** 0 (Фундамент) · **Статус:** утверждено к реализации
> **Конституция:** `../000-constitution.md` — обязательна, приоритет выше этого документа.

---

## 1. Контекст

Строим blueprint-studio — редактор архитектурных карт микроприложений (см. конституцию, раздел 1). Этот эпик создаёт несущий каркас, на котором всё остальное строится: проект, слои, доменную модель, инварианты, шину команд. **Никакого canvas-UI в этом эпике нет** — он эпик 002.

## 2. Цели эпика

1. Рабочий скелет приложения: Rsbuild + React + TS strict, собирается, запускается, показывает три страницы-заглушки.
2. Четырёхслойная структура с линтером границ — нарушение слоёв невозможно закоммитить.
3. Полная доменная модель `ServiceGraph` (zod-схемы + типы) по разделу 5 этой спеки.
4. Все доменные инварианты (конституция, раздел 4) как чистые функции + тесты.
5. Порт `IElementSchemaProvider` + stub-адаптер с JSON-манифестом 12 типов компонентов (заполнен по разделу 5 этой спеки — НЕ по выдумке).
6. Шина команд application-слоя с do/undo-патчами (Immer) + тесты.
7. Composition root (Awilix, PROXY) с зарегистрированными stub-адаптерами.

## 3. Non-goals (явно НЕ входит — агенту запрещено это делать)

- Canvas, reactflow, узлы-заглушки, pan/zoom — эпик 002.
- Drawer атрибутов, TreeView, clipboard — эпик 002/003.
- Workflow-статусы, XState, роли — эпик 004.
- Персистентность (IndexedDB), версионирование, экспорт файлов — эпик 004.
- Реальный адаптер к пакету `element-schemas` из lib-app-core — отдельная задача после получения доступа к пакету. В этом эпике — stub с манифестом в репозитории.
- Любая интеграция с Flamingo сверх установки пакетов и проверки импорта одного компонента на странице-заглушке (smoke test темы).

## 4. Критерии приёма эпика

1. `npm run dev` поднимает приложение; видны 3 роута-заглушки: `/` (список проектов), `/editor`, `/preview` — каждая рендерит Flamingo-компонент (например, типографику/кнопку) без ошибок консоли.
2. `npm run lint && npm run test && npm run build` — зелёные.
3. Тесты инвариантов покрывают КАЖДОЕ правило из конституции раздел 4 (минимум по 2 кейса: валидный и нарушающий).
4. Тесты шины команд: execute применяет изменение, undo возвращает состояние в точности (`toEqual`), redo повторяет.
5. boundaries-линтер: демонстрационная попытка импорта React в `domain` (временный файл) ловится линтером; файл удалён, правило осталось.
6. Манифест элементов валидируется zod-схемой при загрузке; контрактный тест: сломанный манифест → понятная ошибка валидации.

## 5. Доменная модель — источник истины для этого эпика

Агент НЕ имеет доступа к Confluence. Всё необходимое — ниже. Транскрибировать точно; вопросы — владельцу (протокол П2).

### 5.1 Граф сервиса

```
ServiceGraph
├── homePage: HomePage (ровно 1)
│   ├── listItems: ListItem[]
│   ├── widgetCards: WidgetCard[]
│   ├── faq?: Faq
│   └── additionalInfo?: AdditionalInfo
├── subScenarios: SubScenario[]
│   ├── listItems: ListItem[]
│   ├── faq?: Faq
│   └── additionalInfo?: AdditionalInfo
└── applicationForms: ApplicationForm[]
    └── steps: FormStep[] (упорядоченные, неограниченно)
        └── components: FormComponent[] (discriminated union, 12 типов, см. 5.4)
```

### 5.2 Элементы главной страницы

| Сущность         | Атрибуты                                                                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `ListItem`       | `title: string`, `secondaryText?: string`, `icon?: IconRef`, `isRedirect?: boolean`, `redirectUrl?: string`                                 |
| `WidgetCard`     | `title: string`, `secondaryText?: string`, `icon?: IconRef`, `image?: ImageRef`, `isRedirect?: boolean`, `redirectUrl?: string`             |
| `Faq`            | `questions: FaqQuestion[]` (`{ question: string, answer: string }`), `tags?: string[]`, `autoSearch?: boolean` (актуально при >10 вопросов) |
| `AdditionalInfo` | `text: string`, `links: HotLink[]` (`{ label: string, url: string, kind?: string }`), `icons?: IconRef[]`, `segments?: string[]`            |

### 5.3 Сценарии

```typescript
type ScenarioType = "application" | "link" | "navigation";

type Scenario = {
	id: string;
	type: ScenarioType;
	title: string; // required
	description?: string;
	icon?: IconRef;
	infoBlock?: { content: string; position: "right" }; // только для navigation
	link?: { domain?: string; url: string; device?: string }; // только для link
	children?: Scenario[]; // только для navigation, вложенность не ограничена
	applicationFormId?: string; // только для application — ссылка на ApplicationForm
};
```

Инвариант формы (добавить к списку тестов): поля `infoBlock`/`link`/`children`/`applicationFormId` допустимы только при соответствующем `type`.

### 5.4 Компоненты формы (12 типов, discriminated union по `kind`)

| kind                            | Атрибуты                                                                                                                                          | Ограничения                                                             |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `textField` (1.1)               | `label`, `required`, `multiline`, `maxLength`, `placeholder`, `caption`, `tooltip`                                                                | multiline → auto-expand (UI-заметка, не домен)                          |
| `infoBlock` (1.2)               | `text`, `links: MarkdownLink[]`                                                                                                                   | без картинок, один цвет                                                 |
| `datePeriod` (1.3)              | `label`, `required`, `withTime`, `restrictions: { noPast?: boolean, noFuture?: boolean }`, `customLogic?: string`                                 | DateRange: каждая дата настраивается отдельно                           |
| `attachment` (1.4)              | `label`, `required`, `allowedTypes: string[]`                                                                                                     | ОДНО поле на форму; лимиты 3 МБ/файл, 50 МБ суммарно — константы домена |
| `checkbox` (1.5)                | `label`, `required`                                                                                                                               | одиночный                                                               |
| `configurationItemPicker` (1.6) | `label`, `required`, `multiSelect`, `ciTypes: string[]`, `disabled`, `tooltip`, `emptyResult`, `helperText`, `disableCloseOnSelect`               | источник — серверный справочник                                         |
| `employeeSearch` (1.7)          | `label`, `required`, `searchType: 'colleagues' \| 'all'`                                                                                          | автокомплит                                                             |
| `selectList` (1.8)              | `label`, `required`, `displayType: 'radio' \| 'dropdown' \| 'list'`, `multiSelect`, `options: { label, value, isDefault? }[]`, `search?: boolean` | radio → max 5 options                                                   |
| `typography` (1.9)              | `label`, `displayType: 'heading'`                                                                                                                 | —                                                                       |
| `button` (2.0)                  | `label`, `displayType: 'text' \| 'secondary'`, `position: 'inline' \| 'standalone'`                                                               | —                                                                       |
| `addressPicker` (2.1)           | `label`, `required`, `displayParts: ('floor' \| 'room' \| 'zone' \| 'workplace')[]`                                                               | имя-заглушка, см. глоссарий                                             |
| `employeeLoginField` (2.2)      | `label`, `required`, `isHidden?: boolean`                                                                                                         | имя-заглушка, см. глоссарий                                             |

Общие поля каждого компонента: `id: string`, `kind`, `comment?: string` (комментарий для разработчика, US-05), `complexLogic?: string` (US-04).

### 5.5 Манифест элементов (stub для IElementSchemaProvider)

JSON-файл `infrastructure/element-schemas/element-manifest.json`: массив из 12 записей, каждая:

```json
{
	"kind": "textField",
	"version": 1,
	"attributes": [
		{ "key": "label", "type": "text", "required": true },
		{ "key": "required", "type": "bool", "required": false },
		{ "key": "maxLength", "type": "number", "required": false }
	]
}
```

Типы атрибутов манифеста: `bool | text | number | radio | select | stringList`. Заполняется СТРОГО по таблице 5.4. Когда появится доступ к реальному пакету `element-schemas` — манифест заменяется адаптером, внутренний формат (`ElementSchema`) не меняется.

## 6. Открытые вопросы эпика (НЕ блокируют, отвечает владелец)

| #   | Вопрос                                                         | Кому                        |
| --- | -------------------------------------------------------------- | --------------------------- |
| Q1  | Peer deps Flamingo 4.9.17 ↔ React 19 (результат T-000)         | владелец + агент (проверка) |
| Q2  | Официальные англ. имена для addressPicker / employeeLoginField | команда lib-app-core        |
| Q3  | Формат и версионирование реального пакета element-schemas      | команда lib-app-core        |
| Q4  | Есть ли формальная схема MicroAppDescriptor у движка           | команда lib-app-core        |