---
name: react-flow-advanced-best-practices
description: 'Version-aware, evidence-backed guidance for React Flow (@xyflow/react): architecture, performance, TypeScript, custom nodes/edges, layout, connections, migration, a11y. Use for non-trivial React Flow development or review in blueprint-studio. Not for generic React pages or unrelated frontend changes.'
user-invocable: true
argument-hint: '[вопрос или область: performance | layout | connections | migration | ...]'
---

<!-- Источник: github.com/oil-oil/react-flow-advanced-best-practices (SKILL.md, references/, scripts/). Адаптировано под blueprint-studio: пути снапшота, правила проекта. -->

# React Flow Advanced Best Practices

Запрос: `$ARGUMENTS`

Produce version-aware, evidence-backed React Flow guidance.
Skip beginner setup unless explicitly requested.

## Правила проекта (приоритет над советами из доков)

- Версия в проекте — `@xyflow/react` 12.12 (точная, см. `package.json`); сверяй советы с ней.
- Любое изменение графа — команда через `CommandBus`; React Flow state — только представление `ServiceBlueprint` (AGENTS.md §4, §4b).
- Постоянных target-handles не добавлять (ADR-14); хоткеи — только `features/hotkeys`; цвета — из темы.
- Отвечай по-русски и коротко (AGENTS.md §0), шаблон ниже сжимай до лимитов.
- Тесты не писать и не запускать.

## Workflow

### 1) Refresh official sources

Скрипт использует только stdlib и официальные источники (reactflow.dev, GitHub releases xyflow).
Снапшот писать в `.agent-logs/` (в gitignore), не в каталог скилла:

```bash
python3 .claude/skills/react-flow-advanced-best-practices/scripts/sync_react_flow_sources.py \
  --output-md .agent-logs/react-flow-snapshot.md --output-json .agent-logs/react-flow-snapshot.json
```

- `.agent-logs/react-flow-snapshot.md` — baseline for all answers.
- `.agent-logs/react-flow-snapshot.json` — для программного сравнения версий / migration diff.

If fetch errors occur, note gaps and continue with available data.

### 2) Load only the needed references

Файлы в `references/` рядом с этим SKILL.md:

| Request type                    | Reference file                            |
| ------------------------------- | ----------------------------------------- |
| URL routing / "which page?"     | `references/source-map.md`                |
| Architecture, advanced features | `references/advanced-feature-playbook.md` |
| Performance tuning              | `references/performance-playbook.md`      |
| Version checks, migration       | `references/version-watchlist.md`         |

### 3) Generate guidance

- Quote concrete version and date context (docs last-updated + latest `@xyflow/react` tag).
- Tie every recommendation to a specific official page.
- Prefer trade-offs, failure modes, and decision criteria over generic tips.
- Flag deprecated or renamed APIs with source links.
- Separate durable architecture choices from optional enhancements.
- Include short canonical code patterns where they prevent common mistakes.

## Output template

1. Current baseline (version / date)
2. Key decisions and trade-offs
3. Recommended pattern (with code if non-trivial)
4. Performance risks and mitigations
5. Validation checklist
6. Source links

## Non-negotiables

- Official docs and release notes are the source of truth.
- Never rely on memory for fast-changing API details — always refresh first.
- Call out uncertainty explicitly when official sources are silent.
