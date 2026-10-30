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
import { CharacterLife, LIFE_DEFAULTS, LifePlanner, moodOf, PlayTempo, sceneCategory, tierOf, type LifeContext, type LifeRig } from '../../src/characters/life';
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

const ctx = (now: number, o: Partial<LifeContext> = {}): LifeContext => ({ now, active: true, waiting: true, waitMs: 30_000, mood: 'even', free: true, quietMs: 60_000, tags: [], ...o });

/** Прогон планировщика: каждое начатое действие длится свою длительность (персонаж занят), потом снова свободен. */
function run(scenes: readonly SceneDef[], ms: number, o: Partial<LifeContext> = {}, seed = 3) {
  const p = new LifePlanner(scenes, createRng(seed), 0);
  const out: { id: string; at: number; tier: string }[] = [];
  let busyUntil = 0;
  for (let t = 0; t < ms; t += 250) {
    const s = p.decide(ctx(t, { ...o, free: (o.free ?? true) && t >= busyUntil }));
    if (s) {
      out.push({ id: s.id, at: t, tier: tierOf(s) });
      busyUntil = t + s.gesture.duration;
    }
  }
  return out;
}

describe('планировщик: уровни активности', () => {
  const scenes = KHARITON_MOTION.scenes!;

  it('персонаж почти всё время чем-то занят: за 10 минут раздумий игрока — десятки действий, первое — в первые секунды', () => {
    const got = run(scenes, 600_000);
    const full = got.filter((g) => g.tier !== 'habit');
    expect(got[0]!.at).toBeLessThanOrEqual(6000);
    expect(full[0]!.at).toBeLessThanOrEqual(10_000);
    expect(full.length).toBeGreaterThanOrEqual(15);
    expect(got.filter((g) => g.tier === 'habit').length).toBeGreaterThanOrEqual(15);
    // Самая длинная пауза без всякого действия — не больше 20 с.
    let longest = 0;
    let free = 0;
    for (const g of got) {
      longest = Math.max(longest, g.at - free);
      free = g.at + scenes.find((s) => s.id === g.id)!.gesture.duration;
    }
    expect(longest).toBeLessThanOrEqual(20_000);
  });

  it('не мельтешит: одно действие за раз, сценки — не чаще раза в 10 с после конца предыдущей', () => {
    const got = run(scenes, 600_000).filter((g) => g.tier === 'scene');
    for (let i = 1; i < got.length; i++) {
      const prev = scenes.find((s) => s.id === got[i - 1]!.id)!;
      expect(got[i]!.at - got[i - 1]!.at).toBeGreaterThanOrEqual(prev.gesture.duration + 4000);
    }
  });

  it('не повторяет подряд и выдерживает паузу повтора каждой сценки', () => {
    const got = run(scenes, 1_200_000);
    for (let i = 1; i < got.length; i++) expect(got[i]!.id).not.toBe(got[i - 1]!.id);
    const last = new Map<string, number>();
    for (const g of got) {
      const def = scenes.find((s) => s.id === g.id)!;
      const cd = def.cooldownMs ?? LIFE_DEFAULTS[tierOf(def)].cooldown;
      if (last.has(g.id)) expect(g.at - last.get(g.id)!, g.id).toBeGreaterThanOrEqual(cd);
      last.set(g.id, g.at);
    }
    // Разнообразие: за 20 минут — больше половины сценок персонажа.
    const distinct = new Set(got.filter((g) => g.tier !== 'habit').map((g) => g.id));
    expect(distinct.size).toBeGreaterThan(scenes.filter((s) => tierOf(s) !== 'habit' && !s.tag).length / 2);
  });

  it('ход персонажа или анимация — только привычки; партия не идёт или персонаж занят — ничего', () => {
    const notWaiting = run(scenes, 300_000, { waiting: false, waitMs: 0 });
    expect(notWaiting.length).toBeGreaterThan(10);
    expect(notWaiting.every((g) => g.tier === 'habit')).toBe(true);
    expect(run(scenes, 120_000, { active: false })).toEqual([]);
    expect(run(scenes, 120_000, { free: false })).toEqual([]);
    // Только что говорил — сценки с репликой ждут, привычки идут.
    expect(run(scenes, 120_000, { quietMs: 1000 }).every((g) => g.tier === 'habit')).toBe(true);
  });

  it('особые — только при долгом раздумье; «самодовольные» — не когда персонаж отстаёт', () => {
    expect(run(scenes, 1_200_000, { waitMs: 8000 }).some((g) => g.tier === 'special')).toBe(false);
    expect(run(scenes, 1_200_000).some((g) => g.tier === 'special')).toBe(true);
    const behind = run(scenes, 1_200_000, { mood: 'behind' });
    expect(behind.some((g) => g.id === 'lecture' || g.id === 'conduct')).toBe(false);
  });

  it('ответ на темп игрока: заметил, что игрок спешит, — сценка-ответ вперёд остальных; без признака её нет', () => {
    expect(run(scenes, 600_000).some((g) => g.id === 'fastPlayer')).toBe(false);
    const fast = run(scenes, 60_000, { tags: ['playerFast'] }).filter((g) => g.tier !== 'habit');
    expect(fast[0]?.id).toBe('fastPlayer');
  });

  it('игровое событие откладывает действия', () => {
    const p = new LifePlanner(scenes, createRng(1), 0);
    p.event(100_000);
    for (let t = 99_000; t < 101_400; t += 100) expect(p.decide(ctx(t))).toBeNull();
  });

  it('темп игрока: быстрые ходы, долгое раздумье, затянувшаяся партия', () => {
    const tempo = new PlayTempo(0);
    for (const w of [2000, 1500, 3000]) tempo.moved(w);
    expect(tempo.tags(10_000, 1000)).toEqual(['playerFast']);
    tempo.moved(9000);
    expect(tempo.tags(10_000, 30_000)).toEqual(['playerSlow']);
    expect(tempo.tags(400_000, 0)).toEqual(['longGame']);
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

    it('много своих сценок, особые, ответы на темп и привычки; у сценок — реплики (ожидают записи), у привычек — без слов', () => {
      const full = scenes.filter((s) => tierOf(s) !== 'habit');
      const habits = scenes.filter((s) => tierOf(s) === 'habit');
      expect(full.length).toBeGreaterThanOrEqual(12);
      expect(habits.length).toBeGreaterThanOrEqual(6);
      expect(full.some((s) => tierOf(s) === 'special')).toBe(true);
      for (const t of ['playerFast', 'playerSlow', 'longGame'] as const) expect(full.some((s) => s.tag === t), t).toBe(true);
      expect(new Set(scenes.map((s) => s.id)).size).toBe(scenes.length);
      for (const s of full) {
        const lines = c.lines.filter((l) => l.category === sceneCategory(s.id));
        expect(lines.length, s.id).toBeGreaterThanOrEqual(2);
        for (const l of lines) expect(l.pending, l.id).toBe(true);
        // Одна реплика на сценку, сценка ждёт её конца.
        expect(s.gesture.markers?.filter((m) => m.name === 'say').length, s.id).toBe(1);
        expect(s.gesture.keys.some((k) => k.waitSpeech), s.id).toBe(true);
      }
      for (const h of habits) {
        expect(h.gesture.duration, h.id).toBeLessThanOrEqual(3000);
        expect(h.gesture.markers ?? [], h.id).toEqual([]);
        expect(c.lines.some((l) => l.category === sceneCategory(h.id)), h.id).toBe(false);
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
