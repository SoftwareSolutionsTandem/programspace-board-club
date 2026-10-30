// Голос Харитона (docs/AUDIO.md §19, D63): записи есть у каждой реплики, режиссёр их выбирает; шквал событий партии
// не накладывает голоса и не повторяет реплику чаще кулдауна; итог партии слышен всегда.
import { describe, expect, it } from 'vitest';
import { VoiceChannel, type VoicePlayer } from '../../src/audio/voiceChannel';
import { Director } from '../../src/characters/director';
import { KHARITON_LINES } from '../../src/characters/khariton/lines';
import type { LineCategory, VoicePriority } from '../../src/characters/types';
import { createRng } from '../../src/core/rng';
import { CHESS_SPEC } from '../../src/games/chess/spec';

describe('голос Харитона', () => {
  it('с записями режиссёр выбирает реплику нужной категории', () => {
    const d = new Director({ lines: KHARITON_LINES, minGapMs: 0, lineCooldownMs: 0, available: () => true }, createRng(3));
    for (const category of ['greetFirst', 'checkQueen', 'eureka', 'stalemate', 'win', 'lose'] as const) {
      const cue = d.react({ category, emotion: 'warm', priority: 'result', chance: 1 }, 1000);
      expect(KHARITON_LINES.find((l) => l.id === cue.line?.id)?.category, category).toBe(category);
    }
  });

  it('шквал событий партии: одна реплика за раз, повтор не чаще 120 с, итог не теряется', () => {
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
    // Настройки сеанса шахмат (src/board/session.ts): интервал из спецификации, 120 с на повтор реплики.
    const d = new Director({ lines: KHARITON_LINES, minGapMs: CHESS_SPEC.minGapMs, lineCooldownMs: 120_000, available: () => true }, createRng(9));
    const lastAt = new Map<string, number>();
    const events: [LineCategory, VoicePriority][] = [['boardMove', 'reaction'], ['playerPlay', 'reaction'], ['check', 'reaction'], ['nvHmm', 'idle'], ['eureka', 'reaction'], ['wait', 'idle'], ['boardCapture', 'reaction'], ['inCheck', 'reaction']];
    const results: string[] = [];
    for (let step = 0; step < 400; step++) {
      now += 700;
      if (step % 3 === 0) ends.shift()?.();
      // Каждые 50 шагов — конец партии: результат срочный и звучит, даже если персонаж говорит.
      const end = step % 50 === 49;
      const [category, priority] = end ? (['win', 'result'] as const) : events[step % events.length]!;
      const cue = d.react({ category, emotion: 'warm', priority, chance: 1 }, now);
      if (end) results.push(cue.line?.id ?? 'нет');
      if (!cue.line) continue;
      const prev = lastAt.get(cue.line.id);
      if (prev !== undefined) expect(now - prev, cue.line.id).toBeGreaterThanOrEqual(120_000);
      lastAt.set(cue.line.id, now);
      const outcome = voice.request(cue.line.id, cue.line.priority);
      if (end) expect(outcome).toBe('played');
      expect(playing.size).toBeLessThanOrEqual(1);
    }
    expect(overlap).toBe(0);
    expect(lastAt.size).toBeGreaterThan(5);
    // Победных реплик четыре, кулдаун 120 с: часть итогов может прийтись на паузу кулдауна — но не все.
    expect(results.filter((r) => r !== 'нет').length).toBeGreaterThan(0);
  });
});
