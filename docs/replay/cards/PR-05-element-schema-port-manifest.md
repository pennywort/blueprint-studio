# PR-05 `element-schema-port-manifest`

| Поле                        | Значение                                         |
| --------------------------- | ------------------------------------------------ |
| Change id (папка)           | `openspec/changes/element-schema-port-manifest/` |
| Capability (подсказка)      | `element-schemas`                                |
| Номера для commit-сообщения | T-007, ADR-07, D3                                |

## Карточка из плана

- **Состав:** T-007: порты `IElementSchemaProvider`/`IIdGenerator`/`IClock`, `ManifestSchemaProvider` (JSON-манифест из
  12 записей, Zod-валидация на старте, `SchemaNotFoundError`), `UuidIdGenerator`, `SystemClock` (ADR-07, D3).
- **Пути:** `src/application/ports/*`, `src/infrastructure/element-schemas/element-manifest.json`, `src/infrastructure/misc/*`.
- **Критерии:** сломанный манифест → понятная ошибка при старте; граница application→infrastructure только через порты.

## Где проверять по коду (grep в репозитории; спека описывает то, что реально есть)

`IElementSchemaProvider`, `IIdGenerator`, `ManifestSchemaProvider`, `SchemaNotFoundError`, `UuidIdGenerator`, `SystemClock`, `src/application/ports/*`, `src/infrastructure/element-schemas/element-manifest.json`, `src/infrastructure/misc/*`

---

Шаг закрыт, когда выполнено всё из INSTRUCTIONS §6.
