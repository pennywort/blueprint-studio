/* global process, console */
// Механическая проверка «железных правил» AGENTS.md, которые не ловит eslint.
//
//   npm run rules              — только изменённые/новые файлы (git diff HEAD + untracked)
//   npm run rules -- --all     — весь src/
//
// Вывод: «✅ rules OK» или список нарушений `файл:строка — правило`.
// Суждение (CommandBus, русские комментарии со ссылкой на T-xxx/D-x/ADR) —
// за агентом-ревьюером, скрипт его не делает.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const all = process.argv.includes('--all');
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const list = (text) => text.split('\n').filter(Boolean);

const changed = [
  ...list(git('diff', '--name-only', 'HEAD')),
  ...list(git('ls-files', '--others', '--exclude-standard')),
];
const files = all ? list(git('ls-files', 'src')) : [...new Set(changed)];

const issues = [];

// Правило: старые тесты отключены, их не трогаем; новые тесты не пишем [owner 2026-10-13]
for (const file of changed) {
  if (file.endsWith('.disabled')) issues.push(`${file} — изменён отключённый тест (*.disabled не трогаем)`);
  if (/\.(test|spec)\.[jt]sx?$/.test(file)) issues.push(`${file} — новый тест (тесты не пишем)`);
}

const RULES = [
  {
    re: /['"]@material-ui\//,
    msg: 'прямой импорт @material-ui/* (только @blueprint-vendor/*)',
  },
  {
    re: /(?<![\w&])#[0-9a-fA-F]{3,8}\b/,
    msg: 'литеральный hex-цвет (цвета только из темы editor-theme.ts)',
    skip: (file) => file.startsWith('src/presentation/theme/'),
  },
  {
    re: /\bwindow\.[\w$]+\s*=(?!=)/,
    msg: 'запись в window (конституция §7, совместимость с Module Federation)',
  },
];

for (const file of files) {
  if (!file.startsWith('src/') || !/\.(tsx?|jsx?|css)$/.test(file) || !existsSync(file)) continue;
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, index) => {
    for (const rule of RULES) {
      if (rule.skip?.(file)) continue;
      if (rule.re.test(line)) issues.push(`${file}:${index + 1} — ${rule.msg}`);
    }
  });
}

if (issues.length === 0) {
  console.log(`✅ rules OK (${all ? 'весь src' : `${files.length} изменённых файлов`})`);
} else {
  console.log(`❌ rules: ${issues.length} нарушений`);
  console.log(issues.slice(0, 40).join('\n'));
  if (issues.length > 40) console.log(`… ещё ${issues.length - 40}`);
  process.exitCode = 1;
}
