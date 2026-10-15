/* global process, console */
// Хук PreToolUse (Bash) Claude Code: запрет правки кода через shell
// (python/sed -i/perl -i/перенаправление в файл). Код правится через
// Edit/Write — только тогда срабатывает линт изменённого файла (lint-file.mjs),
// и промежуточный `npm run verify` не нужен [owner 2026-10-15].
//
// Блок — код выхода 2, причина в stderr (Claude Code покажет её агенту).

import { readFileSync } from 'node:fs';

let command = '';
try {
  command = JSON.parse(readFileSync(0, 'utf8') || '{}').tool_input?.command ?? '';
} catch {
  process.exit(0);
}

const CODE_PATH = /(^|[\s'"(=/])(src|scripts|vendor)\/[\w./-]*\.(tsx?|jsx?|mjs|cjs)\b/;
const WRITERS = [
  /\bsed\s+(-[a-zA-Z]*\s+)*-[a-zA-Z]*i/, // sed -i
  /\bperl\s+(-[a-zA-Z]*\s+)*-[a-zA-Z]*i/, // perl -i
  /\bpython3?\b[\s\S]*(open\([^)]*['"][wa]['"]|write_text|\.write\()/, // python, пишущий файл
  /(^|[^>&0-9])>>?\s*['"]?(src|scripts|vendor)\//, // > src/…
  /\btee\s+(-a\s+)?['"]?(src|scripts|vendor)\//,
];

if (CODE_PATH.test(command) && WRITERS.some((writer) => writer.test(command))) {
  console.error(
    'bash-guard: код (src/, scripts/, vendor/) правь через Edit/Write, не через shell — ' +
      'иначе не сработает линт изменённого файла (AGENTS.md §6).',
  );
  process.exit(2);
}
