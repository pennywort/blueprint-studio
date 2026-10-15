# PR-01 `bootstrap-project-tooling`

| Поле                                  | Значение                                                              |
| ------------------------------------- | --------------------------------------------------------------------- |
| Режим                                 | **LEGACY** (см. INSTRUCTIONS §5)                                      |
| Размер                                | M (2 сессии: CODE, затем DOCS+CLOSE)                                  |
| Реальные коммиты в `legacy/pre-graft` | af8ba3e (конфиги, bootstrap, роутер, eslint, husky), 3529985 (README) |

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

---

Готово, только когда выполнено всё из INSTRUCTIONS §7 (Definition of Done).
