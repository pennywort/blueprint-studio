/* global process, console */
// Хук Stop Claude Code: перед завершением ответа, если есть незакоммиченные
// правки кода, — npm run verify + npm run rules. Красное → код 2, агент
// продолжает и чинит. Повторный вызов внутри того же Stop (stop_hook_active)
// пропускается, чтобы не зациклиться. Другие агенты: то же = чек-лист AGENTS.md §7.

import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

let input = {};
try {
  input = JSON.parse(readFileSync(0, 'utf8') || '{}');
} catch {
  /* без входа — проверяем как обычно */
}
if (input.stop_hook_active) process.exit(0);

const dirty = execFileSync('git', ['status', '--porcelain', '--', 'src', 'vendor', 'scripts'], {
  encoding: 'utf8',
}).trim();
if (!dirty) process.exit(0);

const run = (script) => spawnSync('npm', ['run', '-s', script], { encoding: 'utf8' });
const failed = [run('verify'), run('rules')].filter((result) => result.status !== 0);
if (failed.length === 0) process.exit(0);

console.error(
  'Есть незакоммиченные правки кода, проверки красные — исправь до завершения:\n' +
    failed.map((result) => `${result.stdout}${result.stderr}`.trim()).join('\n'),
);
process.exit(2);
