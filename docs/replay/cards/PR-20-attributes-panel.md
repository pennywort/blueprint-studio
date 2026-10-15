# PR-20 `attributes-panel`

| Поле                                  | Значение                             |
| ------------------------------------- | ------------------------------------ |
| Режим                                 | **SLICE** (см. INSTRUCTIONS §5)      |
| Размер                                | L (2 сессии: CODE, затем DOCS+CLOSE) |
| Реальные коммиты в `legacy/pre-graft` | —                                    |

## Карточка из плана

- **Состав:** T-040 `PropertyEditorRegistry` (text, stringList, bool, number, radio, select, optionList, linkList),
  T-041 рендерер панели по схеме `IElementSchemaProvider` + мета D4 (секции «Тип»/«Настройки», условная видимость, «Комментарий для разработчика»),
  stub-схемы List item/Widget card (`page-element-manifest.json`), буфер ввода 300 мс, T-067 инспектор сложной логики. Правая панель — только для элементов (D10).
- **Источники:** `2cdd042`, `6926e8c`, `f1d4e77`; `docs/пример-схемы-элемента.json`.
- **Не входит:** T-042 (IconPicker, AttachmentField, DeviceUrlMapEditor) и полные схемы List item/Widget card/FAQ — отложено владельцем до появления схем.

---

Готово, только когда выполнено всё из INSTRUCTIONS §7 (Definition of Done).
