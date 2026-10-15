# PR-05 `element-schema-port-manifest`

| Поле                                  | Значение                              |
| ------------------------------------- | ------------------------------------- |
| Режим                                 | **LEGACY** (см. INSTRUCTIONS §5)      |
| Размер                                | S (1 сессия: CODE+DOCS+CLOSE)         |
| Реальные коммиты в `legacy/pre-graft` | af8ba3e (порты, манифест, uuid/clock) |

## Карточка из плана

- **Состав:** T-007: порты `IElementSchemaProvider`/`IIdGenerator`/`IClock`, `ManifestSchemaProvider` (JSON-манифест из
  12 записей, Zod-валидация на старте, `SchemaNotFoundError`), `UuidIdGenerator`, `SystemClock` (ADR-07, D3).
- **Пути:** `src/application/ports/*`, `src/infrastructure/element-schemas/element-manifest.json`, `src/infrastructure/misc/*`.
- **Критерии:** сломанный манифест → понятная ошибка при старте; граница application→infrastructure только через порты.

---

Готово, только когда выполнено всё из INSTRUCTIONS §7 (Definition of Done).
