import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: [
      // TEMPORARY: polyfill findDOMNode для MUI v4-подмены Flamingo (см. rsbuild.config.ts).
      // regex — только точный импорт 'react-dom', подпути не затрагиваются.
      {
        find: /^react-dom$/,
        replacement: path.resolve(__dirname, 'vendor/react-dom-find-dom-node/index.js'),
      },
      { find: '@domain', replacement: path.resolve(__dirname, 'src/domain') },
      { find: '@application', replacement: path.resolve(__dirname, 'src/application') },
      { find: '@infrastructure', replacement: path.resolve(__dirname, 'src/infrastructure') },
      { find: '@presentation', replacement: path.resolve(__dirname, 'src/presentation') },
    ],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
});
