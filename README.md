# blueprint-studio

Автономное React-приложение — визуальный редактор архитектурных карт (`ServiceBlueprint`) для микроприложений на движке lib-app-core. Выходной артефакт — версионируемый JSON.

> Главный документ проекта — [specs/000-constitution.md](specs/000-constitution.md). При конфликте любой другой спеки с конституцией побеждает конституция.

## Запуск

```bash
npm install
npm run dev      # dev-сервер
npm run test     # unit-тесты (Vitest)
npm run lint     # ESLint + tsc --noEmit
npm run build    # production-сборка (Rsbuild)
```

Требования: Node.js 22+, npm 10+. Все пакеты — из публичного npm.

## Структура слоёв

```
src/
├── domain/          # чистый TS: модель (zod-схемы) и инварианты. Ноль внешних импортов
├── application/     # порты (интерфейсы) и команды (CommandBus, use-cases)
├── infrastructure/  # адаптеры портов + composition root (Awilix, PROXY)
└── presentation/    # React: pages, features, widgets
```

Правила зависимостей между слоями проверяются ESLint (`eslint-plugin-boundaries`) — нарушение не проходит lint. Подробности: конституция, раздел 3.

## Ключевые концепции

- **Любое действие пользователя — команда application-слоя** (`Command`), выполняемая через `CommandBus` с патчами Immer (`produceWithPatches`) — это же основа undo/redo.
- **Внешние контракты — только за портами** (`application/ports`): схемы элементов, генератор id, часы, будущие хранилище и экспорт.
- **DI-контейнер один**, создаётся явно `buildContainer()` в `bootstrap.tsx` (Awilix, `InjectionMode.PROXY`).

## Документация

- `specs/000-constitution.md` — конституция проекта (высший приоритет)
- `specs/001-foundation/spec.md` — спецификация эпика Foundation
- `docs/business-requirements.md` — бизнес-требования (БТ МИП Native)
- `docs/host-app-architecture.md` — вырезка из архитектуры хост-приложения
- `docs/handoff.md` — исторический handoff с описанием состояния и плана эпиков
