import { replaceSection } from '@application/settings/settings-section';
import { assembleElementSchemas } from './assemble-element-schemas';
import frameworkSchemasJson from './framework/schemas-bundle.json';
import projectSchemasJson from './project/project-schemas.json';
import editorPolicyJson from './editor-policy.json';

// Секция «Элементы редактора» (R-ADM, этап 3 docs/schemas/PLAN.md):
// политика редактора — какие элементы и атрибуты доступны, порядок меню,
// подписи, умолчания. editor-policy.json в репозитории — умолчание;
// администратор задаёт политику целиком (порядок и состав важны), без
// пересборки. Новая политика проверяется по схемам фреймворка и проекта
// так же, как при сборке (`npm run schemas:check`): несовместимая не
// применяется, остаётся прежняя, ошибки видны администратору.
// Пользователь политику не меняет: она описывает данные карты (§4b).

export const SCHEMA_BUNDLES = { framework: frameworkSchemasJson, project: projectSchemasJson } as const;

export const editorPolicySettings = replaceSection<unknown>({
  key: 'editorPolicy',
  title: 'Элементы редактора',
  scope: 'admin',
  defaults: editorPolicyJson,
  parse: (raw) => {
    assembleElementSchemas({ ...SCHEMA_BUNDLES, policy: raw });
    return raw;
  },
});
