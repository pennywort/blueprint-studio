/* global process, console, setTimeout, fetch, URL */
// Ручная проверка UI для агентов ТЕКСТОМ, а не скриншотами (экономия контекста).
// Скриншот — только по явному шагу --shot, и лучше кадрировать по элементу.
//
//   npm run ui -- [--url <url>] <шаги...>
//
// Шаги выполняются по порядку:
//   --wait <css|мс>        ждать селектор (до 10 с) или паузу в мс
//   --click <css>          клик по первому совпадению
//   --dblclick <css>       двойной клик
//   --key <клавиша>        нажать клавишу (Delete, Escape, Control+z …)
//   --type <текст>         ввести текст в элемент с фокусом
//   --count <css>          напечатать число совпадений
//   --text <css>           напечатать текст первого совпадения (до 200 символов)
//   --exists <css>         FAIL, если совпадений нет
//   --absent <css>         FAIL, если совпадения есть
//   --eval <js>            выполнить выражение в странице, напечатать результат (JSON)
//   --upload <css>=<файл>  выбрать файл в <input type=file> (импорт проекта JSON:
//                          --url http://localhost:3123/#/ --upload "[data-testid=project-import-input]=bug.json")
//   --shot <файл>[@<css>]  скриншот (кадр по элементу, если указан css)
//
// По умолчанию url = http://localhost:3123/#/editor. Если dev-сервер не
// отвечает — скрипт сам поднимет `npx rsbuild dev --port 3123` и погасит его.
// В конце — ошибки консоли страницы (без дублей, до 10). Код выхода 1, если
// был FAIL или ошибки страницы.
//
// Пример: npm run ui -- --count ".react-flow__node" --click "text=Главная" --exists ".selected"

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createRequire } from 'node:module';

const argv = process.argv.slice(2);
let url = 'http://localhost:3123/#/editor';
const steps = [];
for (let i = 0; i < argv.length; i += 1) {
  const flag = argv[i];
  if (!flag.startsWith('--')) continue;
  const value = argv[i + 1];
  i += 1;
  if (flag === '--url') url = value;
  else steps.push([flag.slice(2), value]);
}

// Playwright: из проекта, из PLAYWRIGHT_MODULE или из облачного окружения Claude Code
function loadPlaywright() {
  const require = createRequire(import.meta.url);
  const candidates = [
    'playwright',
    process.env.PLAYWRIGHT_MODULE,
    '/opt/node-tools/node_modules/playwright',
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch {
      /* следующий кандидат */
    }
  }
  console.error('❌ playwright не найден. Укажи путь: PLAYWRIGHT_MODULE=/путь/к/node_modules/playwright');
  process.exit(2);
}

async function reachable(target) {
  try {
    const response = await fetch(target.split('#')[0]);
    return response.ok;
  } catch {
    return false;
  }
}

async function ensureServer() {
  if (await reachable(url)) return null;
  const port = new URL(url).port || '3123';
  const server = spawn('npx', ['rsbuild', 'dev', '--port', port], {
    stdio: 'ignore',
    detached: true,
    env: { ...process.env, NO_COLOR: '1' },
  });
  for (let waited = 0; waited < 90; waited += 1) {
    if (await reachable(url)) return server;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  process.kill(-server.pid);
  console.error(`❌ dev-сервер не поднялся за 90 с на порту ${port}`);
  process.exit(2);
}

const { chromium } = loadPlaywright();
const server = await ensureServer();
const executablePath = existsSync('/opt/pw-browsers/chromium/chrome')
  ? '/opt/pw-browsers/chromium/chrome'
  : undefined;
const browser = await chromium
  .launch(executablePath ? { executablePath } : {})
  .catch(() => chromium.launch());
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

// Известный шум шимов MUI v4 под React 19 (TEMPORARY, реестр подмен AGENTS.md) — не ошибки приложения
const KNOWN_NOISE = [/createMuiTheme function was renamed/, /Accessing element\.ref was removed/];
const pageErrors = new Set();
page.on('console', (message) => {
  const text = message.text().split('\n')[0];
  if (message.type() === 'error' && !KNOWN_NOISE.some((re) => re.test(text)))
    pageErrors.add(text.slice(0, 200));
});
page.on('pageerror', (error) => pageErrors.add(`pageerror: ${error.message.slice(0, 200)}`));

let failed = false;
const say = (line) => console.log(line);

try {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  say(`url ${url}`);
  for (const [step, value] of steps) {
    try {
      if (step === 'wait') {
        if (/^\d+$/.test(value)) await page.waitForTimeout(Number(value));
        else await page.waitForSelector(value, { timeout: 10000 });
        say(`wait ${value} — ok`);
      } else if (step === 'click') {
        await page.locator(value).first().click({ timeout: 5000 });
        say(`click ${value} — ok`);
      } else if (step === 'dblclick') {
        await page.locator(value).first().dblclick({ timeout: 5000 });
        say(`dblclick ${value} — ok`);
      } else if (step === 'key') {
        await page.keyboard.press(value);
        say(`key ${value} — ok`);
      } else if (step === 'type') {
        await page.keyboard.type(value);
        say(`type «${value}» — ok`);
      } else if (step === 'count') {
        say(`count ${value} = ${await page.locator(value).count()}`);
      } else if (step === 'text') {
        const text = (await page.locator(value).first().innerText({ timeout: 5000 })).replace(/\s+/g, ' ');
        say(`text ${value} = «${text.slice(0, 200)}»`);
      } else if (step === 'exists' || step === 'absent') {
        const count = await page.locator(value).count();
        const ok = step === 'exists' ? count > 0 : count === 0;
        failed ||= !ok;
        say(`${step} ${value} — ${ok ? 'ok' : `FAIL (найдено ${count})`}`);
      } else if (step === 'eval') {
        // eslint-disable-next-line no-new-func
        const result = await page.evaluate((code) => new Function(`return (${code})`)(), value);
        // Выражение не повторяем целиком — длинный скрипт засорял вывод.
        const head = value.replace(/\s+/g, ' ').trim();
        say(`eval ${head.length > 60 ? `${head.slice(0, 60)}…` : head} = ${JSON.stringify(result)?.slice(0, 300)}`);
      } else if (step === 'upload') {
        const split = value.lastIndexOf('='); // последний «=»: в css-селекторе он тоже бывает
        await page.locator(value.slice(0, split)).first().setInputFiles(value.slice(split + 1), { timeout: 5000 });
        say(`upload ${value} — ok`);
      } else if (step === 'shot') {
        const [file, selector] = value.split('@');
        mkdirSync(dirname(file), { recursive: true });
        if (selector) await page.locator(selector).first().screenshot({ path: file, timeout: 5000 });
        else await page.screenshot({ path: file });
        say(`shot ${file} — сохранён (открывай, только если текстовых проверок мало)`);
      } else {
        say(`? неизвестный шаг --${step}`);
        failed = true;
      }
    } catch (error) {
      failed = true;
      say(`${step} ${value} — FAIL: ${String(error.message).split('\n')[0].slice(0, 200)}`);
    }
  }
} catch (error) {
  failed = true;
  say(`FAIL: ${String(error.message).split('\n')[0]}`);
} finally {
  await browser.close();
  if (server) process.kill(-server.pid);
}

const errors = [...pageErrors];
say(
  errors.length
    ? `⚠️ ошибки консоли (${errors.length}):\n${errors.slice(0, 10).join('\n')}`
    : 'консоль: без ошибок',
);
say(failed || errors.length ? '❌ ui FAIL' : '✅ ui OK');
process.exitCode = failed || errors.length ? 1 : 0;
