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

// Режим «движок по симлинкам» (docs/local-overrides.md, ОВ-21): на рабочей машине пакеты
// движка подключены через file:/npm link. Определяется сам — по симлинкам в node_modules.
function linkedPackages(): string[] {
  const root = path.resolve(__dirname, 'node_modules');
  if (!fs.existsSync(root)) return [];
  const names = fs
    .readdirSync(root)
    .flatMap((name) =>
      name.startsWith('@') ? fs.readdirSync(path.join(root, name)).map((sub) => `${name}/${sub}`) : [name],
    );
  return names.filter((name) => fs.lstatSync(path.join(root, name)).isSymbolicLink());
}

const LINKED = linkedPackages();
if (LINKED.length > 0) {
  console.log(`[rsbuild] режим симлинков: ${LINKED.join(', ')}`);
}

export default defineConfig({
  plugins: [pluginReact()],
  source: {
    // Именованный импорт иконок → путь к одной иконке: корневой индекс
    // @material-ui/icons — тысячи модулей, dev-сборка без этого тормозит.
    transformImport: [{ libraryName: '@material-ui/icons', customName: '@material-ui/icons/{{ member }}' }],
  },
  resolve: {
    // Одна копия React и MUI на бандл: пакет по симлинку резолвит свои зависимости из
    // монорепо движка (React 17) → две копии React. Без симлинков — ничего не меняет (ОВ-21).
    dedupe: ['react', 'react-dom', '@material-ui/core', '@material-ui/styles'],
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
  // Только в режиме симлинков (ОВ-21): пересборка пакета движка пересоздаёт его dist,
  // lazy compilation держит старый резолв («Module not found»), overlay залипает на нём.
  dev: LINKED.length > 0 ? { lazyCompilation: false, client: { overlay: false } } : {},
  output: {
    // Относительные пути ассетов: никаких предположений о корневом пути
    // (конституция, раздел 7 — гигиена встраиваемости).
    assetPrefix: './',
  },
});
