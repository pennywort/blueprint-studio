#!/usr/bin/env node
/* global process, console */
// Схемы элементов фреймворка → редактор (этап 3 docs/schemas/PLAN.md).
//
//   npm run schemas:import -- [источник]   копия схем в src/ + проверка политики
//   npm run schemas:check                  только проверка политики по текущей копии
//
// Источник — бандл генератора (`schemas-bundle.json`, по умолчанию
// docs/schemas/results/schemas-bundle.json) или папка пакета схем, где лежат
// `schemas/<el>.schema.json` и `shared/*.schema.json` (сам пакет или его `src/`).
// Проверка — та же сборка, что у редактора при старте (assemble-element-schemas.ts):
// версия формата, элементы и атрибуты политики есть в схемах, тип значения
// поддержан, enum политики ⊆ enum схемы. Красное — код выхода 1.
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assembleElementSchemas,
  SUPPORTED_FORMAT_VERSION,
} from '../src/infrastructure/element-schemas/assemble-element-schemas.ts';

const root = resolve(fileURLToPath(import.meta.url), '../..');
const schemasDir = join(root, 'src/infrastructure/element-schemas');
const frameworkFile = join(schemasDir, 'framework/schemas-bundle.json');
const DEFAULT_SOURCE = join(root, 'docs/schemas/results/schemas-bundle.json');

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));

// Папка пакета: файлы схем → бандл того же вида, что выдаёт генератор.
function bundleFromDir(dir) {
  const base = existsSync(join(dir, 'src/schemas')) ? join(dir, 'src') : dir;
  const read = (sub) =>
    existsSync(join(base, sub))
      ? readdirSync(join(base, sub))
          .filter((file) => file.endsWith('.schema.json'))
          .map((file) => [file, readJson(join(base, sub, file))])
      : [];
  const elements = Object.fromEntries(
    read('schemas').map(([file, schema]) => [basename(file, '.schema.json'), schema]),
  );
  if (Object.keys(elements).length === 0) {
    throw new Error(`В ${base} нет schemas/*.schema.json`);
  }
  const versions = new Set(Object.values(elements).map((schema) => schema['x-format-version']));
  return {
    'x-format-version': versions.size === 1 ? [...versions][0] : [...versions].join('/'),
    shared: Object.fromEntries(read('shared')),
    elements,
  };
}

function loadSource(source) {
  const raw = statSync(source).isDirectory() ? bundleFromDir(source) : readJson(source);
  // В копию — только то, что читает редактор: отчёт генератора не нужен.
  return { 'x-format-version': raw['x-format-version'], shared: raw.shared, elements: raw.elements };
}

const mode = process.argv[2];
try {
  let framework;
  if (mode === '--check') {
    framework = readJson(frameworkFile);
  } else {
    const source = resolve(mode ?? DEFAULT_SOURCE);
    framework = loadSource(source);
    if (framework['x-format-version'] !== SUPPORTED_FORMAT_VERSION) {
      throw new Error(
        `x-format-version ${framework['x-format-version']}, редактор понимает ${SUPPORTED_FORMAT_VERSION}`,
      );
    }
  }
  const schemas = assembleElementSchemas({
    framework,
    project: readJson(join(schemasDir, 'project/project-schemas.json')),
    policy: readJson(join(schemasDir, 'editor-policy.json')),
  });
  if (mode !== '--check') {
    writeFileSync(frameworkFile, `${JSON.stringify(framework)}\n`);
    console.log(`schemas: скопировано ${Object.keys(framework.elements).length} схем → ${frameworkFile}`);
  }
  const attributes = schemas.reduce((sum, schema) => sum + schema.attributes.length, 0);
  console.log(`✅ schemas: политика ок — ${schemas.length} элементов, ${attributes} атрибутов`);
} catch (error) {
  console.error(`❌ schemas: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
