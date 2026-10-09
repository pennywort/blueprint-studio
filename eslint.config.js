import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import boundaries from 'eslint-plugin-boundaries';
import prettier from 'eslint-config-prettier';

// Слои проекта и матрица разрешённых импортов — см. specs/000-constitution.md, раздел 3.
const LAYERS = {
  domain: 'src/domain',
  application: 'src/application',
  infrastructure: 'src/infrastructure',
  presentation: 'src/presentation',
};

// Пакеты, запрещённые в чистом domain-слое (конституция: «НОЛЬ внешних импортов»,
// zod допустим только в domain/model схемах — поэтому он исключён из списка).
const DOMAIN_FORBIDDEN = ['react', 'react-dom', 'effector', 'patronum', 'awilix', 'xstate', '@xyflow/*', '@sber-friend/*'];

export default [
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**'] },
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { project: './tsconfig.json' },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      boundaries,
    },
    settings: {
      'import/resolver': { typescript: { project: './tsconfig.json' } },
      'boundaries/elements': [
        { type: 'domain', pattern: `${LAYERS.domain}/*` },
        { type: 'application', pattern: `${LAYERS.application}/*` },
        { type: 'infrastructure', pattern: `${LAYERS.infrastructure}/*` },
        { type: 'presentation', pattern: `${LAYERS.presentation}/*` },
      ],
      'boundaries/include': ['src/**/*'],
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      // no-undef бесполезен под TypeScript: необъявленные имена ловит tsc.
      'no-undef': 'off',
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            { from: { element: { type: 'domain' } }, allow: [{ to: { element: { type: 'domain' } } }] },
            {
              from: { element: { type: 'application' } },
              allow: [{ to: { element: { type: 'domain' } } }, { to: { element: { type: 'application' } } }],
            },
            {
              from: { element: { type: 'infrastructure' } },
              allow: [
                { to: { element: { type: 'domain' } } },
                { to: { element: { type: 'application' } } },
                { to: { element: { type: 'infrastructure' } } },
              ],
            },
            {
              from: { element: { type: 'presentation' } },
              allow: [
                { to: { element: { type: 'domain' } } },
                { to: { element: { type: 'application' } } },
                { to: { element: { type: 'infrastructure' } } },
                { to: { element: { type: 'presentation' } } },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    // Железное правило слоёв: domain не импортирует ничего внешнего.
    files: [`${LAYERS.domain}/**/*.{ts,tsx}`],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            ...DOMAIN_FORBIDDEN.map((p) => ({ group: [p], message: 'domain-слой не может импортировать внешние пакеты (конституция, раздел 3)' })),
            { group: ['@application/*', '@infrastructure/*', '@presentation/*'], message: 'domain импортирует только domain (конституция, раздел 3)' },
          ],
        },
      ],
    },
  },
  {
    // application объявляет порты, но не импортирует адаптеры infrastructure и UI.
    files: [`${LAYERS.application}/**/*.{ts,tsx}`],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@infrastructure/*', '@presentation/*'], message: 'application не импортирует infrastructure/presentation (конституция, раздел 3)' },
            { group: ['react', 'react-dom', '@xyflow/*', '@sber-friend/*', 'xstate', 'awilix'], message: 'application — чистый слой use-cases (конституция, раздел 3)' },
          ],
        },
      ],
    },
  },
  {
    // infrastructure не импортирует UI-слой.
    files: [`${LAYERS.infrastructure}/**/*.{ts,tsx}`],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@presentation/*', 'react', 'react-dom', '@xyflow/*'], message: 'infrastructure не импортирует presentation и UI-пакеты (конституция, раздел 3)' },
          ],
        },
      ],
    },
  },
  {
    // presentation импортирует из infrastructure только composition root.
    files: [`${LAYERS.presentation}/**/*.{ts,tsx}`],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@infrastructure/*', '!@infrastructure/container'], message: 'presentation импортирует только infrastructure/container (конституция, раздел 3)' },
          ],
        },
      ],
    },
  },
  prettier,
];
