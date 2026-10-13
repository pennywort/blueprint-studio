/* global process, console */
// Быстрый eslint одного файла сразу после правки — ошибки маленькие и
// сразу, а не одной простынёй в конце задачи.
//
//   node scripts/agent/lint-file.mjs <файл...>     — вручную (любой агент)
//   хук PostToolUse Claude Code                     — путь берётся из JSON в stdin
//
// Успех — тишина. Ошибки — в stderr, код выхода 2 (Claude Code покажет их агенту).

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';

let files = process.argv.slice(2);
if (files.length === 0) {
  try {
    const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
    const path = input.tool_input?.file_path;
    if (path) files = [path];
  } catch {
    /* не JSON — нечего проверять */
  }
}
files = files
  .map((file) => relative(process.cwd(), file))
  .filter((file) => /^(src|scripts)\/.*\.(tsx?|jsx?|mjs)$/.test(file));
if (files.length === 0) process.exit(0);

const result = spawnSync('npx', ['eslint', '--no-warn-ignored', ...files], {
  encoding: 'utf8',
  env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
});
if (result.status === 0) process.exit(0);

const lines = `${result.stdout}${result.stderr}`.split('\n').filter((line) => line.trim());
console.error(`eslint: ${lines.slice(0, 30).join('\n')}`);
process.exit(2);
