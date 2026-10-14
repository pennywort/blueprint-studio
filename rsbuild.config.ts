import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [pluginReact()],
  source: {
    // stress — второе приложение: стенд производительности канваса на
    // нагрузочном графе (src/stress-demo), открывается stress.html#/editor.
    entry: { index: './src/index.tsx', stress: './src/stress-demo/index.tsx' },
  },
  resolve: {
    alias: {
      // TEMPORARY: polyfill findDOMNode для MUI v4-подмены Flamingo (react-dom 19
      // удалил findDOMNode). '$' — только точный импорт 'react-dom', подпути
      // ('react-dom/client' и т.п.) не затрагиваются. Удалить вместе с vendor/flamingo.
      'react-dom$': path.resolve(__dirname, 'vendor/react-dom-find-dom-node/index.js'),
      '@domain': path.resolve(__dirname, 'src/domain'),
      '@application': path.resolve(__dirname, 'src/application'),
      '@infrastructure': path.resolve(__dirname, 'src/infrastructure'),
      '@presentation': path.resolve(__dirname, 'src/presentation'),
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
