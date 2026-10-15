# PR-02 `ui-kit-flamingo-shims`

| Поле                                  | Значение                         |
| ------------------------------------- | -------------------------------- |
| Режим                                 | **LEGACY** (см. INSTRUCTIONS §5) |
| Размер                                | S (1 сессия: CODE+DOCS+CLOSE)    |
| Реальные коммиты в `legacy/pre-graft` | 3feb1ce                          |

## Карточка из плана

- **Цель:** UI только из `@blueprint-vendor/*`, пока недоступен внутренний registry.
- **Состав:** шимы `vendor/flamingo/*` (реэкспорты MUI v4 4.12.4), polyfill `findDOMNode` для React 19,
  `legacy-peer-deps`, smoke-страница (Typography, шрифты BPSans), запрет `@material-ui/*` в `src`, реестр подмен
  `docs/temporary-registry.md`.
- **Источники:** `3feb1ce`, `4ff54c3`; T-003 smoke (Flamingo).
- **Пути:** `vendor/`, `package.json`, `.npmrc`, `docs/temporary-registry.md`.
- **Критерии:** страница рендерит Flamingo-компонент со стилями; `grep @material-ui src` пуст.
- **Замечание:** шимы дополняются реэкспортами и дальше — по мере нужд PR-08, 20 (добавляй недостающее в тот PR, где понадобилось).

---

Готово, только когда выполнено всё из INSTRUCTIONS §7 (Definition of Done).
