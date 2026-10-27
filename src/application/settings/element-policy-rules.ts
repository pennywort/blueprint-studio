import type { EditorRules } from '@domain/editor-rules';
import { DEFAULT_ELEMENT_KIND, type ElementKindRules } from '@domain/element-kinds';
import type { ElementSchema } from '@application/ports/element-schema-provider';

// Правила карты с решениями политики редактора о видах ([owner 2026-10-27]):
// доступность «Сложной логики» задаёт только политика (complexLogic элемента),
// таблица видов домена — как читать варианты. Одно действующее значение для
// шины команд и UI (useEditorRules) — инварианты и подсказки видят одно и то же.
// Кэш по паре объектов: неизменившиеся настройки дают тот же объект правил
// (подписчики React не перерисовываются зря).

const cache = new WeakMap<EditorRules, WeakMap<readonly ElementSchema[], EditorRules>>();

export function withElementPolicy(rules: EditorRules, schemas: readonly ElementSchema[]): EditorRules {
  let bySchemas = cache.get(rules);
  const cached = bySchemas?.get(schemas);
  if (cached) {
    return cached;
  }
  const elementKinds: Record<string, ElementKindRules> = {};
  for (const [kind, row] of Object.entries(rules.elementKinds)) {
    elementKinds[kind] = { ...row, complexLogic: false };
  }
  for (const schema of schemas) {
    if (schema.complexLogic) {
      elementKinds[schema.kind] = {
        ...(elementKinds[schema.kind] ?? DEFAULT_ELEMENT_KIND),
        complexLogic: true,
      };
    }
  }
  const result: EditorRules = { ...rules, elementKinds };
  if (!bySchemas) {
    bySchemas = new WeakMap();
    cache.set(rules, bySchemas);
  }
  bySchemas.set(schemas, result);
  return result;
}
