# PR-03 `domain-service-graph-model`

| Поле                                  | Значение                             |
| ------------------------------------- | ------------------------------------ |
| Режим                                 | **SLICE** (см. INSTRUCTIONS §5)      |
| Размер                                | M (2 сессии: CODE, затем DOCS+CLOSE) |
| Реальные коммиты в `legacy/pre-graft` | —                                    |

## Карточка из плана

- **Цель:** вся предметная модель как Zod-схемы, независимая от React.
- **Состав:** T-005: 12 компонентов формы (discriminated union по `kind`), `ServiceGraph`, Scenario/SubScenario,
  FormStep/ApplicationForm, branded ID, константы (`ATTACHMENT_MAX_FILE_BYTES=3 МБ`, `…TOTAL=50 МБ`, `RADIO_MAX_OPTIONS=5`);
  T-010 (FormStep содержит components — устранение расхождения typecheck).
- **Источники:** `af8ba3e` (domain/model); `specs/001-foundation/spec.md` §5; `docs/business-requirements.md` §7–8.
- **Пути:** `src/domain/model/*`.
- **Критерии:** `tsc` strict зелёный; в `domain` нет react/zod-запрещённого по ADR-10 (zod разрешён только в model — следуй конституции §3).
- **Модель сразу финальная:** единый `CanvasElement` (ADR-17) вводится в PR-16, но ID-типы и `PageEntityId` — здесь.

---

Готово, только когда выполнено всё из INSTRUCTIONS §7 (Definition of Done).
