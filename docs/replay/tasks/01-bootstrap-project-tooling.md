# Задача 01 — Каркас приложения и инженерные гейты

| Поле                         | Значение                                     |
| ---------------------------- | -------------------------------------------- |
| change id                    | `bootstrap-project-tooling`                  |
| Эпик                         | 001                                          |
| Номера (T-xxx / ADR / D / R) | T-001, T-002, ADR-01, ADR-08, ADR-09, ADR-10 |
| Реальные коммиты (справка)   | af8ba3e (часть), 3529985                     |

## Цель

Запускаемый каркас приложения и гейты качества, которые нельзя обойти коммитом.

## Состав (что реализовано и должно попасть в change)

- Rsbuild 2.2 + React 19 + TypeScript strict, точные версии зависимостей (.npmrc)
- Hash-роутинг (createHashRouter) и страницы-заглушки `/`, `/editor`, `/preview`
- Динамический import в index.tsx, никаких записей в window, относительные пути (гигиена встраиваемости, конституция §7)
- ESLint flat + eslint-plugin-boundaries: 4 слоя domain → application → infrastructure → presentation
- Prettier, Husky, commitlint (conventional по-русски), lint-staged; проверки lint + build

## Не входит (не описывать)

- Module Federation (не настроен — открытый вопрос). Инфраструктура агентов (.claude, .qwen, scripts/agent).

## Где проверять по коду

- `package.json`
- `rsbuild.config.ts`
- `tsconfig.json`
- `eslint.config.js`
- `commitlint.config.js`
- `src/index.tsx`
- `src/bootstrap.tsx`
- `src/presentation/app/App.tsx`
