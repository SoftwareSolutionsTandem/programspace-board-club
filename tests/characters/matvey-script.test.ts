// Сценарий озвучки Матвея (docs/voice/matvey-script.md) совпадает с каталогом реплик, а каждая категория
// либо вызывается настоящим событием домино, либо явно помечена в сценарии как предложение на будущее.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Director } from '../../src/characters/director';
import { MATVEY_LINES } from '../../src/characters/matvey/lines';
import { createRng } from '../../src/core/rng';

const ROOT = join(import.meta.dirname, '../..');
const DOC = readFileSync(join(ROOT, 'docs/voice/matvey-script.md'), 'utf8');
const SOURCES = ['src/games/dominoes/reactions.ts', 'src/games/dominoes/session.ts', 'src/games/dominoes/tutorial.ts'].map((f) => readFileSync(join(ROOT, f), 'utf8')).join('\n');

/** Строки таблиц сценария: ID → { текст, категория раздела }. */
function parseDoc() {
  const rows = new Map<string, { text: string; category: string }>();
  const proposals = new Set<string>();
  let category = '';
  for (const line of DOC.split('\n')) {
    const h = /^### .* — `([A-Za-z]+)`$/.exec(line);
    if (h) category = h[1]!;
    if (category && line.startsWith('- Условие:') && line.includes('**предложение на будущее**')) proposals.add(category);
    const r = /^\| `(matvey_[a-z0-9_]+)` \| ([^|]+) \|/.exec(line);
    if (r) {
      expect(rows.has(r[1]!), `повтор ${r[1]}`).toBe(false);
      rows.set(r[1]!, { text: r[2]!.trim(), category });
    }
  }
  return { rows, proposals };
}

describe('сценарий озвучки Матвея', () => {
  const { rows, proposals } = parseDoc();

  it('каждая реплика каталога есть в сценарии с тем же текстом и категорией, лишних нет', () => {
    expect([...rows.keys()].sort()).toEqual(MATVEY_LINES.map((l) => l.id).sort());
    for (const l of MATVEY_LINES) expect(rows.get(l.id), l.id).toEqual({ text: l.text, category: l.category });
  });

  it('у реплик стабильные уникальные ID с префиксом matvey_', () => {
    const ids = MATVEY_LINES.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^matvey_[a-z0-9_]+$/);
  });

  it('категория вызывается событием домино или помечена как предложение', () => {
    for (const c of new Set(MATVEY_LINES.map((l) => l.category))) {
      const used = SOURCES.includes(`'${c}'`);
      expect(used || proposals.has(c), `${c}: нет события и нет пометки «предложение»`).toBe(true);
      // Предложение не должно уже вызываться кодом — иначе пометка устарела.
      if (proposals.has(c)) expect(used, `${c} вызывается, а помечена как предложение`).toBe(false);
    }
  });

  it('без записанных файлов Матвей молчит: режиссёр отдаёт только мимику и жест', () => {
    const d = new Director({ lines: MATVEY_LINES, minGapMs: 0, lineCooldownMs: 0, available: () => false }, createRng(5));
    for (const category of ['greetFirst', 'fish', 'win', 'handLose'] as const) {
      const cue = d.react({ category, emotion: 'warm', gesture: 'slap', priority: 'result', chance: 1 }, 1000);
      expect(cue.line).toBeUndefined();
      expect(cue.gesture).toBe('slap');
    }
  });
});
