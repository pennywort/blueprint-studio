import { defineConfig, mergeRsbuildConfig, type RsbuildConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Локальные переопределения вне git (docs/local-overrides.md): есть `<имя>.local.tsx` —
// берём его, нет — заглушку `<имя>.none.ts`. Тот же порядок, что в tsconfig paths.
function localOverride(name: string): string {
  const local = path.resolve(__dirname, `src/presentation/icons/${name}.local.tsx`);
  return fs.existsSync(local) ? local : path.resolve(__dirname, `src/presentation/icons/${name}.none.ts`);
}

const baseConfig: RsbuildConfig = {
  plugins: [pluginReact()],
  source: {
    // Именованный импорт иконок → путь к одной иконке: корневой индекс
    // @material-ui/icons — тысячи модулей, dev-сборка без этого тормозит.
    transformImport: [{ libraryName: '@material-ui/icons', customName: '@material-ui/icons/{{ member }}' }],
  },
  resolve: {
    // Одна копия React на бандл: пакеты движка по симлинку держат свой React 17
    // (ОВ-21, docs/local-overrides.md). При обычной установке ничего не меняет.
    // MUI не дедуплицируем: движок от @material-ui/* не зависит (проверено 2026-11-17).
    dedupe: ['react', 'react-dom'],
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
};

// Настройки рабочей машины — `rsbuild.config.local.ts` вне git (docs/local-overrides.md,
// ОВ-21): есть файл — его конфиг сливается поверх базового; этот файл при этом не правится.
const LOCAL_CONFIG = path.resolve(__dirname, 'rsbuild.config.local.ts');

export default defineConfig(async () => {
  if (!fs.existsSync(LOCAL_CONFIG)) return baseConfig;
  const local = (await import(pathToFileURL(LOCAL_CONFIG).href)) as { default: RsbuildConfig };
  console.log('[rsbuild] + rsbuild.config.local.ts');
  return mergeRsbuildConfig(baseConfig, local.default);
});
