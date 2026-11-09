/* global process, console */
// Механическая проверка «железных правил» AGENTS.md, которые не ловит eslint.
//
//   npm run rules                      — только изменённые/новые файлы (git diff HEAD + untracked)
//   npm run rules -- --all             — весь src/
//   npm run rules -- --update-baseline — пересчитать baseline: счётчики только УМЕНЬШАЮТСЯ
//                                        (выполнили R-DOM/R-MOD — долг ушёл из файла)
//   npm run rules -- --init-baseline   — записать baseline с нуля (только по решению владельца)
//
// Вывод: «✅ rules OK» или список нарушений `файл:строка — правило`.
// Суждение (CommandBus, русские комментарии со ссылкой на T-xxx/D-x/ADR) —
// за агентом-ревьюером, скрипт его не делает.
//
// R-GOV-4: правила с baseline (`rules-baseline.json`, счётчик «файл → правило → число»).
// Число вхождений в файле ≤ baseline — предупреждение (старый долг), больше — ошибка
// (новое нарушение). Ложное срабатывание — маркер на той же или предыдущей строке:
//   // rules-allow: <id правила> — <причина>
// Ослаблять правило ради зелёного нельзя (AGENTS.md §4).

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const BASELINE_FILE = 'scripts/agent/rules-baseline.json';
const MAX_LINES = 400;

const all = process.argv.includes('--all');
const initBaseline = process.argv.includes('--init-baseline');
const updateBaseline = initBaseline || process.argv.includes('--update-baseline');
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const list = (text) => text.split('\n').filter(Boolean);

const changed = [
  ...list(git('diff', '--name-only', 'HEAD')),
  ...list(git('ls-files', '--others', '--exclude-standard')),
];
const files = all || updateBaseline ? list(git('ls-files', 'src')) : [...new Set(changed)];

const issues = [];
const warnings = [];

// Правило: старые тесты отключены, их не трогаем; новые тесты не пишем [owner 2026-10-13]
for (const file of changed) {
  if (file.endsWith('.disabled')) issues.push(`${file} — изменён отключённый тест (*.disabled не трогаем)`);
  if (/\.(test|spec)\.[jt]sx?$/.test(file)) issues.push(`${file} — новый тест (тесты не пишем)`);
}

// Строгие правила: нарушение — всегда ошибка.
const RULES = [
  {
    re: /['"]@material-ui\/icons/,
    msg: 'иконка мимо таблицы — только editorIcons из presentation/icons/editor-icons.ts',
    skip: (file) => file === 'src/presentation/icons/editor-icons.ts',
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

const CYRILLIC = /[А-Яа-яЁё]/;
const inPresentation = (file) => file.startsWith('src/presentation/');
// Сообщения Error — исключение: они разработчику, не пользователю (R-GOV-4).
const cyrillicText = (code, ctx) =>
  CYRILLIC.test(code) && !/Error\(/.test(code) && !/Error\(\s*$/.test(ctx.prevCode);
// `kind` у результата решения domain (decision, condition) — сужение union, а не вид сущности.
const RESULT_KIND = /\b(decision|condition)\??\.kind\b/g;

// Правила с baseline (R-GOV-4). `test(code, ctx)` — по строке кода без комментариев.
const BASELINE_RULES = [
  {
    id: 'cyrillic-presentation',
    msg: 'текст на русском в presentation вне labels/ — в editor-labels.ts (§4c, R-DOM-9)',
    applies: (file) => inPresentation(file) && !file.startsWith('src/presentation/labels/'),
    test: cyrillicText,
  },
  {
    id: 'cyrillic-domain',
    msg: 'текст на русском в domain — значение, а подпись в editor-labels.ts (§4c, R-DOM-9)',
    applies: (file) => file.startsWith('src/domain/'),
    test: cyrillicText,
  },
  {
    id: 'kind-branch',
    msg: 'ветвление по kind в presentation — таблица или функция domain (§4b, R-DOM)',
    applies: inPresentation,
    test: (raw) => {
      const code = raw.replace(RESULT_KIND, 'result');
      return (
        /\bkind\s*[!=]==?\s*['"`]/.test(code) ||
        /['"`]\s*[!=]==?\s*[\w$.?]*\bkind\b/.test(code) ||
        /\bswitch\s*\([^)]*\bkind\b/.test(code)
      );
    },
  },
  {
    id: 'length-compare',
    msg: 'сравнение .steps/.elements/.options.length с числом — факт domain (§4c, R-DOM)',
    applies: inPresentation,
    test: (code) =>
      /\b(steps|elements|options)\??\.length\s*([<>]=?|[!=]==?)\s*\d/.test(code) ||
      /\d\s*([<>]=?|[!=]==?)\s*[\w$.?]*\b(steps|elements|options)\??\.length\b/.test(code),
  },
  {
    id: 'keydown',
    msg: 'свой keydown вне features/hotkeys — хоткеи только через систему хоткеев (§4)',
    applies: (file) => inPresentation(file) && !file.startsWith('src/presentation/features/hotkeys/'),
    test: (code) =>
      /\bonKey(Down|Up)\b/.test(code) || /addEventListener\(\s*['"`]key(down|up)['"`]/.test(code),
  },
  {
    id: 'confirm-alert',
    msg: 'confirm()/alert() — диалог MUI (R-MOD-5)',
    applies: () => true,
    test: (code) =>
      /(?<![\w$.])(?:window\.)?(?:confirm|alert)\s*\(/.test(code) &&
      !/function\s+(confirm|alert)\b/.test(code),
  },
];

// Импорт Box — по файлу целиком: импорт бывает многострочным (AGENTS.md §4, R-BOX).
const BOX_IMPORT =
  /import\s*\{[^}]*\bBox\b[^}]*\}\s*from\s*['"]@material-ui\/core['"]|from\s*['"]@material-ui\/core\/Box['"]/g;

// Код строки без комментариев (строки и шаблоны сохраняются). Состояние «внутри /* */»
// и «внутри шаблона» переносится между строками; '…' и "…" — нет.
function stripComments(lines) {
  let block = false;
  let template = false;
  return lines.map((line) => {
    let out = '';
    let quote = template ? '`' : null;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      const next = line[i + 1];
      if (block) {
        if (ch === '*' && next === '/') {
          block = false;
          i++;
        }
        continue;
      }
      if (quote) {
        out += ch;
        if (ch === '\\') {
          out += next ?? '';
          i++;
        } else if (ch === quote) quote = null;
        continue;
      }
      if (ch === '/' && next === '/') break;
      if (ch === '/' && next === '*') {
        block = true;
        i++;
        continue;
      }
      if (ch === "'" || ch === '"' || ch === '`') quote = ch;
      out += ch;
    }
    template = quote === '`';
    return out;
  });
}

// Маркер-исключение на той же или предыдущей строке. Без причины — ошибка.
function allowed(rawLines, index, id, file) {
  for (const i of [index, index - 1]) {
    const m = rawLines[i]?.match(/rules-allow:\s*([\w-]+)(.*)/);
    if (!m || m[1] !== id) continue;
    if (!/[—–-]\s*\S/.test(m[2])) issues.push(`${file}:${i + 1} — маркер rules-allow: ${id} без причины`);
    return true;
  }
  return false;
}

const baseline = initBaseline
  ? {}
  : existsSync(BASELINE_FILE)
    ? JSON.parse(readFileSync(BASELINE_FILE, 'utf8'))
    : {};
const current = {};

for (const file of files) {
  if (!file.startsWith('src/') || !/\.(tsx?|jsx?|css)$/.test(file) || !existsSync(file)) continue;
  const text = readFileSync(file, 'utf8');
  const lines = text.split('\n');
  lines.forEach((line, index) => {
    for (const rule of RULES) {
      if (rule.skip?.(file)) continue;
      if (rule.re.test(line)) issues.push(`${file}:${index + 1} — ${rule.msg}`);
    }
  });
  if (!/\.(tsx?|jsx?)$/.test(file)) continue;

  const hits = {};
  const add = (id, lineNo, msg) => (hits[id] ??= { msg, lines: [] }).lines.push(lineNo);
  const code = stripComments(lines);
  code.forEach((c, index) => {
    for (const rule of BASELINE_RULES) {
      if (!rule.applies(file) || !rule.test(c, { prevCode: code[index - 1] ?? '' })) continue;
      if (!allowed(lines, index, rule.id, file)) add(rule.id, index + 1, rule.msg);
    }
  });
  for (const m of text.matchAll(BOX_IMPORT)) {
    const index = text.slice(0, m.index).split('\n').length - 1;
    if (!allowed(lines, index, 'box-import', file))
      add('box-import', index + 1, 'импорт Box — div + makeStyles (AGENTS.md §4, R-BOX)');
  }

  const counts = Object.fromEntries(Object.entries(hits).map(([id, h]) => [id, h.lines.length]));
  const size = text.endsWith('\n') ? lines.length - 1 : lines.length;
  if (size > MAX_LINES) counts.lines = size;
  if (Object.keys(counts).length) current[file] = counts;

  const base = initBaseline ? counts : (baseline[file] ?? {});
  for (const [id, h] of Object.entries(hits)) {
    const where = `${file}:${h.lines.join(',')} — [${id}] ${h.msg}`;
    if (h.lines.length > (base[id] ?? 0))
      issues.push(`${where} (было ${base[id] ?? 0}, стало ${h.lines.length})`);
    else warnings.push(where);
  }
  if (size > MAX_LINES) {
    const msg = `${file} — [lines] ${size} строк > ${MAX_LINES} (R-MOD)`;
    if (size > (base.lines ?? MAX_LINES))
      issues.push(`${msg}: файл растёт (было ${base.lines ?? MAX_LINES})`);
    else warnings.push(msg);
  }
}

if (updateBaseline) {
  // Только уменьшение: новый долг в baseline не вносится — его исправляют или ставят маркер.
  const next = initBaseline ? current : {};
  if (!initBaseline)
    for (const [file, counts] of Object.entries(baseline)) {
      for (const [id, was] of Object.entries(counts)) {
        const now = Math.min(was, current[file]?.[id] ?? 0);
        if (now > 0 && (id !== 'lines' || now > MAX_LINES)) (next[file] ??= {})[id] = now;
      }
    }
  writeFileSync(BASELINE_FILE, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`baseline обновлён: ${Object.keys(next).length} файлов`);
}

if (warnings.length) {
  console.log(`⚠️ rules: ${warnings.length} старых нарушений (baseline, R-GOV-4)`);
  if (all) console.log(warnings.slice(0, 40).join('\n'));
  else console.log(warnings.join('\n'));
  if (all && warnings.length > 40) console.log(`… ещё ${warnings.length - 40}`);
}

if (issues.length === 0) {
  console.log(`✅ rules OK (${all ? 'весь src' : `${files.length} изменённых файлов`})`);
} else {
  console.log(`❌ rules: ${issues.length} нарушений`);
  console.log(issues.slice(0, 40).join('\n'));
  if (issues.length > 40) console.log(`… ещё ${issues.length - 40}`);
  process.exitCode = 1;
}
