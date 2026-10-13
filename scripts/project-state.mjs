/* global process, console */
// Механическая часть команд /check-state и /update-state — без LLM.
//
//   npm run state:check                     — сверка §2 STACK с package.json и
//                                             хешей коммитов из PROJECT_STATE с git
//   npm run state:summary                   — сжатая сводка: открытое, план, карта
//                                             секций, нужно ли обновление
//   npm run state:section -- <id>           — одна секция с номерами строк
//   npm run state:log -- <кто> "<что>"      — бамп UPDATED + строка в CHANGELOG
//
// Классификацию фактов по секциям (DONE / ADR / §6 / §7) скрипт НЕ делает —
// это суждение, оно остаётся за агентом/владельцем. Скрипт только собирает
// проверяемые факты и выполняет append-only операции, которые схема файла
// разрешает делать механически (SCHEMA RULES п.4–5).

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const STATE_FILE = 'PROJECT_STATE.md';
const today = () => new Date().toISOString().slice(0, 10);

function readState() {
  return readFileSync(STATE_FILE, 'utf8');
}

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function section(text, heading) {
  const start = text.indexOf(`## ${heading}`);
  if (start < 0) return '';
  const next = text.indexOf('\n## ', start + 1);
  return text.slice(start, next < 0 ? undefined : next);
}

// §2 STACK: для каждого пакета из строки таблицы, который есть в package.json,
// его точная версия должна встречаться в колонке «Версия».
function checkStack(text) {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const issues = [];
  const rows = section(text, '2. STACK')
    .split('\n')
    .filter((line) => line.startsWith('|') && !line.includes('---'))
    .slice(1);
  for (const row of rows) {
    const [, , packagesCell = '', versionCell = '', statusCell = ''] = row
      .split('|')
      .map((cell) => cell.trim());
    const versions = versionCell.split('/').map((version) => version.trim());
    const names = packagesCell.match(/@?[a-z0-9][\w.-]*(\/[\w.-]+)?/gi) ?? [];
    for (const name of names) {
      const installed = deps[name];
      if (!installed || installed.startsWith('file:')) continue;
      if (statusCell.startsWith('planned')) {
        issues.push(`[§2] ${name}: статус «planned», но установлен ${installed}`);
      } else if (!versions.includes(installed)) {
        issues.push(`[§2] ${name}: в таблице «${versionCell}», в package.json ${installed}`);
      }
    }
  }
  return issues;
}

// Хеши коммитов, на которые ссылается файл, должны существовать в git.
function checkCommits(text) {
  const issues = [];
  const hashes = new Set(text.match(/\b(?=[0-9a-f]*[a-f])(?=[0-9a-f]*\d)[0-9a-f]{7}\b/g) ?? []);
  for (const hash of hashes) {
    try {
      git('cat-file', '-e', `${hash}^{commit}`);
    } catch {
      issues.push(`[git] коммит ${hash} упомянут в ${STATE_FILE}, но отсутствует в репозитории`);
    }
  }
  return issues;
}

function check() {
  const text = readState();
  const updated = text.match(/\*\*UPDATED:\*\* (\S+)/)?.[1];
  console.log(`${STATE_FILE}: UPDATED ${updated ?? '?'}`);
  console.log('\nПоследние коммиты:\n' + git('log', '--oneline', '-10'));
  const status = git('status', '--short');
  console.log('\nНезакоммиченное:\n' + (status || '(нет)'));
  const issues = [...checkStack(text), ...checkCommits(text)];
  console.log(
    issues.length
      ? `\n⚠️ DRIFT (${issues.length}):\n${issues.join('\n')}`
      : '\n✅ Механических расхождений нет',
  );
  process.exitCode = issues.length ? 1 : 0;
}

// Сжатая сводка для агента вместо чтения файла целиком (~72 КБ): открытое,
// план, карта секций и признак «надо ли обновлять».
const cut = (line, max = 160) => (line.length > max ? `${line.slice(0, max)}…` : line);

function sectionMap(text) {
  const lines = text.split('\n');
  const heads = [];
  lines.forEach((line, index) => {
    const match = line.match(/^(#{2,3}) (\d+(?:\.\d+)?)\.? (.*)/);
    if (match) heads.push({ id: match[2], title: match[3], start: index + 1 });
  });
  return heads.map((head, i) => ({ ...head, end: (heads[i + 1]?.start ?? lines.length + 1) - 1 }));
}

function summary() {
  const text = readState();
  const field = (key) => text.match(new RegExp(`\\*\\*${key}:\\*\\* (.+)`))?.[1] ?? '?';
  console.log(`${STATE_FILE}: UPDATED ${field('UPDATED')} | EPIC ${field('CURRENT_EPIC')}`);

  // Коммиты после последней правки PROJECT_STATE — кандидаты на отражение в файле
  const lastStateCommit = git('log', '-1', '--format=%H', '--', STATE_FILE);
  const unrecorded = lastStateCommit ? git('log', '--oneline', `${lastStateCommit}..HEAD`) : '';
  const dirty = git('status', '--short');

  const notDone =
    section(text, '4. CURRENT STATE')
      .split('### 4.2')[1]
      ?.split('\n')
      .filter((line) => line.startsWith('- ')) ?? [];

  // §6: открытые ❓ и 🐞, которые не находятся в блоке «✅ ИСПРАВЛЕНЫ»
  const open = [];
  let closedBlock = false;
  for (const line of section(text, '6. BLOCKERS').split('\n')) {
    if (line && !line.startsWith('- ') && !line.startsWith('#') && !line.startsWith('<!--')) {
      closedBlock = line.includes('✅');
    }
    if (line.startsWith('- ❓') || (line.startsWith('- 🐞') && !closedBlock)) open.push(line);
  }
  const resolved = (section(text, '6. BLOCKERS').match(/^- ✅/gm) ?? []).length;

  const next = section(text, '7. NEXT STEPS')
    .split('\n')
    .filter((line) => /^\d+\. \[ \]/.test(line));

  console.log(`\n§4.2 NOT DONE (${notDone.length}):\n${notDone.map((l) => cut(l)).join('\n')}`);
  console.log(
    `\n§6 открыто (${open.length}, закрыто ✅ ${resolved}):\n${open.map((l) => cut(l)).join('\n')}`,
  );
  console.log(`\n§7 NEXT STEPS (${next.length}):\n${next.map((l) => cut(l)).join('\n')}`);
  console.log(
    '\nКарта секций (для точечного чтения — `npm run state:section -- <id>`):\n' +
      sectionMap(text)
        .map((s) => `  ${s.id} ${s.title} — строки ${s.start}–${s.end}`)
        .join('\n'),
  );

  console.log(
    `\nКоммиты после последней правки ${STATE_FILE}:\n${unrecorded || '(нет)'}` +
      `\nНезакоммиченное: ${dirty ? dirty.split('\n').length + ' файл(ов)' : '(нет)'}`,
  );
  console.log(
    unrecorded
      ? '\n⚠️ ОБНОВЛЕНИЕ: вероятно нужно — есть коммиты, не отражённые в PROJECT_STATE (решает владелец, /update-state)'
      : '\n✅ ОБНОВЛЕНИЕ: не требуется — новых коммитов после последней правки нет',
  );
}

// Одна секция с номерами строк — для точечной правки без чтения всего файла
function printSection(id) {
  if (!id) {
    console.error('Использование: npm run state:section -- <id>, например 6 или 4.2');
    process.exit(2);
  }
  const text = readState();
  const found = sectionMap(text).find((s) => s.id === id);
  if (!found) {
    console.error(
      `Секция ${id} не найдена. Есть: ${sectionMap(text)
        .map((s) => s.id)
        .join(', ')}`,
    );
    process.exit(2);
  }
  const lines = text.split('\n');
  for (let n = found.start; n <= found.end; n += 1) console.log(`${n}: ${lines[n - 1]}`);
}

function log(author, message) {
  if (!author || !message) {
    console.error('Использование: npm run state:log -- <owner|agent:имя> "<что изменилось>"');
    process.exit(2);
  }
  const date = today();
  let text = readState().replace(/(\*\*UPDATED:\*\* )\S+/, `$1${date}`);
  text = text.replace(/\n*$/, '\n') + `- ${date} | ${author} | ${message.replace(/\s+/g, ' ').trim()}\n`;
  writeFileSync(STATE_FILE, text);
  console.log(`${STATE_FILE}: UPDATED → ${date}, строка добавлена в CHANGELOG`);
}

const [command, ...args] = process.argv.slice(2);
if (command === 'check') check();
else if (command === 'summary') summary();
else if (command === 'section') printSection(args[0]);
else if (command === 'log') log(args[0], args.slice(1).join(' '));
else {
  console.error('Команды: check | summary | section <id> | log <кто> "<что>"');
  process.exit(2);
}
