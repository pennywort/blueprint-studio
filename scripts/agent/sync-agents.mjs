/* global console */
// Порт субагентов Claude Code (.claude/agents/*.md — источник правды) в Qwen Code
// (.qwen/agents/*.md). Тело промпта копируется как есть; из frontmatter
// остаются только name и description: имена инструментов и моделей у CLI
// разные, без поля tools Qwen даёт субагенту все свои инструменты.
//
//   npm run agents:sync      — после любой правки .claude/agents/*

import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const SRC = '.claude/agents';
const DST = '.qwen/agents';

rmSync(DST, { recursive: true, force: true });
mkdirSync(DST, { recursive: true });

for (const file of readdirSync(SRC).filter((name) => name.endsWith('.md'))) {
  const text = readFileSync(`${SRC}/${file}`, 'utf8');
  const match = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error(`${SRC}/${file}: нет frontmatter`);
  const [, front, body] = match;
  const keep = front.split('\n').filter((line) => /^(name|description):/.test(line));
  const header = `\n<!-- СГЕНЕРИРОВАНО из ${SRC}/${file} командой npm run agents:sync — не править вручную -->\n`;
  writeFileSync(`${DST}/${file}`, `---\n${keep.join('\n')}\n---\n${header}${body}`);
  console.log(`${SRC}/${file} → ${DST}/${file}`);
}
