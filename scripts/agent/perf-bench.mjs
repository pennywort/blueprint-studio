/* global process, console, setTimeout, clearTimeout, fetch, document, performance, requestAnimationFrame, window, MutationObserver, PerformanceObserver */
// Замеры производительности канваса на стенде (R-PERF-0, docs/refactoring/R-PERF-canvas.md).
// Это НЕ тест (AGENTS.md §4): ничего не проверяет, только печатает цифры «до/после».
//
//   node scripts/agent/perf-bench.mjs [--size "<query>"] [--runs N] [--no-build] [--cpu N]
//
//   --size     query стенда без «?», напр. "pagesPerLevel=125" (по умолчанию — стенд как есть)
//   --runs     повторов каждого сценария (медиана), по умолчанию 3
//   --no-build не пересобирать dist (сборка — `npm run build`, прод-режим React)
//   --cpu      замедление CPU через CDP (1 = без замедления)
//
// Метрики: load — от навигации до «тишины» DOM (500 мс без мутаций); cmd — Delete
// карточки и mod+z до «тишины» DOM (150 мс); zoom / pan / drag / clickLink — кадры за
// сценарий: fps, худший кадр (мс), TBT — сумма long tasks сверх 50 мс.

import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const index = argv.indexOf(`--${name}`);
  return index === -1 ? fallback : argv[index + 1];
};
const size = flag('size', '');
const runs = Number(flag('runs', '3'));
const cpu = Number(flag('cpu', '1'));
const port = '3124';
const url = `http://localhost:${port}/#/editor?project=stress${size ? `&${size}` : ''}`;

if (!argv.includes('--no-build')) {
  const build = spawnSync('npm', ['run', 'build'], { encoding: 'utf8' });
  if (build.status !== 0) {
    console.log('❌ сборка не прошла: npm run build');
    process.exit(1);
  }
}

function loadPlaywright() {
  const require = createRequire(import.meta.url);
  for (const candidate of ['playwright', process.env.PLAYWRIGHT_MODULE, '/opt/node-tools/node_modules/playwright']) {
    if (!candidate) continue;
    try {
      return require(candidate);
    } catch {
      /* следующий кандидат */
    }
  }
  console.log('❌ playwright не найден');
  process.exit(1);
}

async function waitServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      if ((await fetch(`http://localhost:${port}/`)).ok) return;
    } catch {
      /* ещё поднимается */
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('preview-сервер не поднялся');
}

const server = spawn('npx', ['rsbuild', 'preview', '--port', port], { stdio: 'ignore', detached: true });
const stopServer = () => {
  try {
    process.kill(-server.pid);
  } catch {
    /* уже остановлен */
  }
};

// Счётчик кадров и long tasks в странице: start → действие → stop.
const PROBE = () => {
  const probe = { frames: [], longTasks: 0, running: false };
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (probe.running) probe.longTasks += Math.max(0, entry.duration - 50);
    }
  }).observe({ type: 'longtask', buffered: false });
  const tick = (time) => {
    if (!probe.running) return;
    probe.frames.push(time);
    requestAnimationFrame(tick);
  };
  window.__bench = {
    start() {
      probe.frames = [];
      probe.longTasks = 0;
      probe.running = true;
      probe.startedAt = performance.now();
      requestAnimationFrame(tick);
    },
    stop() {
      probe.running = false;
      const duration = performance.now() - probe.startedAt;
      let worst = 0;
      for (let i = 1; i < probe.frames.length; i += 1) worst = Math.max(worst, probe.frames[i] - probe.frames[i - 1]);
      return { fps: (probe.frames.length / duration) * 1000, worst, tbt: probe.longTasks };
    },
    // Тишина DOM: resolve через quiet мс после последней мутации; возвращает время от вызова до последней мутации.
    // Замер действия: watch() — до действия (наблюдатель уже стоит, гонки с
    // нажатием нет), settle() — после: время от watch до последней мутации,
    // когда DOM затих на quietMs (0 — мутаций не было за 2 с).
    watch() {
      const state = { start: performance.now(), last: null };
      const observer = new MutationObserver(() => {
        state.last = performance.now();
      });
      observer.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
      window.__benchWatch = { state, observer };
    },
    settle(quietMs) {
      const { state, observer } = window.__benchWatch;
      return new Promise((resolve) => {
        const poll = () => {
          const now = performance.now();
          const quietEnough = state.last !== null && now - state.last >= quietMs;
          if (quietEnough || (state.last === null && now - state.start > 2000)) {
            observer.disconnect();
            resolve(state.last === null ? 0 : state.last - state.start);
            return;
          }
          setTimeout(poll, 10);
        };
        poll();
      });
    },
    quiet(quietMs) {
      return new Promise((resolve) => {
        const started = performance.now();
        let last = started;
        let timer = null;
        const done = () => {
          observer.disconnect();
          resolve(last - started);
        };
        const observer = new MutationObserver(() => {
          last = performance.now();
          clearTimeout(timer);
          timer = setTimeout(done, quietMs);
        });
        observer.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
        timer = setTimeout(done, quietMs);
      });
    },
  };
};

const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const round = (value) => Math.round(value);

async function main() {
  await waitServer();
  const { chromium } = loadPlaywright();
  const executablePath = existsSync('/opt/pw-browsers/chromium/chrome') ? '/opt/pw-browsers/chromium/chrome' : undefined;
  const browser = await chromium.launch(executablePath ? { executablePath } : {});
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await page.addInitScript(PROBE);
  if (cpu > 1) {
    const session = await page.context().newCDPSession(page);
    await session.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  }
  const result = { load: [], cmdDelete: [], cmdUndo: [], zoom: [], pan: [], drag: [], clickLink: [] };

  // Центр области без узлов и рёбер — для pan полотна.
  const panePoint = () =>
    page.evaluate(() => {
      for (let y = 120; y < window.innerHeight - 120; y += 40) {
        for (let x = 120; x < window.innerWidth - 120; x += 40) {
          const hit = document.elementFromPoint(x, y);
          if (hit?.classList.contains('react-flow__pane')) return { x, y };
        }
      }
      return null;
    });
  const measure = async (action) => {
    await page.evaluate(() => window.__bench.start());
    await action();
    return page.evaluate(() => window.__bench.stop());
  };
  const moveBy = async (from, dx, dy, steps) => {
    for (let i = 1; i <= steps; i += 1) await page.mouse.move(from.x + (dx * i) / steps, from.y + (dy * i) / steps);
  };

  for (let run = 0; run < runs; run += 1) {
    // Через пустую страницу: переход на тот же hash-адрес страницу не перезагружает.
    await page.goto('about:blank');
    const navigated = Date.now();
    await page.goto(url);
    await page.waitForSelector('.react-flow__node', { timeout: 60000 });
    await page.evaluate(() => window.__bench.quiet(500));
    result.load.push(Date.now() - navigated - 500);
    const nodes = await page.locator('.react-flow__node').count();
    const cards = await page.locator('[data-element-card]').count();
    result.counts = { nodes, cards };

    // Команда: выделить карточку → Delete → mod+z.
    // Карточка в видимой части канваса (вне вьюпорта клик не доходит).
    const cardPoint = await page.evaluate(() => {
      for (const card of document.querySelectorAll('[data-element-card]')) {
        const rect = card.getBoundingClientRect();
        const inside =
          rect.top > 100 && rect.bottom < window.innerHeight - 100 && rect.left > 100 && rect.right < window.innerWidth - 100;
        if (inside && rect.width > 20) return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      }
      return null;
    });
    if (!cardPoint) throw new Error('нет видимой карточки элемента');
    await page.mouse.click(cardPoint.x, cardPoint.y);
    await page.evaluate(() => window.__bench.quiet(150));
    await page.evaluate(() => window.__bench.watch());
    await page.keyboard.press('Delete');
    result.cmdDelete.push(await page.evaluate(() => window.__bench.settle(150)));
    await page.evaluate(() => window.__bench.watch());
    await page.keyboard.press('ControlOrMeta+z');
    result.cmdUndo.push(await page.evaluate(() => window.__bench.settle(150)));

    const point = (await panePoint()) ?? { x: 800, y: 500 };
    await page.mouse.move(point.x, point.y);
    result.zoom.push(
      await measure(async () => {
        for (let i = 0; i < 20; i += 1) await page.mouse.wheel(0, i < 10 ? -120 : 120);
        await page.waitForTimeout(300);
      }),
    );
    result.pan.push(
      await measure(async () => {
        await page.mouse.down();
        await moveBy(point, 300, 150, 40);
        await page.mouse.up();
      }),
    );

    // Drag и клик-связь — в масштабе ~1: на вписанном стенде (зум ~0.1)
    // точки связи меньше пикселя. Приближение к верху узла с видимой шапкой:
    // точка под курсором при зуме остаётся на месте — это шапка узла.
    const header = await page.evaluate(() => {
      for (const node of document.querySelectorAll('[data-testid^="canvas-node-"]')) {
        const rect = node.getBoundingClientRect();
        const point = { x: rect.x + rect.width / 2, y: rect.y + 4 };
        const visible =
          rect.top > 60 && rect.top < window.innerHeight - 300 && point.x > 60 && point.x < window.innerWidth - 400;
        if (visible) return point;
      }
      return null;
    });
    if (header) {
      await page.mouse.move(header.x, header.y);
      for (let i = 0; i < 12; i += 1) await page.mouse.wheel(0, -120);
      await page.waitForTimeout(500);
    }

    // Drag узла по колонке и обратно (бросок — команда reorder или откат).
    if (header) {
      const from = header;
      result.drag.push(
        await measure(async () => {
          await page.mouse.move(from.x, from.y);
          await page.mouse.down();
          await moveBy(from, 260, 0, 30);
          result.dragActive = (await page.locator('.react-flow__node.dragging').count()) > 0;
          await moveBy({ x: from.x + 260, y: from.y }, -260, 0, 30);
          await page.mouse.up();
          await page.waitForTimeout(200);
        }),
      );
    }

    // Клик-связь: клик по source-handle → ведём линию → Escape.
    const handle = await page.evaluate(() => {
      for (const element of document.querySelectorAll('.react-flow__handle.source')) {
        const rect = element.getBoundingClientRect();
        const inside = rect.top > 100 && rect.bottom < window.innerHeight - 200 && rect.left > 100 && rect.right < 1000;
        if (inside && document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2) === element) {
          return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
        }
      }
      return null;
    });
    if (handle) {
      const from = { x: handle.x + handle.width / 2, y: handle.y + handle.height / 2 };
      result.clickLink.push(
        await measure(async () => {
          await page.mouse.click(from.x, from.y);
          await moveBy(from, 300, 120, 40);
          result.clickLinkActive = (await page.locator('.editor-connecting').count()) > 0;
          await page.keyboard.press('Escape');
          await page.waitForTimeout(100);
        }),
      );
    }
  }
  await browser.close();

  const frames = (list) =>
    list.length
      ? `fps ${round(median(list.map((x) => x.fps)))}, худший кадр ${round(median(list.map((x) => x.worst)))} мс, TBT ${round(median(list.map((x) => x.tbt)))} мс`
      : 'нет данных';
  console.log(`Стенд: ${url}`);
  console.log(`Узлов ${result.counts.nodes}, карточек ${result.counts.cards}; повторов ${runs}; CPU ×${cpu}`);
  console.log(`load        ${round(median(result.load))} мс`);
  console.log(`cmd Delete  ${round(median(result.cmdDelete))} мс`);
  console.log(`cmd Undo    ${round(median(result.cmdUndo))} мс`);
  console.log(`zoom        ${frames(result.zoom)}`);
  console.log(`pan         ${frames(result.pan)}`);
  console.log(`drag узла   ${frames(result.drag)}${result.dragActive ? '' : ' ⚠️ drag не начался'}`);
  console.log(`клик-связь  ${frames(result.clickLink)}${result.clickLinkActive ? '' : ' ⚠️ связь не началась'}`);
}

main()
  .catch((error) => {
    console.log(`❌ ${error.message}`);
    process.exitCode = 1;
  })
  .finally(stopServer);
