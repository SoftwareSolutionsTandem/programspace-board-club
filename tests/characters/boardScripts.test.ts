// Сценарии озвучки Харитона и Костяна (docs/voice/*-script.md) совпадают с каталогами реплик; каждая категория
// вызывается настоящим событием партии или явно помечена как предложение на будущее; без записей персонаж молчит.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Director } from '../../src/characters/director';
import { KHARITON_LINES } from '../../src/characters/khariton/lines';
import { KOSTYAN_LINES } from '../../src/characters/kostyan/lines';
import type { VoiceLine } from '../../src/characters/types';
import { createRng } from '../../src/core/rng';

const ROOT = join(import.meta.dirname, '../..');
const CASES: readonly { name: string; id: string; game: string; lines: readonly VoiceLine[] }[] = [
  { name: 'Харитона', id: 'khariton', game: 'chess', lines: KHARITON_LINES },
  { name: 'Костяна', id: 'kostyan', game: 'checkers', lines: KOSTYAN_LINES },
];

for (const c of CASES) {
  const doc = readFileSync(join(ROOT, `docs/voice/${c.id}-script.md`), 'utf8');
  const sources = ['src/board/session.ts', `src/games/${c.game}/reactions.ts`, `src/games/${c.game}/spec.ts`].map((f) => readFileSync(join(ROOT, f), 'utf8')).join('\n');
  const rows = new Map<string, { text: string; category: string; file: string; status: string }>();
  const proposals = new Set<string>();
  let category = '';
  for (const line of doc.split('\n')) {
    const h = /^### .* — `([A-Za-z]+)`$/.exec(line);
    if (h) category = h[1]!;
    if (category && line.startsWith('- Условие:') && line.includes('**предложение на будущее**')) proposals.add(category);
    const r = new RegExp(`^\\| \`(${c.id}_[a-z0-9_]+)\` \\| ([^|]+) \\|[^|]+\\|[^|]+\\|[^|]+\\| \`([^\`]+)\` \\| ([^|]+) \\|$`).exec(line);
    if (r) {
      expect(rows.has(r[1]!), `повтор ${r[1]}`).toBe(false);
      rows.set(r[1]!, { text: r[2]!.trim(), category, file: r[3]!, status: r[4]!.trim() });
    }
  }

  describe(`сценарий озвучки ${c.name}`, () => {
    it('каждая реплика каталога есть в сценарии с тем же текстом, категорией и именем файла', () => {
      expect([...rows.keys()].sort()).toEqual(c.lines.map((l) => l.id).sort());
      for (const l of c.lines) expect(rows.get(l.id), l.id).toMatchObject({ text: l.text, category: l.category, file: `${l.id}.flac` });
    });

    it('записей нет — и сценарий честно это говорит; файлов и папки голоса нет', () => {
      for (const r of rows.values()) expect(r.status).toBe('нет записи');
      expect(existsSync(join(ROOT, `public/audio/ru/${c.id}`))).toBe(false);
      const product = JSON.parse(readFileSync(join(ROOT, `src/products/${c.game}.json`), 'utf8')) as { publicAssets: string[] };
      expect(product.publicAssets).not.toContain(`audio/ru/${c.id}`);
    });

    it('категория вызывается событием партии или помечена как предложение', () => {
      for (const cat of new Set(c.lines.map((l) => l.category))) {
        const used = sources.includes(`'${cat}'`);
        expect(used || proposals.has(cat), `${cat}: нет события и нет пометки «предложение»`).toBe(true);
        if (proposals.has(cat)) expect(used, `${cat} вызывается, а помечена как предложение`).toBe(false);
      }
    });

    it('без записанных файлов режиссёр отдаёт только мимику и жест', () => {
      const d = new Director({ lines: c.lines, minGapMs: 0, lineCooldownMs: 0, available: () => false }, createRng(5));
      for (const category of ['greetFirst', 'win', 'lose', 'boardCapture'] as const) {
        const cue = d.react({ category, emotion: 'warm', gesture: 'shrug', priority: 'result', chance: 1 }, 1000);
        expect(cue.line).toBeUndefined();
        expect(cue.gesture).toBe('shrug');
      }
    });
  });
}
