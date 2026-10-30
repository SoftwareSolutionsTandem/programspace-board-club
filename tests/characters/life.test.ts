// «Своя жизнь» персонажей (src/characters/life.ts): сценки редкие, не повторяются, к месту (ожидание, настроение,
// тишина), прерываются игрой; у каждого персонажа свои сценки с реквизитом из его рисунка и реплики к каждой.
import { describe, expect, it } from 'vitest';
import { AGATA_LINES } from '../../src/characters/agata/lines';
import { AGATA_MOTION } from '../../src/characters/agata/motions';
import { AGATA_PUPPET } from '../../src/characters/agata/puppet';
import { KHARITON_LINES } from '../../src/characters/khariton/lines';
import { KHARITON_MOTION } from '../../src/characters/khariton/motions';
import { KHARITON_PUPPET } from '../../src/characters/khariton/puppet';
import { KOSTYAN_LINES } from '../../src/characters/kostyan/lines';
import { KOSTYAN_MOTION } from '../../src/characters/kostyan/motions';
import { KOSTYAN_PUPPET } from '../../src/characters/kostyan/puppet';
import { CharacterLife, LIFE_DEFAULTS, LifePlanner, moodOf, sceneCategory, type LifeContext, type LifeRig } from '../../src/characters/life';
import { MATVEY_LINES } from '../../src/characters/matvey/lines';
import { MATVEY_MOTION } from '../../src/characters/matvey/motions';
import { MATVEY_PUPPET } from '../../src/characters/matvey/puppet';
import type { Emotion } from '../../src/characters/types';
import { createRng } from '../../src/core/rng';
import { PuppetBrain } from '../../src/puppet/brain';
import type { SceneDef } from '../../src/puppet/types';

const CHARACTERS = [
  { name: 'Агата', motion: AGATA_MOTION, art: AGATA_PUPPET, lines: AGATA_LINES },
  { name: 'Матвей', motion: MATVEY_MOTION, art: MATVEY_PUPPET, lines: MATVEY_LINES },
  { name: 'Харитон', motion: KHARITON_MOTION, art: KHARITON_PUPPET, lines: KHARITON_LINES },
  { name: 'Костян', motion: KOSTYAN_MOTION, art: KOSTYAN_PUPPET, lines: KOSTYAN_LINES },
];

const ctx = (now: number, o: Partial<LifeContext> = {}): LifeContext => ({ now, waiting: true, waitMs: 30_000, mood: 'even', free: true, quietMs: 60_000, ...o });

/** Прогон планировщика: игрок думает непрерывно, сценки «идут» мгновенно. */
function run(scenes: readonly SceneDef[], ms: number, o: Partial<LifeContext> = {}, seed = 3) {
  const p = new LifePlanner(scenes, createRng(seed), 0);
  const out: { id: string; at: number }[] = [];
  for (let t = 0; t < ms; t += 250) {
    const s = p.decide(ctx(t, o));
    if (s) out.push({ id: s.id, at: t });
  }
  return out;
}

describe('планировщик сценок', () => {
  const scenes = KHARITON_MOTION.scenes!;

  it('сценки редкие: первая не раньше 12 с, между ними не меньше паузы, за 10 минут — не больше 20', () => {
    const got = run(scenes, 600_000);
    expect(got.length).toBeGreaterThan(5);
    expect(got.length).toBeLessThanOrEqual(20);
    expect(got[0]!.at).toBeGreaterThanOrEqual(LIFE_DEFAULTS.firstMs);
    for (let i = 1; i < got.length; i++) {
      const prev = scenes.find((s) => s.id === got[i - 1]!.id)!;
      expect(got[i]!.at - got[i - 1]!.at).toBeGreaterThanOrEqual(prev.gesture.duration + LIFE_DEFAULTS.gapMs[0] * 0.5);
    }
  });

  it('не повторяет сценку подряд и не раньше её паузы (4 минуты)', () => {
    const got = run(scenes, 1_200_000);
    for (let i = 1; i < got.length; i++) expect(got[i]!.id).not.toBe(got[i - 1]!.id);
    const last = new Map<string, number>();
    for (const g of got) {
      if (last.has(g.id)) expect(g.at - last.get(g.id)!).toBeGreaterThanOrEqual(240_000);
      last.set(g.id, g.at);
    }
  });

  it('только пока игрок думает, персонаж свободен и молчит', () => {
    expect(run(scenes, 120_000, { waiting: false })).toEqual([]);
    expect(run(scenes, 120_000, { free: false })).toEqual([]);
    expect(run(scenes, 120_000, { quietMs: 2000 })).toEqual([]);
    // Игрок думает 3 секунды — рано.
    expect(run(scenes, 120_000, { waitMs: 3000 })).toEqual([]);
  });

  it('«скучающие» сценки — только при долгом раздумье игрока; «самодовольные» — не когда отстаёт', () => {
    const short = run(scenes, 1_200_000, { waitMs: 8000 });
    expect(short.some((g) => g.id === 'watch')).toBe(false);
    const behind = run(scenes, 1_200_000, { mood: 'behind' });
    expect(behind.some((g) => g.id === 'lecture')).toBe(false);
    expect(behind.length).toBeGreaterThan(0);
  });

  it('игровое событие откладывает сценку', () => {
    const p = new LifePlanner(scenes, createRng(1), 0);
    p.event(100_000);
    for (let t = 99_000; t < 104_900; t += 100) expect(p.decide(ctx(t))).toBeNull();
  });

  it('moodOf: перевес, отставание, равенство', () => {
    expect(moodOf(3, 2)).toBe('ahead');
    expect(moodOf(-2, 2)).toBe('behind');
    expect(moodOf(1, 2)).toBe('even');
  });
});

describe('драйвер: реплика на маркере, прерывание игрой', () => {
  function fakeRig() {
    let marker: ((n: string) => void) | null = null;
    let finish: (() => void) | null = null;
    const rig: LifeRig & { emotion: Emotion; stopped: number } = {
      emotion: 'warm',
      stopped: 0,
      brain: { busy: false, talking: false, stopGesture: () => { rig.stopped++; finish?.(); } },
      get currentEmotion() { return rig.emotion; },
      setEmotion: (e) => { rig.emotion = e; },
      reducedMotion: false,
      playScene: (_def, onMarker) => new Promise<void>((res) => { marker = onMarker; finish = res; }),
    };
    return { rig, say: (n: string) => marker?.(n), end: () => finish?.() };
  }

  it('say просит реплику своей категории; сама кончилась — лицо снова приветливое', async () => {
    const f = fakeRig();
    const asked: string[] = [];
    const life = new CharacterLife(f.rig, KHARITON_MOTION.scenes!, createRng(2), 0, (cat) => (asked.push(cat), true));
    const p = life.play(KHARITON_MOTION.scenes!.find((s) => s.id === 'glasses')!);
    expect(life.playing).toBe('glasses');
    f.say('say');
    expect(asked).toEqual([sceneCategory('glasses')]);
    expect(f.rig.brain.talking).toBe(true);
    f.rig.emotion = 'sly';
    f.end();
    await p;
    expect(life.playing).toBeNull();
    expect(f.rig.emotion).toBe('warm');
  });

  it('итог партии прерывает сценку, лицо остаётся как задала игра', async () => {
    const f = fakeRig();
    const life = new CharacterLife(f.rig, KHARITON_MOTION.scenes!, createRng(2), 0, () => true);
    const p = life.play(KHARITON_MOTION.scenes![0]!);
    life.event(1000);
    f.rig.emotion = 'azart';
    life.stop();
    await p;
    expect(f.rig.stopped).toBe(1);
    expect(f.rig.emotion).toBe('azart');
  });
});

for (const c of CHARACTERS) {
  describe(`сценки: ${c.name}`, () => {
    const scenes = c.motion.scenes ?? [];

    it('не меньше пяти своих сценок, у каждой — реплики своей категории (ожидают записи)', () => {
      expect(scenes.length).toBeGreaterThanOrEqual(5);
      for (const s of scenes) {
        const lines = c.lines.filter((l) => l.category === sceneCategory(s.id));
        expect(lines.length, s.id).toBeGreaterThanOrEqual(2);
        for (const l of lines) expect(l.pending, l.id).toBe(true);
        // Одна реплика на сценку, сценка ждёт её конца.
        expect(s.gesture.markers?.filter((m) => m.name === 'say').length, s.id).toBe(1);
        expect(s.gesture.keys.some((k) => k.waitSpeech), s.id).toBe(true);
      }
    });

    it('реквизит сценок нарисован у персонажа, ключи идут по времени, сценка кончается сама', () => {
      for (const s of scenes) {
        const keys = s.gesture.keys;
        for (let i = 1; i < keys.length; i++) expect(keys[i]!.at, s.id).toBeGreaterThanOrEqual(keys[i - 1]!.at);
        expect(keys[keys.length - 1]!.at, s.id).toBeLessThan(s.gesture.duration);
        for (const k of keys) for (const p of [k.props?.l, k.props?.r]) if (p) expect(c.art.props?.[p], `${s.id}: ${p}`).toBeDefined();
      }
    });

    it('мозг проигрывает каждую сценку до конца: реквизит убран, глаза и рот снова по эмоции, очки на месте', () => {
      for (const s of scenes) {
        const b = new PuppetBrain(c.motion, 4);
        let ended = false;
        b.play({ ...s.gesture, markers: [...(s.gesture.markers ?? []), { at: s.gesture.duration, name: 'end' }] }, (n) => { if (n === 'end') ended = true; });
        // Говорит 3 с после say: сценка ждёт, но не бесконечно.
        let t = 0;
        while (!ended && t < s.gesture.duration + 12_000) {
          b.talking = t > 0 && t < 3000 + s.gesture.duration;
          b.step(16);
          t += 16;
        }
        expect(ended, s.id).toBe(true);
        for (let i = 0; i < 120; i++) b.step(16);
        expect(b.propL, s.id).toBeNull();
        expect(b.propR, s.id).toBeNull();
        expect(b.mouthOverride, s.id).toBeNull();
        expect(b.values.glassesOff, s.id).toBeLessThan(0.5);
      }
    });
  });
}
