import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

// Локальные переопределения вне git (docs/local-overrides.md): есть `<имя>.local.tsx` —
// берём его, нет — заглушку `<имя>.none.ts`. Тот же порядок, что в tsconfig paths.
function localOverride(name: string): string {
  const local = path.resolve(__dirname, `src/presentation/icons/${name}.local.tsx`);
  return fs.existsSync(local) ? local : path.resolve(__dirname, `src/presentation/icons/${name}.none.ts`);
}

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
      '@local/editor-icons$': localOverride('editor-icons'),
      '@local/framework-icons$': localOverride('framework-icons'),
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
