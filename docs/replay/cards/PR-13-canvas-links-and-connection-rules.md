# PR-13 `canvas-links-and-connection-rules`

| Поле                        | Значение                                              |
| --------------------------- | ----------------------------------------------------- |
| Change id (папка)           | `openspec/changes/canvas-links-and-connection-rules/` |
| Capability (подсказка)      | `canvas-links`                                        |
| Номера для commit-сообщения | T-032, ADR-14, ADR-13, R1                             |

## Карточка из плана

- **Цель:** пользователь связывает элемент одного уровня с блоком следующего; правила допустимости — единые и доменные.
- **Состав:** T-032 (создание связи протягиванием и кликом, reconnect, удаление, smoothstep-рёбра со стрелкой);
  R1 — единое правило `connectableTargets` (`domain/connection-rules.ts`, ADR-14): навигация → блоки следующих уровней;
  «Сложная логика» → элементы того же шага. ADR-13: связь только между смежными уровнями, перенос → каскадный разрыв
  (`removeNonAdjacentLinks`). ADR-14: target-handles в покое невидимы и не ловят мышь, появляются только при протягивании и
  только у допустимых целей (полые окружности, цвет подсветки под курсором). Drop/клик — по всей сущности (блок без коннекторов тоже).
  Запрет дублей связей.
- **Источники:** `c1f312f`, `a0c14f8` (F4), `8ca9bf9` (R1), `ff008e4`, `37a9147`, `40bd3a7`, `dfcf4aa`, `576f11e`,
  `e47f925`, `4d6a56f` (N9). **Не воспроизводить:** `8c942a5` + revert `eae152f`.
- **Пути:** `src/domain/connection-rules.ts`, `use-connection.ts`, `connect-elements.ts`, `reconnect-elements.ts`,
  `disconnect-elements.ts`, `graph-flow-adapter.ts`.
- **Критерии:** недопустимые цели не подсвечиваются; связь на не-смежный уровень невозможна/рвётся; стрелка читаемая, handle удобный.
- **Мелочи внутри PR:** ширина стрелки, нулевой уровень без target-handle, `nodeDragThreshold`, прицел на всём полотне,
  отмена клик-связи (TEMPORARY №7).

## Где проверять по коду (grep в репозитории; спека описывает то, что реально есть)

`connectableTargets`, `domain/connection-rules.ts`, `removeNonAdjacentLinks`, `src/domain/connection-rules.ts`, `use-connection.ts`, `connect-elements.ts`, `reconnect-elements.ts`, `disconnect-elements.ts`, `graph-flow-adapter.ts`, `nodeDragThreshold`

---

Шаг закрыт, когда выполнено всё из INSTRUCTIONS §6.
