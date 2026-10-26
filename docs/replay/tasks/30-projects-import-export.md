# Задача 30 — Проекты: список, создание, импорт и экспорт JSON

| Поле                         | Значение                 |
| ---------------------------- | ------------------------ |
| change id                    | `projects-import-export` |
| Эпик                         | 002                      |
| Номера (T-xxx / ADR / D / R) | T-053                    |
| Реальные коммиты (справка)   | 320b9a4                  |

## Цель

Пользователь управляет проектами и обменивается картами файлом.

## Состав (что реализовано и должно попасть в change)

- Главная: список сохранённых проектов, «Создать проект», удаление
- Порт IGraphFileCodec + JsonGraphFileCodec (те же миграции, что у хранилища)
- «Загрузить из JSON» с выбором при конфликте id (заменить / как копию); «Экспорт JSON» с карточки и из редактора
- Формат файла проекта — документ

## Где проверять по коду

- `src/application/ports/graph-file-codec.ts`
- `src/infrastructure/persistence/json-graph-file-codec.ts`
- `src/presentation/pages/project-list/ProjectListPage.tsx`
- `src/presentation/features/projects/project-file.ts`
- `docs/формат-файла-проекта.md`
