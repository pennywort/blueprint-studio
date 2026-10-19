/**
 * Генератор JSON-схем UI-элементов.
 *
 *   ts-node cli.ts --element button          одна схема → src/schemas, shared, манифест
 *   ts-node cli.ts --all                     все элементы
 *   ts-node cli.ts --all --check             сверить с файлами на диске, ничего не писать
 *   ts-node cli.ts --all --bundle out.json   один файл: все схемы + shared + отчёт, больше ничего не писать
 *
 * Прочие флаги: --outputDir <dir>, --root <корень монорепозитория>.
 */

import * as fs from 'fs';
import * as path from 'path';

import { CLI_NAME_ALIASES, PATHS, ROOT_MARKER } from './config';
import { Diagnostics } from './diagnostics';
import { buildElementSchema, readBaseSchemas } from './emit';
import { createProgram, findClass, readCatalog } from './extract';
import {
  FORMAT_VERSION,
  serialize,
  type Bundle,
  type ElementSchema,
  type Manifest,
  type Report,
} from './format';
import { SharedRegistry } from './shared';
import { createValidator } from './validate';

type Args = Record<string, string | true>;

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (!a.startsWith('--')) continue;
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith('--')) {
      args[a.slice(2)] = next;
      i++;
    } else {
      args[a.slice(2)] = true;
    }
  }
  return args;
}

function normalizeName(raw: string): string {
  return CLI_NAME_ALIASES[raw.toUpperCase()] ?? raw.toLowerCase().replace(/_/g, '-');
}

function findRoot(from: string): string | null {
  for (let dir = from; ; dir = path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, ROOT_MARKER))) return dir;
    if (path.dirname(dir) === dir) return null;
  }
}

function main(): number {
  const args = parseArgs(process.argv.slice(2));
  const warn = (msg: string): void => console.warn(msg);

  const rootDir = typeof args.root === 'string' ? path.resolve(args.root) : findRoot(__dirname);
  if (!rootDir) {
    console.error(`Корень фреймворка не найден (нет ${ROOT_MARKER} выше скрипта) — укажите --root`);
    return 1;
  }
  const pkgDir = path.resolve(rootDir, PATHS.schemasPackage);
  const outputDir =
    typeof args.outputDir === 'string'
      ? path.resolve(args.outputDir)
      : path.resolve(pkgDir, PATHS.schemasDir);
  const sharedDir = path.resolve(outputDir, '..', path.basename(PATHS.sharedDir));
  const checkOnly = !!(args.check || args.checkOnly);
  const bundlePath = typeof args.bundle === 'string' ? path.resolve(args.bundle) : null;

  const catalog = readCatalog(rootDir, warn);
  let targets: string[];
  if (args.all) {
    targets = Object.keys(catalog.elements).sort();
  } else if (typeof args.element === 'string') {
    targets = [normalizeName(args.element)];
  } else {
    console.error('Нужен --element <имя> или --all');
    return 1;
  }
  for (const t of targets) {
    if (!catalog.elements[t]) {
      console.error(`Элемент не найден в справочнике: ${t}`);
      return 1;
    }
  }

  console.log(`Загрузка программы типов (${targets.length} эл.)...`);
  const project = createProgram(rootDir);
  const shared = new SharedRegistry(rootDir, warn);
  const base = readBaseSchemas(
    path.resolve(pkgDir, PATHS.baseElementSchema),
    path.resolve(pkgDir, PATHS.baseEventsSchema),
    warn,
  );

  const schemas: Record<string, ElementSchema> = {};
  const diagnostics: Record<string, Diagnostics> = {};
  for (const elementType of targets) {
    const entry = catalog.elements[elementType]!;
    const diag = new Diagnostics();
    diagnostics[elementType] = diag;
    try {
      const cls = findClass(project, entry);
      if (!cls) throw new Error(`класс ${entry.className} не найден в программе`);
      schemas[elementType] = buildElementSchema({ project, cls, entry, catalog, base, shared }, diag);
    } catch (e) {
      diag.report('element-failed', '$', (e as Error).message);
    }
  }

  const sharedSchemas = shared.schemas();
  const validate = createValidator(sharedSchemas, warn);
  if (validate) {
    for (const [t, s] of Object.entries(schemas)) validate(s, diagnostics[t]!);
  }

  const report: Report = { summary: {}, elements: {}, sharedCandidates: shared.candidates() };
  for (const t of targets) {
    const items = diagnostics[t]!.items;
    if (items.length > 0) report.elements[t] = items;
    for (const d of items) report.summary[d.code] = (report.summary[d.code] ?? 0) + 1;
  }
  report.summary = Object.fromEntries(Object.entries(report.summary).sort(([a], [b]) => a.localeCompare(b)));

  const errors = Object.values(report.elements)
    .flat()
    .filter((d) => d.severity === 'error').length;
  console.log(`Готово: ${Object.keys(schemas).length}/${targets.length} схем, ошибок ${errors}`);
  for (const [code, n] of Object.entries(report.summary)) console.log(`  ${code}: ${n}`);

  if (bundlePath) {
    const bundle: Bundle = {
      'x-format-version': FORMAT_VERSION,
      shared: sharedSchemas,
      elements: schemas,
      report,
    };
    fs.mkdirSync(path.dirname(bundlePath), { recursive: true });
    fs.writeFileSync(bundlePath, serialize(bundle));
    console.log(`Бандл: ${bundlePath}`);
    return 0;
  }

  const files: Array<{ file: string; text: string }> = [
    ...Object.entries(schemas).map(([t, s]) => ({
      file: path.join(outputDir, `${t}.schema.json`),
      text: serialize(s),
    })),
    ...Object.entries(sharedSchemas).map(([name, s]) => ({
      file: path.join(sharedDir, name),
      text: serialize(s),
    })),
  ];

  if (checkOnly) {
    const stale = files.filter((f) => !fs.existsSync(f.file) || fs.readFileSync(f.file, 'utf-8') !== f.text);
    for (const f of stale) console.error(`Расходится с генератором: ${path.relative(rootDir, f.file)}`);
    return stale.length > 0 || errors > 0 ? 1 : 0;
  }

  for (const f of files) {
    fs.mkdirSync(path.dirname(f.file), { recursive: true });
    fs.writeFileSync(f.file, f.text);
  }
  const manifestPath = path.resolve(pkgDir, PATHS.manifest);
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as Manifest;
    for (const [t, s] of Object.entries(schemas)) {
      manifest[t] = {
        path: `${PATHS.schemasDir}/${t}.schema.json`,
        title: s.title,
        deprecatedAliases: s['x-deprecated-aliases'],
      };
    }
    fs.writeFileSync(manifestPath, serialize(manifest));
  } else {
    warn(`[WARN] манифест не найден: ${manifestPath}`);
  }
  console.log(`Записано файлов: ${files.length}`);
  return errors > 0 ? 1 : 0;
}

process.exitCode = main();
