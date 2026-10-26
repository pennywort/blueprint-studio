import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

// Локальные переопределения вне git (docs/local-overrides.md): есть файл — берём его,
// нет — заглушку. Тот же порядок, что в tsconfig paths.
const localIcons = path.resolve(__dirname, 'src/presentation/icons/editor-icons.local.tsx');
const editorIconsOverride = fs.existsSync(localIcons)
  ? localIcons
  : path.resolve(__dirname, 'src/presentation/icons/editor-icons.none.ts');

export default defineConfig({
  plugins: [pluginReact()],
  source: {
    // Именованный импорт иконок → путь к одной иконке: корневой индекс
    // @material-ui/icons — тысячи модулей, dev-сборка без этого тормозит.
    transformImport: [{ libraryName: '@material-ui/icons', customName: '@material-ui/icons/{{ member }}' }],
  },
  resolve: {
    alias: {
      // TEMPORARY: polyfill findDOMNode для MUI v4 (react-dom 19 удалил findDOMNode).
      // '$' — только точный импорт 'react-dom', подпути ('react-dom/client' и т.п.)
      // не затрагиваются. Удалить при уходе с MUI v4.
      'react-dom$': path.resolve(__dirname, 'vendor/react-dom-find-dom-node/index.js'),
      '@domain': path.resolve(__dirname, 'src/domain'),
      '@application': path.resolve(__dirname, 'src/application'),
      '@infrastructure': path.resolve(__dirname, 'src/infrastructure'),
      '@presentation': path.resolve(__dirname, 'src/presentation'),
      '@local/editor-icons$': editorIconsOverride,
    },
  },
  html: {
    title: 'blueprint-studio',
  },
  output: {
    // Относительные пути ассетов: никаких предположений о корневом пути
    // (конституция, раздел 7 — гигиена встраиваемости).
    assetPrefix: './',
  },
});
