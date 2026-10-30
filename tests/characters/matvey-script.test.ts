// Сценарий озвучки Матвея (docs/voice/matvey-script.md) совпадает с каталогом реплик, а каждая категория
// либо вызывается настоящим событием домино, либо явно помечена в сценарии как предложение на будущее.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Director } from '../../src/characters/director';
import { MATVEY_LINES } from '../../src/characters/matvey/lines';
import { MATVEY_MOTION } from '../../src/characters/matvey/motions';
import { VoiceChannel, type VoicePlayer } from '../../src/audio/voiceChannel';
import { createRng } from '../../src/core/rng';
import type { LineCategory, VoicePriority } from '../../src/characters/types';

const ROOT = join(import.meta.dirname, '../..');
const DOC = readFileSync(join(ROOT, 'docs/voice/matvey-script.md'), 'utf8');
const SOURCES = ['src/games/dominoes/reactions.ts', 'src/games/dominoes/session.ts', 'src/games/dominoes/tutorial.ts'].map((f) => readFileSync(join(ROOT, f), 'utf8')).join('\n');

/** Строки таблиц сценария: ID → { текст, категория раздела }. */
function parseDoc() {
  const rows = new Map<string, { text: string; category: string }>();
  const proposals = new Set<string>();
  let category = '';
  for (const line of DOC.split('\n')) {
    const h = /^### .* — `([A-Za-z_]+)`$/.exec(line);
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
      // Категория сценки — scene_<id> настоящей сценки Матвея (src/characters/matvey/scenes.ts).
      const used = c.startsWith('scene_') ? (MATVEY_MOTION.scenes ?? []).some((x) => `scene_${x.id}` === c) : SOURCES.includes(`'${c}'`);
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

  it('шквал событий: реплики Матвея не звучат одновременно и не повторяются чаще кулдауна', () => {
    // Те же настройки, что в сеансе домино (session.ts): 9 с между фоновыми репликами, 120 с на повтор реплики.
    let now = 0;
    const playing = new Set<string>();
    let overlap = 0;
    const ends: (() => void)[] = [];
    const player: VoicePlayer = {
      play(id, onEnd) {
        if (playing.size > 0) overlap++;
        playing.add(id);
        const end = () => {
          if (playing.delete(id)) onEnd();
        };
        ends.push(end);
        return { stop: end };
      },
    };
    const voice = new VoiceChannel(player, () => now);
    const d = new Director({ lines: MATVEY_LINES, minGapMs: 9000, lineCooldownMs: 120_000, available: () => true }, createRng(9));
    const lastAt = new Map<string, number>();
    const events: [LineCategory, VoicePriority][] = [['fish', 'reaction'], ['handWin', 'reaction'], ['playerPlay', 'reaction'], ['win', 'result'], ['rematch', 'greeting'], ['nvHmm', 'idle'], ['fish', 'reaction'], ['greetAgain', 'greeting']];
    for (let step = 0; step < 400; step++) {
      now += 700;
      // Каждая третья реплика успевает закончиться, остальные прерываются или ждут.
      if (step % 3 === 0) ends.shift()?.();
      const [category, priority] = events[step % events.length]!;
      const cue = d.react({ category, emotion: 'warm', priority, chance: 1 }, now);
      if (!cue.line) continue;
      const prev = lastAt.get(cue.line.id);
      if (prev !== undefined) expect(now - prev, cue.line.id).toBeGreaterThanOrEqual(120_000);
      lastAt.set(cue.line.id, now);
      voice.request(cue.line.id, cue.line.priority);
      expect(playing.size).toBeLessThanOrEqual(1);
    }
    expect(overlap).toBe(0);
    expect(lastAt.size).toBeGreaterThan(5);
  });
});
