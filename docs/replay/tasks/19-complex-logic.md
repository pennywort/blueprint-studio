# Задача 19 — «Сложная логика»: условная видимость элементов

| Поле                         | Значение                                                       |
| ---------------------------- | -------------------------------------------------------------- |
| change id                    | `complex-logic`                                                |
| Эпик                         | 002                                                            |
| Номера (T-xxx / ADR / D / R) | T-037, T-060, T-061, T-062, T-063, T-064, T-065, T-066, ADR-14 |
| Реальные коммиты (справка)   | 7e7ecee, 029d9d2, eb05cdd                                      |

## Цель

Если выбран вариант Select = X — показать связанные элементы.

## Состав (что реализовано и должно попасть в change)

- LogicRule / LogicCondition, флаг логики на источнике
- evaluateVisibility с каскадом
- Инварианты L-I1…L-I6 (L-I7 «одно правило на цель» — временно)
- Команды Enable/DisableComplexLogic, Add/RemoveLogicRule, каскад удаления
- Рёбра логики от вариантов Select, handles вариантов; цели — элементы того же шага (ADR-14)

## Не входит (не описывать)

- Бейдж «Скрыт в предпросмотре» — удалён. Инспектор логики — задача attributes-panel.

## Где проверять по коду

- `src/domain/model/logic-rule.ts`
- `src/domain/logic-visibility.ts`
- `src/domain/invariants/logic-rules.ts`
- `src/application/commands/add-logic-rule.ts`
- `docs/дизайн-сложная-логика.md`
