import { DEFAULT_EDITOR_RULES, parseEditorRules, type EditorRules } from '@domain/editor-rules';
import { mergeSection } from './settings-section';

// Секция «Правила карты» (R-ADM): таблицы домена EditorRules — строгость,
// лимиты, ёмкость уровней, виды элементов, матрица связей. Меняет только
// администратор (для всех): правила проверяют карту, личные правила у
// разных пользователей дали бы разную валидность одной карты.
// Переопределение частичное, например:
// { "rules": { "elementCountLimits": { "subScenario": { "attachment": 2 } },
//              "severity": { "element-count-limit": "warning" } } }
export const rulesSettings = mergeSection<EditorRules>({
  key: 'rules',
  title: 'Правила карты',
  scope: 'admin',
  defaults: DEFAULT_EDITOR_RULES,
  parse: parseEditorRules,
});
