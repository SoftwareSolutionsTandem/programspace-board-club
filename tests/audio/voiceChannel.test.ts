import { describe, expect, it } from 'vitest';
import { VoiceChannel, type VoicePlayer } from '../../src/audio/voiceChannel';

/** Фальшивый плеер: реплики «звучат», пока тест не завершит их вручную. */
function fakePlayer(missing: string[] = []) {
  const playing: { id: string; end: () => void; stopped: boolean }[] = [];
  const log: string[] = [];
  const player: VoicePlayer = {
    play(id, onEnd) {
      if (missing.includes(id)) return null;
      const item = { id, end: onEnd, stopped: false };
      playing.push(item);
      log.push(`play:${id}`);
      return { stop: () => { item.stopped = true; log.push(`stop:${id}`); onEnd(); } };
    },
  };
  const active = () => playing.filter((p) => !p.stopped && !(p as { ended?: boolean }).ended);
  const finish = (id: string) => {
    const p = playing.find((x) => x.id === id && !x.stopped && !(x as { ended?: boolean }).ended)!;
    (p as { ended?: boolean }).ended = true;
    p.end();
  };
  return { player, log, active, finish };
}

describe('голосовой канал', () => {
  it('одна реплика за раз: равная по важности ждёт окончания', () => {
    let now = 0;
    const f = fakePlayer();
    const ch = new VoiceChannel(f.player, () => now);
    expect(ch.request('a', 'reaction')).toBe('played');
    expect(ch.request('b', 'reaction')).toBe('queued');
    expect(f.active().map((p) => p.id)).toEqual(['a']);
    now = 500;
    f.finish('a');
    expect(ch.speaking).toBe('b');
  });
  it('устаревшая заявка выбрасывается (TTL)', () => {
    let now = 0;
    const f = fakePlayer();
    const ch = new VoiceChannel(f.player, () => now);
    ch.request('a', 'reaction');
    ch.request('b', 'reaction');
    now = 5000;
    f.finish('a');
    expect(ch.speaking).toBeNull();
    expect(f.log).toEqual(['play:a']);
  });
  it('более важная реплика прерывает менее важную', () => {
    const f = fakePlayer();
    const ch = new VoiceChannel(f.player, () => 0);
    ch.request('idle', 'idle');
    expect(ch.request('win', 'result')).toBe('played');
    expect(f.log).toEqual(['play:idle', 'stop:idle', 'play:win']);
    expect(ch.speaking).toBe('win');
  });
  it('менее важная не прерывает более важную и не копится', () => {
    const f = fakePlayer();
    const ch = new VoiceChannel(f.player, () => 0);
    ch.request('win', 'result');
    expect(ch.request('x', 'reaction')).toBe('queued');
    expect(ch.request('y', 'reaction')).toBe('queued');
    expect(ch.request('z', 'idle')).toBe('dropped');
    f.finish('win');
    expect(ch.speaking).toBe('y');
    expect(f.log.filter((l) => l.startsWith('play'))).toEqual(['play:win', 'play:y']);
  });
  it('никогда не звучат две реплики одновременно', () => {
    const f = fakePlayer();
    const ch = new VoiceChannel(f.player, () => 0);
    const prios = ['idle', 'reaction', 'greeting', 'result', 'reaction', 'idle'] as const;
    prios.forEach((p, i) => {
      ch.request(`l${i}`, p);
      expect(f.active().length).toBeLessThanOrEqual(1);
    });
  });
  it('отсутствующий файл пропускается и помечается', () => {
    const f = fakePlayer(['gone']);
    const ch = new VoiceChannel(f.player, () => 0);
    expect(ch.request('gone', 'result')).toBe('unavailable');
    expect(ch.isUnavailable('gone')).toBe(true);
    expect(ch.speaking).toBeNull();
    expect(ch.request('ok', 'reaction')).toBe('played');
  });
  it('выключенный голос: ничего не звучит, текущая реплика останавливается', () => {
    const f = fakePlayer();
    const ch = new VoiceChannel(f.player, () => 0);
    ch.request('a', 'reaction');
    ch.setEnabled(false);
    expect(f.log).toEqual(['play:a', 'stop:a']);
    expect(ch.request('b', 'result')).toBe('muted');
    ch.setEnabled(true);
    expect(ch.request('b', 'result')).toBe('played');
  });
});
