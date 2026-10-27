# Номера задач и связей для commit-сообщений

Формат (commitlint: conventional, по-русски):

```
docs(openspec): <change-id> — <суть> (задача NN)

Задачи: <T-xxx, …>; решения: <ADR-xx, D-x, R-…>
```

| №   | change id                           | Задача                                                   | Номера                                                         |
| --- | ----------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------- |
| 01  | `bootstrap-project-tooling`         | Каркас приложения и инженерные гейты                     | T-001, T-002, ADR-01, ADR-08, ADR-09, ADR-10                   |
| 02  | `ui-kit-mui-v4`                     | UI-кит редактора: MUI v4 и таблица иконок                | T-003                                                          |
| 03  | `domain-service-graph-model`        | Доменная модель ServiceGraph                             | T-005, T-010, ADR-10, ADR-17                                   |
| 04  | `domain-invariants`                 | Доменные инварианты и validateGraph                      | T-006                                                          |
| 05  | `ports-and-adapters`                | Порты application и базовые адаптеры                     | T-007, ADR-07, D3                                              |
| 06  | `command-bus-di-container`          | CommandBus и DI-контейнер                                | T-008, T-009, ADR-04, ADR-05, R-ARC-1, R-ARC-2                 |
| 07  | `editor-theme-system`               | Тема редактора и стилизация react-flow                   | T-010, T-011, ADR-03, D6                                       |
| 08  | `editor-page-shell`                 | Каркас страницы редактора                                | T-020, T-021, T-022, T-023, T-024                              |
| 09  | `page-graph-model`                  | Страницы и навигационные связи в модели                  | T-004, D2, D13, R-SCH-7                                        |
| 10  | `canvas-commands`                   | Команды редактирования графа                             | T-035                                                          |
| 11  | `canvas-layered-layout`             | Адаптер graph↔flow и слоистая раскладка                  | T-030, T-036, ADR-11, D7, D13                                  |
| 12  | `canvas-nodes-and-elements`         | Узлы канваса и карточки элементов                        | T-031                                                          |
| 13  | `canvas-links-and-connection-rules` | Связи между блоками, элементами и слоями                 | T-032, ADR-13, ADR-14, R1, R-CFG-2                             |
| 14  | `canvas-add-remove-blocks`          | Добавление и удаление блоков, уровни                     | T-034, ADR-11, ADR-19                                          |
| 15  | `canvas-selection-deletion`         | Единое выделение и удаление                              | ADR-12, R-PERF                                                 |
| 16  | `editor-hotkeys-clipboard`          | Горячие клавиши и буфер обмена элементов                 | R-HK                                                           |
| 17  | `canvas-universal-elements-dnd`     | Универсальные элементы и drag-and-drop                   | ADR-16, ADR-17                                                 |
| 18  | `editor-rules-as-data`              | Правила редактора — данные, а не if                      | ADR-20, R-CFG-1, R-CFG-2, R-CFG-5, R-CFG-6                     |
| 19  | `complex-logic`                     | «Сложная логика»: условная видимость элементов           | T-037, T-060, T-061, T-062, T-063, T-064, T-065, T-066, ADR-14 |
| 20  | `form-steps-layout`                 | Шаги формы заявки как слой с колонками                   | ADR-16, D1                                                     |
| 21  | `form-step-transitions`             | Переходы между шагами и ветвление шагов                  | ADR-18                                                         |
| 22  | `element-schema-generator`          | Генератор JSON-схем элементов из кода фреймворка         | R-SCH                                                          |
| 23  | `framework-element-schemas`         | Элементы карты по схемам фреймворка и политике редактора | R-SCH, ADR-07                                                  |
| 24  | `attributes-panel`                  | Schema-driven панель атрибутов                           | T-040, T-041, T-067, D4, D10                                   |
| 25  | `attribute-extensions`              | Надстройки проекта над схемой атрибутов                  | R-SCH                                                          |
| 26  | `editor-settings-registry`          | Реестр настроек: администратор и пользователь            | ADR-21, R-ADM-1, R-ADM-4, R-CFG-9                              |
| 27  | `violation-highlighting`            | Подсветка нарушений инвариантов                          | T-043                                                          |
| 28  | `canvas-search`                     | Поиск по канвасу                                         | T-050, D5                                                      |
| 29  | `graph-persistence`                 | Сохранение карты в браузере                              | T-052, T-053                                                   |
| 30  | `projects-import-export`            | Проекты: список, создание, импорт и экспорт JSON         | T-053                                                          |
| 31  | `canvas-performance`                | Производительность канваса на больших картах             | R2, R-PERF                                                     |
| 32  | `canvas-architecture-refactor`      | Состояние редактора разрезано на хуки                    | R3, R4                                                         |
| 33  | `comment-elements`                  | Комментарии для разработчика                             | —                                                              |
| 34  | `canvas-multi-select-clipboard`     | Мультивыделение элементов и копирование группы           | ADR-12, R-HK                                                   |
