# PR-20 `attributes-panel`

| Поле                        | Значение                             |
| --------------------------- | ------------------------------------ |
| Change id (папка)           | `openspec/changes/attributes-panel/` |
| Capability (подсказка)      | `attributes-panel`                   |
| Номера для commit-сообщения | T-040, T-041, T-067, T-042, D4, D10  |

## Карточка из плана

- **Состав:** T-040 `PropertyEditorRegistry` (text, stringList, bool, number, radio, select, optionList, linkList),
  T-041 рендерер панели по схеме `IElementSchemaProvider` + мета D4 (секции «Тип»/«Настройки», условная видимость, «Комментарий для разработчика»),
  stub-схемы List item/Widget card (`page-element-manifest.json`), буфер ввода 300 мс, T-067 инспектор сложной логики. Правая панель — только для элементов (D10).
- **Источники:** `2cdd042`, `6926e8c`, `f1d4e77`; `docs/пример-схемы-элемента.json`.
- **Не входит:** T-042 (IconPicker, AttachmentField, DeviceUrlMapEditor) и полные схемы List item/Widget card/FAQ — отложено владельцем до появления схем.

## Где проверять по коду (grep в репозитории; спека описывает то, что реально есть)

`PropertyEditorRegistry`, `IElementSchemaProvider`, `page-element-manifest.json`, `docs/пример-схемы-элемента.json`

---

Шаг закрыт, когда выполнено всё из INSTRUCTIONS §6.
