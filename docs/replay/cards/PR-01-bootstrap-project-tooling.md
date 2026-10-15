# PR-01 `bootstrap-project-tooling`

| Поле                        | Значение                                      |
| --------------------------- | --------------------------------------------- |
| Change id (папка)           | `openspec/changes/bootstrap-project-tooling/` |
| Capability (подсказка)      | `bootstrap-tooling`                           |
| Номера для commit-сообщения | T-001, T-002, ADR-08, ADR-10                  |

## Карточка из плана

- **Цель:** запускаемый каркас приложения и гейты качества, нарушить которые нельзя закоммитить.
- **Состав:** T-001/T-002 foundation: Rsbuild 2.2 + React 19 + TS strict, `createHashRouter` (ADR-08), 3 роута-заглушки
  (`/`, `/editor`, `/preview`), динамический import в `index.tsx` (MF-гигиена, конституция §7), ESLint flat +
  `eslint-plugin-boundaries` (4 слоя, ADR-10), Prettier, Husky, commitlint, lint-staged, точные версии (`.npmrc`).
- **Источники:** `af8ba3e` (часть), `3529985`; спека `specs/001-foundation` §2 п.1–2, §4 п.1, 5.
- **Пути:** `package.json`, `rsbuild.config.ts`, `tsconfig.json`, `eslint.config.js`, `.husky/`, `commitlint.config.js`,
  `src/index.tsx`, `src/bootstrap.tsx`, `src/presentation/app/App.tsx`.
- **Критерии:** `npm run dev` показывает 3 роута; `lint`+`build` зелёные; демо-импорт React в `domain` ловится линтером.
- **Не входит:** Module Federation (не настроен до сих пор — §4.2 NOT DONE).

## Где проверять по коду (grep в репозитории; спека описывает то, что реально есть)

`createHashRouter`, `/`, `/editor`, `/preview`, `index.tsx`, `eslint-plugin-boundaries`, `.npmrc`, `specs/001-foundation`, `package.json`, `rsbuild.config.ts`, `tsconfig.json`, `eslint.config.js`, `.husky/`, `commitlint.config.js`

---

Шаг закрыт, когда выполнено всё из INSTRUCTIONS §6.
