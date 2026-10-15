# Сущности канваса × возможности (карта техдолга)

> [owner 2026-10-15] Принцип — AGENTS.md §4a: сущность = данные (zod + union по `kind`),
> возможность = чистая функция/хук, различия — параметры. Наследования нет.
> ✅ — общее ядро; ❌ — параллельные механизмы (кандидат на объединение по решению владельца).

Сущности: **блок** (Главная, подсценарий, форма заявки — `PageEntry` в `domain/graph-walk.ts`),
**шаг формы** (живёт только в форме; связи — только внутри своей формы),
**элемент** (карточка в блоке или шаге — `ElementContainer` в `domain/element-containers.ts`).

| Возможность           | Блок                                                      | Шаг формы                                          | Элемент                                         | Статус                                                            |
| --------------------- | --------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------- |
| Уровни (колонки)      | `domain/graph-depths.ts`                                  | `domain/form-step-depths.ts`                       | `domain/step-element-depths.ts`                 | ✅ ядро `domain/layer-depths.ts`                                  |
| Допустимые цели связи | `domain/connection-rules.ts`                              | то же (scope — своя форма)                         | то же (scope — свой шаг)                        | ✅                                                                |
| Контейнер элементов   | `walkElementContainers`                                   | то же                                              | —                                               | ✅                                                                |
| Каскад размещения     | `commands/layer-placement.ts`                             | `commands/step-placement.ts`                       | —                                               | ❌ «те же правила» дважды                                         |
| Перенос / порядок     | `commands/reorder-in-layer.ts`, `set-page-layer-depth.ts` | `commands/move-form-step.ts`, `swap-form-steps.ts` | `commands/move-element.ts`                      | ❌                                                                |
| DnD                   | react-flow (узлы)                                         | HTML5, `canvas/step-dnd.ts`                        | HTML5, `canvas/element-dnd.ts`                  | ❌                                                                |
| Выделение             | `selectedNodeId`                                          | `selectedStepId`                                   | `selectedElementId` (`canvas/use-selection.ts`) | ❌ три id вместо `{kind, id}`                                     |
| Рамка состояния       | `.react-flow__node.selected` (theme), `dropTarget`        | `stepSelected`, `dropTarget`                       | `cardSelected`, `cardInvalid`                   | ❌ + цель связи — `outline` handle (`react-flow-theme-styles.ts`) |

Целевое состояние для ❌: одно ядро с параметром-различием (scope / рёбра); для рамки —
одно значение `'connect-target' | 'drop-target' | 'selected' | 'invalid' | null`
с приоритетом в этом порядке и одной геометрией.
