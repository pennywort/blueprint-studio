# PR-07 `editor-theme-system`

| Поле                                  | Значение                         |
| ------------------------------------- | -------------------------------- |
| Режим                                 | **LEGACY** (см. INSTRUCTIONS §5) |
| Размер                                | S (1 сессия: CODE+DOCS+CLOSE)    |
| Реальные коммиты в `legacy/pre-graft` | b2dfd1e (xyflow), cd920b6 (тема) |

## Карточка из плана

- **Состав:** T-010/T-011: объект темы по механике MUI v4 (palette, overrides, `EditorThemeProvider`, `useEditorTheme`,
  токены `theme.editor.canvas`), стилизация react-flow (background, controls, minimap) только токенами (D6), запрет hex в компонентах.
  Установка `@xyflow/react` 12.12.0 (ADR-03).
- **Источники:** `cd920b6`, `b2dfd1e`; D6.
- **Пути:** `src/presentation/theme/*`, `react-flow-theme-styles.ts`.
- **Критерии:** цвета только из темы; `npm run rules` не находит hex.
- **Потом внутри этого PR сворачиваются:** добавления токенов (рамка выделения, цвет ошибки, стрелка) — они вводятся тут сразу итоговыми.

---

Готово, только когда выполнено всё из INSTRUCTIONS §7 (Definition of Done).
