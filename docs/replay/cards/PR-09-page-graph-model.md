# PR-09 `page-graph-model`

| Поле                                  | Значение                                                     |
| ------------------------------------- | ------------------------------------------------------------ |
| Режим                                 | **SLICE** (см. INSTRUCTIONS §5)                              |
| Размер                                | S (1 сессия: CODE+DOCS+CLOSE)                                |
| Реальные коммиты в `legacy/pre-graft` | a3deb1a — только как справка: модель позже изменена (ADR-17) |

## Карточка из плана

- **Состав:** T-004 (эпик 002): страницы (Главная, подсценарии, формы) — верхнеуровневые сущности ServiceGraph (D13),
  персистентный `orderIndex` (в т.ч. у `ApplicationForm`), `PageLink {sourceElementId → targetId}`, координат нет (D2),
  `PageEntityId`.
- **Источники:** `a3deb1a`, `54579b7` (часть про `ApplicationForm.orderIndex`).
- **Пути:** `src/domain/model/{scenario,page-link,service-graph}.ts`, `graph-walk.ts`.

---

Готово, только когда выполнено всё из INSTRUCTIONS §7 (Definition of Done).
