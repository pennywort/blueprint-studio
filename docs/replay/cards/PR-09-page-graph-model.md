# PR-09 `page-graph-model`

| Поле                        | Значение                             |
| --------------------------- | ------------------------------------ |
| Change id (папка)           | `openspec/changes/page-graph-model/` |
| Capability (подсказка)      | `service-graph-model`                |
| Номера для commit-сообщения | T-004, D13, D2                       |

## Карточка из плана

- **Состав:** T-004 (эпик 002): страницы (Главная, подсценарии, формы) — верхнеуровневые сущности ServiceGraph (D13),
  персистентный `orderIndex` (в т.ч. у `ApplicationForm`), `PageLink {sourceElementId → targetId}`, координат нет (D2),
  `PageEntityId`.
- **Источники:** `a3deb1a`, `54579b7` (часть про `ApplicationForm.orderIndex`).
- **Пути:** `src/domain/model/{scenario,page-link,service-graph}.ts`, `graph-walk.ts`.

## Где проверять по коду (grep в репозитории; спека описывает то, что реально есть)

`orderIndex`, `ApplicationForm`, `PageLink {sourceElementId → targetId}`, `PageEntityId`, `ApplicationForm.orderIndex`, `src/domain/model/{scenario,page-link,service-graph}.ts`, `graph-walk.ts`

---

Шаг закрыт, когда выполнено всё из INSTRUCTIONS §6.
