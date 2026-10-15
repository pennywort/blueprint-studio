# PR-03 `domain-service-graph-model`

| Поле                        | Значение                                       |
| --------------------------- | ---------------------------------------------- |
| Change id (папка)           | `openspec/changes/domain-service-graph-model/` |
| Capability (подсказка)      | `service-graph-model`                          |
| Номера для commit-сообщения | T-005, T-010, ADR-10, ADR-17                   |

## Карточка из плана

- **Цель:** вся предметная модель как Zod-схемы, независимая от React.
- **Состав:** T-005: 12 компонентов формы (discriminated union по `kind`), `ServiceGraph`, Scenario/SubScenario,
  FormStep/ApplicationForm, branded ID, константы (`ATTACHMENT_MAX_FILE_BYTES=3 МБ`, `…TOTAL=50 МБ`, `RADIO_MAX_OPTIONS=5`);
  T-010 (FormStep содержит components — устранение расхождения typecheck).
- **Источники:** `af8ba3e` (domain/model); `specs/001-foundation/spec.md` §5; `docs/business-requirements.md` §7–8.
- **Пути:** `src/domain/model/*`.
- **Критерии:** `tsc` strict зелёный; в `domain` нет react/zod-запрещённого по ADR-10 (zod разрешён только в model — следуй конституции §3).
- **Модель сразу финальная:** единый `CanvasElement` (ADR-17) вводится в PR-16, но ID-типы и `PageEntityId` — здесь.

## Где проверять по коду (grep в репозитории; спека описывает то, что реально есть)

`ServiceGraph`, `specs/001-foundation/spec.md`, `docs/business-requirements.md`, `src/domain/model/*`, `CanvasElement`, `PageEntityId`

---

Шаг закрыт, когда выполнено всё из INSTRUCTIONS §6.
