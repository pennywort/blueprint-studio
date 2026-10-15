# PROGRESS — журнал воспроизведения PR (ведёт агент, правит только свою строку)

Статусы: `todo` → `code-done` (код собран, verify зелёный, закоммичен в ветку) → `docs-done` (OpenSpec-файлы созданы и проверены)
→ `pr-open` (запушено, PR создан/передан владельцу) → `merged` (владелец слил, change заархивирован) ; `BLOCKED` (причина — в «Заметках»).

**Текущий шаг:** PR-01 / CODE
**Последняя сессия:** —
**Пред-условия выполнены (INSTRUCTIONS §2):** нет

| PR  | change id                           | Размер | Режим  | Статус | Ветка                                    | Коммит/PR | Заметки |
| --- | ----------------------------------- | ------ | ------ | ------ | ---------------------------------------- | --------- | ------- |
| 01  | `bootstrap-project-tooling`         | M      | LEGACY | todo   | change/bootstrap-project-tooling         |           |         |
| 02  | `ui-kit-flamingo-shims`             | S      | LEGACY | todo   | change/ui-kit-flamingo-shims             |           |         |
| 03  | `domain-service-graph-model`        | M      | SLICE  | todo   | change/domain-service-graph-model        |           |         |
| 04  | `domain-invariants`                 | S      | SLICE  | todo   | change/domain-invariants                 |           |         |
| 05  | `element-schema-port-manifest`      | S      | LEGACY | todo   | change/element-schema-port-manifest      |           |         |
| 06  | `command-bus-di-container`          | M      | LEGACY | todo   | change/command-bus-di-container          |           |         |
| 07  | `editor-theme-system`               | S      | LEGACY | todo   | change/editor-theme-system               |           |         |
| 08  | `editor-page-shell`                 | M      | LEGACY | todo   | change/editor-page-shell                 |           |         |
| 09  | `page-graph-model`                  | S      | SLICE  | todo   | change/page-graph-model                  |           |         |
| 10  | `canvas-commands`                   | M      | SLICE  | todo   | change/canvas-commands                   |           |         |
| 11  | `canvas-layered-layout`             | M      | SLICE  | todo   | change/canvas-layered-layout             |           |         |
| 12  | `canvas-nodes-and-elements`         | M      | SLICE  | todo   | change/canvas-nodes-and-elements         |           |         |
| 13  | `canvas-links-and-connection-rules` | L      | SLICE  | todo   | change/canvas-links-and-connection-rules |           |         |
| 14  | `canvas-add-remove-blocks`          | M      | SLICE  | todo   | change/canvas-add-remove-blocks          |           |         |
| 15  | `canvas-selection-deletion`         | M      | SLICE  | todo   | change/canvas-selection-deletion         |           |         |
| 16  | `canvas-universal-elements-dnd`     | L      | SLICE  | todo   | change/canvas-universal-elements-dnd     |           |         |
| 17  | `complex-logic`                     | L      | SLICE  | todo   | change/complex-logic                     |           |         |
| 18  | `form-steps-layout`                 | L      | SLICE  | todo   | change/form-steps-layout                 |           |         |
| 19  | `form-step-transitions`             | M      | SLICE  | todo   | change/form-step-transitions             |           |         |
| 20  | `attributes-panel`                  | L      | SLICE  | todo   | change/attributes-panel                  |           |         |
| 21  | `violation-highlighting`            | S      | SLICE  | todo   | change/violation-highlighting            |           |         |
| 22  | `canvas-search`                     | S      | SLICE  | todo   | change/canvas-search                     |           |         |
| 23  | `graph-persistence-projects`        | M      | SLICE  | todo   | change/graph-persistence-projects        |           |         |
| 24  | `canvas-performance-stress`         | M      | SLICE  | todo   | change/canvas-performance-stress         |           |         |
| 25  | `canvas-architecture-refactor`      | S      | SLICE  | todo   | change/canvas-architecture-refactor      |           |         |
| 26  | `comment-elements`                  | S      | SLICE  | todo   | change/comment-elements                  |           |         |
| 27  | `epic-002-hardening`                | S      | SLICE  | todo   | change/epic-002-hardening                |           |         |
| 28  | `dev-agent-tooling`                 | M      | SLICE  | todo   | change/dev-agent-tooling                 |           |         |

## Журнал сессий (дописывать в конец, одна строка на сессию)

<!-- YYYY-MM-DD | PR-NN | CODE/DOCS/CLOSE | итог одной строкой | verify: ok/fail -->
