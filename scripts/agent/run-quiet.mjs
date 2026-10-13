/* global process, console */
// Тихий запуск команды для агентов (экономия контекста LLM).
//
//   node scripts/agent/run-quiet.mjs <имя> <команда> [аргументы...]
//
// Полный вывод пишется в .agent-logs/<имя>.log (в .gitignore).
// В консоль: при успехе — одна строка «✅ <имя> OK»; при ошибке — до 40
// строк с ошибками (без ANSI-цветов и дублей) + путь к полному логу.
// Читать полный лог целиком не нужно: только нужный фрагмент (grep/offset).

import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const MAX_LINES = 40;
const [name, cmd, ...args] = process.argv.slice(2);
if (!name || !cmd) {
  console.error('Использование: node scripts/agent/run-quiet.mjs <имя> <команда> [аргументы...]');
  process.exit(2);
}

const started = Date.now();
const result = spawnSync(cmd, args, {
  encoding: 'utf8',
  shell: process.platform === 'win32',
  maxBuffer: 64 * 1024 * 1024,
  // Без цветов: ANSI-коды — чистый мусор в контексте агента
  env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0', CI: '1' },
});
const seconds = ((Date.now() - started) / 1000).toFixed(1);
// eslint-disable-next-line no-control-regex
const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '');

mkdirSync('.agent-logs', { recursive: true });
const logPath = `.agent-logs/${name}.log`;
writeFileSync(logPath, output);

if (result.status === 0) {
  console.log(`✅ ${name} OK (${seconds}s)`);
  process.exit(0);
}

// Строки, похожие на ошибку или на путь к файлу с ошибкой (заголовок блока eslint)
const interesting = /error|warning|✖|failed|cannot|not found|TS\d{4}|^\s*\d+:\d+\s|\.(tsx?|jsx?|mjs|json)\b/i;
const noise = /^\s*$|^> |^npm (notice|warn)|^\s+at /;
const lines = output.split('\n').filter((line) => !noise.test(line));
const seen = new Set();
let picked = lines.filter((line) => interesting.test(line) && !seen.has(line) && seen.add(line));
if (picked.length === 0) picked = lines.slice(-MAX_LINES);
const hidden = Math.max(0, picked.length - MAX_LINES);

console.log(`❌ ${name} FAIL (exit ${result.status ?? result.signal}, ${seconds}s)`);
console.log(picked.slice(0, MAX_LINES).join('\n'));
if (hidden) console.log(`… ещё ${hidden} строк`);
console.log(`Полный лог: ${logPath} (читай фрагментами, не целиком)`);
process.exit(result.status || 1);
