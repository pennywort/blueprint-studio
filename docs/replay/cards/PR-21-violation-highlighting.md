# PR-21 `violation-highlighting`

| Поле                        | Значение                                   |
| --------------------------- | ------------------------------------------ |
| Change id (папка)           | `openspec/changes/violation-highlighting/` |
| Capability (подсказка)      | `violations`                               |
| Номера для commit-сообщения | T-043                                      |

## Карточка из плана

- **Состав:** T-043: `validateGraph` после каждой команды → `mapViolationsToCanvas` (path → узел/элемент), рамка цвета ошибки,
  бейдж с тултипом (`violation-markers.ts`, `violation-badge.tsx`); одна рамка вместо двух.
- **Источники:** `dacf61f`, `2d11634`.
- **Открытый вопрос (не решать в PR):** команды сейчас жёстко отклоняют нарушения, подсветка видна только для внешних графов.

## Где проверять по коду (grep в репозитории; спека описывает то, что реально есть)

`validateGraph`, `mapViolationsToCanvas`, `violation-markers.ts`, `violation-badge.tsx`

---

Шаг закрыт, когда выполнено всё из INSTRUCTIONS §6.
