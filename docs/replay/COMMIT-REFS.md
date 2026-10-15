# Номера задач для commit-сообщений (связь «коммит ↔ change ↔ задачи»)

Формат сообщения (commitlint: conventional, по-русски):

```
docs(openspec): change <id> — <суть> (PR-NN)

Задачи: T-xxx, T-yyy; решения: ADR-xx, D-x
```

| PR  | change id                           | Задачи / решения (из карточки)                                                  |
| --- | ----------------------------------- | ------------------------------------------------------------------------------- |
| 01  | `bootstrap-project-tooling`         | T-001, T-002, ADR-08, ADR-10                                                    |
| 02  | `ui-kit-flamingo-shims`             | T-003                                                                           |
| 03  | `domain-service-graph-model`        | T-005, T-010, ADR-10, ADR-17                                                    |
| 04  | `domain-invariants`                 | T-006                                                                           |
| 05  | `element-schema-port-manifest`      | T-007, ADR-07, D3                                                               |
| 06  | `command-bus-di-container`          | T-008, T-009, ADR-05, ADR-04                                                    |
| 07  | `editor-theme-system`               | T-010, T-011, ADR-03, D6                                                        |
| 08  | `editor-page-shell`                 | T-020, T-021, T-022, T-023, T-024                                               |
| 09  | `page-graph-model`                  | T-004, D13, D2                                                                  |
| 10  | `canvas-commands`                   | T-035                                                                           |
| 11  | `canvas-layered-layout`             | T-030, T-036, ADR-11, D7, D13, R3                                               |
| 12  | `canvas-nodes-and-elements`         | T-031                                                                           |
| 13  | `canvas-links-and-connection-rules` | T-032, ADR-14, ADR-13, R1                                                       |
| 14  | `canvas-add-remove-blocks`          | T-034, T-033, ADR-15                                                            |
| 15  | `canvas-selection-deletion`         | ADR-12                                                                          |
| 16  | `canvas-universal-elements-dnd`     | ADR-17                                                                          |
| 17  | `complex-logic`                     | T-060, T-061, T-062, T-063, T-064, T-065, T-066, T-067, ADR-14, L-I1…L-I6, L-I7 |
| 18  | `form-steps-layout`                 | ADR-16, D1                                                                      |
| 19  | `form-step-transitions`             | ADR-18                                                                          |
| 20  | `attributes-panel`                  | T-040, T-041, T-067, T-042, D4, D10                                             |
| 21  | `violation-highlighting`            | T-043                                                                           |
| 22  | `canvas-search`                     | T-050, D5                                                                       |
| 23  | `graph-persistence-projects`        | T-053, T-052, T-051                                                             |
| 24  | `canvas-performance-stress`         | R2                                                                              |
| 25  | `canvas-architecture-refactor`      | R3, R4                                                                          |
| 26  | `comment-elements`                  | —                                                                               |
| 27  | `epic-002-hardening`                | —                                                                               |
| 28  | `dev-agent-tooling`                 | —                                                                               |
