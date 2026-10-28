# Контент карточки элемента из атрибутов схемы [owner 2026-10-28]

Требование заказчика: карточка на канвасе отражает значения атрибутов (схема + политика),
а не зашитый вид. Механизм — слоты `card` в `editor-policy.json`: ключ атрибута → место на
карточке. Ветвлений по `kind` нет; новый слот — новое поле `card` + общая стратегия по типу
атрибута (§4a, §4b AGENTS.md).

## Сделано

| Слот       | Что рисует                             | Элементы                                                     |
| ---------- | -------------------------------------- | ------------------------------------------------------------ |
| `title`    | основной текст                         | все, кроме ac-user-picker, ac-address-asun                   |
| `subtitle` | вторая строка                          | list-item, widget-card, text-field, date, select             |
| `badge`    | бейдж (адресат)                        | comment                                                      |
| `icon`     | выбранная иконка (атрибут типа `icon`) | list-item `leftAtom`, widget-card, text-field, button `icon` |

Иконка: глиф — из локального набора фреймворка (`@local/framework-icons`), без него —
монограмма (`IconStub`, temporary-registry п. 8). Не выбрана — плейсхолдер вида.

## Можно показать (данные есть в схеме, нужен общий слот)

Предлагаемый слот `card.chips: [ключ…]` — чип по типу атрибута, без кода по kind:
`bool` → подпись атрибута, если true; `select/radio` → подпись варианта; `chips[]` →
подписи через запятую; `stringList` → значения; `optionList` → «N вариантов»; `number` → «подпись: N».

| Элемент                 | Кандидаты                                                        |
| ----------------------- | ---------------------------------------------------------------- |
| list-item               | `tertiaryText` (3-я строка), `linkHref` → маркер внешней ссылки  |
| widget-card             | `href` → маркер ссылки                                           |
| text-field              | `required` (*), `multiline`, `helperText`, `tooltipTextIcon` → ⓘ |
| alert                   | `variant` → цвет/иконка вида (info/warning/success/danger)       |
| date-range-field-picker | `required`, `disablePast` / `disableFuture`                      |
| attachment              | `validExtensions`, `maxFiles`, `multiple`, `required`            |
| checkbox                | `required`, `helperText`                                         |
| select                  | `options` (число/первые), `multiselect`, `required`              |
| radio-group             | `items` (число/первые), `required`                               |
| typography              | `variant` → чип «H1/body…» или размер шрифта заголовка           |
| button                  | `variant` + `color` → мини-превью кнопки                         |
| ac-configuration-item   | `ciTypes`, `multiple`, `required`                                |
| address                 | `city`, `showCurrentLocation`, `showLastAddress`, `required`     |
| все                     | `availability` (общий, chips[]) → чипы платформ                  |

## Нельзя / не имеет смысла

- ac-user-picker, ac-address-asun — нет текстового атрибута: заголовок — подпись вида.
- Поведенческие флаги (`filter`, `isReadonly`, `visible`, `disabled`, `disableCloseOnSelect`,
  `showFloor/Room/Area/Place`) — не вид элемента; максимум чип-маркер по решению владельца.
- Визуальные атрибуты (цвета, размеры, отступы) — пока нет в схемах (придут со схемами, §1).
- Ограничение карточки: размер фиксирован (FORM_STEP_LAYOUT) — 2 строки текста + ряд чипов;
  3-я строка/превью требуют решения по высоте.

Открытый вопрос владельцу: какие кандидаты включать и в каком виде (чип / маркер / превью).
