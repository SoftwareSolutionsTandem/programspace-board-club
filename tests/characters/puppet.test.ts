import { describe, expect, it } from 'vitest';
import { AGATA_MOTION } from '../../src/characters/agata/motions';
import { PuppetBrain } from '../../src/puppet/brain';
import { Spring } from '../../src/puppet/motion';
import { CHANNELS } from '../../src/puppet/types';
import { SpeechMouth } from '../../src/puppet/speech';
import { AGATA_PUPPET } from '../../src/characters/agata/puppet';
import { EMOTIONS } from '../../src/characters/types';

const run = (b: PuppetBrain, ms: number, dt = 16) => {
  for (let t = 0; t < ms; t += dt) b.step(dt);
};

describe('пружина второго порядка', () => {
  it('доходит до цели; при малом затухании — с перелётом; с отрицательным откликом — замах', () => {
    const s = new Spring(0, { f: 3, zeta: 0.4 });
    let max = 0;
    for (let i = 0; i < 300; i++) max = Math.max(max, s.step(10, 1 / 60));
    expect(max).toBeGreaterThan(11);
    expect(s.y).toBeCloseTo(10, 2);
    const c = new Spring(0, { f: 3, zeta: 1 });
    let over = 0;
    for (let i = 0; i < 300; i++) over = Math.max(over, c.step(10, 1 / 60));
    expect(over).toBeLessThanOrEqual(10.001);
    const a = new Spring(0, { f: 3, zeta: 0.8, r: -1.5 });
    let min = 0;
    for (let i = 0; i < 60; i++) min = Math.min(min, a.step(i < 30 ? (i / 30) * 10 : 10, 1 / 60));
    expect(min).toBeLessThan(0);
  });

  it('устойчива при большом шаге (подтормаживание вкладки)', () => {
    const s = new Spring(0, { f: 8, zeta: 0.3 });
    for (let i = 0; i < 20; i++) s.step(5, 0.5);
    expect(Number.isFinite(s.y)).toBe(true);
    expect(Math.abs(s.y - 5)).toBeLessThan(0.5);
  });
});

describe('мозг марионетки Агаты', () => {
  it('детерминирован: одинаковый seed — одинаковое движение', () => {
    const a = new PuppetBrain(AGATA_MOTION, 5);
    const b = new PuppetBrain(AGATA_MOTION, 5);
    run(a, 20_000);
    run(b, 20_000);
    expect(a.values).toEqual(b.values);
    expect(a.blinks).toBe(b.blinks);
  });

  it('без движения — ровно нейтральная поза утверждённого рисунка', () => {
    const b = new PuppetBrain(AGATA_MOTION, 1);
    b.reduced = true;
    run(b, 200);
    for (const c of CHANNELS) expect(b.values[c], c).toBeCloseTo(AGATA_MOTION.rest[c] ?? 0, 6);
    expect(b.breath).toBe(0);
  });

  it('бросок: карта берётся из веера, затем отпускается один раз; рука возвращается в покой', () => {
    const b = new PuppetBrain(AGATA_MOTION, 2);
    const events: [string, number][] = [];
    let t = 0;
    const held: boolean[] = [];
    b.play(AGATA_MOTION.throwCard({ x: 260, y: 520 }), (name) => events.push([name, t]));
    for (; t < 1450; t += 16) {
      b.step(16);
      held.push(b.holdCard);
    }
    expect(events.map((e) => e[0])).toEqual(['pick', 'release']);
    expect(events[1]![1]).toBeGreaterThanOrEqual(520);
    // Карта в руке — между взятием и броском, после броска — нет.
    expect(held.slice(16, 32).every(Boolean)).toBe(true);
    expect(held.at(-1)).toBe(false);
    // Замах: кисть поднимается выше, чем в покое; рывок — ниже края стола.
    const b2 = new PuppetBrain(AGATA_MOTION, 2);
    b2.play(AGATA_MOTION.throwCard({ x: 260, y: 520 }));
    let minY = Infinity, maxY = -Infinity;
    for (let k = 0; k < 90; k++) {
      b2.step(16);
      minY = Math.min(minY, b2.values.rHandY);
      maxY = Math.max(maxY, b2.values.rHandY);
    }
    expect(minY).toBeLessThan(AGATA_MOTION.rest.rHandY! - 100);
    expect(maxY).toBeGreaterThan(395);
    run(b, 3000);
    expect(b.gestureId).toBeNull();
    expect(Math.abs(b.values.rHandX - AGATA_MOTION.rest.rHandX!)).toBeLessThan(4);
    expect(Math.abs(b.values.rHandY - AGATA_MOTION.rest.rHandY!)).toBeLessThan(4);
  });

  it('прерванный бросок всё равно отдаёт событие броска — ход не ждёт вечно', () => {
    const b = new PuppetBrain(AGATA_MOTION, 3);
    const got: string[] = [];
    b.play(AGATA_MOTION.throwCard({ x: 200, y: 500 }), (n) => got.push(`1:${n}`));
    run(b, 300);
    b.play(AGATA_MOTION.throwCard({ x: 320, y: 500 }), (n) => got.push(`2:${n}`));
    expect(got).toEqual(['1:pick', '1:release']);
    run(b, 1500);
    expect(got).toEqual(['1:pick', '1:release', '2:pick', '2:release']);
  });

  it('«меньше движения»: события жеста приходят сразу', () => {
    const b = new PuppetBrain(AGATA_MOTION, 4);
    b.reduced = true;
    const got: string[] = [];
    b.play(AGATA_MOTION.throwCard({ x: 200, y: 500 }), (n) => got.push(n));
    expect(got).toEqual(['pick', 'release']);
  });

  it('ожидание живёт и не повторяется механически: взгляд, моргания, разные мелкие действия', () => {
    const b = new PuppetBrain(AGATA_MOTION, 9);
    const gestures: string[] = [];
    let gaze = 0, prevGx = b.values.gazeX;
    let maxHead = 0;
    for (let t = 0; t < 90_000; t += 16) {
      b.step(16);
      const g = b.gestureId;
      if (g && gestures.at(-1) !== g) gestures.push(g);
      // Переводы взгляда — по выборке раз в полсекунды (пружина взгляда ведёт зрачки за несколько кадров).
      if (t % 512 === 0) {
        if (Math.abs(b.values.gazeX - prevGx) > 0.2) gaze++;
        prevGx = b.values.gazeX;
      }
      maxHead = Math.max(maxHead, Math.abs(b.values.headRot));
      for (const c of CHANNELS) expect(Number.isFinite(b.values[c])).toBe(true);
    }
    // 90 с ожидания: несколько мелких действий, подряд одно и то же не повторяется.
    expect(gestures.length).toBeGreaterThanOrEqual(6);
    for (let i = 1; i < gestures.length; i++) expect(gestures[i]).not.toBe(gestures[i - 1]);
    expect(new Set(gestures).size).toBe(3);
    expect(b.blinks).toBeGreaterThan(15);
    expect(b.blinks).toBeLessThan(60);
    expect(gaze).toBeGreaterThan(15);
    // Голова живая, но не болтается.
    expect(maxHead).toBeGreaterThan(1);
    expect(maxHead).toBeLessThan(9);
  });

  it('раздумье: кисть у щеки, голова склонена; по времени — возврат к ожиданию', () => {
    const b = new PuppetBrain(AGATA_MOTION, 6);
    b.setState('think', 3000);
    run(b, 1500);
    expect(b.values.rHandY).toBeLessThan(260);
    expect(b.values.headRot).toBeGreaterThan(2);
    run(b, 4000);
    expect(b.currentState).toBe('idle');
    expect(b.values.rHandY).toBeGreaterThan(370);
  });

  it('любые эмоции и состояния: значения конечны, зрачки в пределах', () => {
    const b = new PuppetBrain(AGATA_MOTION, 8);
    const states = ['idle', 'think', 'took', 'victory'] as const;
    for (let i = 0; i < 400; i++) {
      if (i % 7 === 0) b.setEmotion(EMOTIONS[i % EMOTIONS.length]!);
      if (i % 11 === 0) b.setState(states[i % 4]!, 800);
      if (i % 13 === 0) b.play(AGATA_MOTION.throwCard({ x: 150 + (i % 5) * 50, y: 520 }));
      b.setSpeech((i % 9) / 9);
      run(b, 100);
      for (const c of CHANNELS) expect(Number.isFinite(b.values[c]), c).toBe(true);
      expect(Math.abs(b.values.gazeX)).toBeLessThanOrEqual(1);
      expect(Math.abs(b.values.gazeY)).toBeLessThanOrEqual(1);
    }
  });
});

describe('ANIM-2: взяла, победа, смена глаз, шаль и чёлка', () => {
  it('«взяла»: кисть тянется к картам (grab — один раз, у стола), затем к вееру и в покой', () => {
    const b = new PuppetBrain(AGATA_MOTION, 12);
    const got: [string, number][] = [];
    let t = 0;
    b.play(AGATA_MOTION.takeCards({ x: 240, y: 520 }), (n) => got.push([n, t]));
    let atGrab = 0;
    for (; t < 1400; t += 16) {
      b.step(16);
      if (got.length && !atGrab) atGrab = b.values.rHandY;
    }
    expect(got.map((g) => g[0])).toEqual(['grab']);
    // В момент касания кисть у карт на столе — ниже края стола.
    expect(atGrab).toBeGreaterThan(395);
    run(b, 2500);
    expect(b.gestureId).toBeNull();
    expect(Math.abs(b.values.rHandY - AGATA_MOTION.rest.rHandY!)).toBeLessThan(4);
  });

  it('победа: вход со всплеском, руки вверх; во время броска всплеск ждёт, бросок отпускает карту в свой срок', () => {
    const b = new PuppetBrain(AGATA_MOTION, 13);
    b.setState('victory');
    expect(b.gestureId).toBe('victoryBurst');
    run(b, 2000);
    expect(b.values.lHandY).toBeLessThan(160);
    expect(b.values.rHandY).toBeLessThan(160);
    // Бросок начат, затем наступила победа: событие броска — не раньше обычного, всплеск — после броска.
    const c = new PuppetBrain(AGATA_MOTION, 14);
    let t = 0, released = -1;
    c.play(AGATA_MOTION.throwCard({ x: 260, y: 520 }), (n) => {
      if (n === 'release') released = t;
    });
    c.setState('victory');
    const seen: string[] = [];
    for (; t < 3000; t += 16) {
      c.step(16);
      if (c.gestureId && seen.at(-1) !== c.gestureId) seen.push(c.gestureId);
    }
    expect(released).toBeGreaterThanOrEqual(520);
    expect(seen.slice(0, 2)).toEqual(['throwCard', 'victoryBurst']);
    // Бросок во время всплеска: всплеск доигрывается после броска.
    const d = new PuppetBrain(AGATA_MOTION, 15);
    d.setState('victory');
    run(d, 200);
    d.play(AGATA_MOTION.throwCard({ x: 260, y: 520 }));
    const seenD: string[] = [];
    for (let k = 0; k < 200; k++) {
      d.step(16);
      if (d.gestureId && seenD.at(-1) !== d.gestureId) seenD.push(d.gestureId);
    }
    expect(seenD.slice(0, 2)).toEqual(['throwCard', 'victoryBurst']);
  });

  it('смена формы глаз: глаза прикрываются, форма меняется закрытыми, новая раскрывается; без движения — сразу', () => {
    const b = new PuppetBrain(AGATA_MOTION, 16);
    run(b, 300);
    b.setEmotion('surprise');
    expect(b.eyes).toBe('ball');
    let maxClose = 0, swappedAt = -1;
    for (let t = 0; t < 600; t += 10) {
      b.step(10);
      maxClose = Math.max(maxClose, b.eyeClose);
      if (swappedAt < 0 && b.eyes === 'wide') swappedAt = t;
    }
    expect(maxClose).toBeCloseTo(1, 5);
    expect(swappedAt).toBeGreaterThanOrEqual(60);
    expect(swappedAt).toBeLessThanOrEqual(80);
    run(b, 1500);
    expect(b.eyeClose).toBe(0);
    expect(b.eyeScaleX).toBeCloseTo(1, 2);
    expect(b.eyeScaleY).toBeCloseTo(1, 2);
    // В дуги смеха: дуга раскрывается из сплющенной.
    b.setEmotion('laugh');
    let minSY = 1;
    for (let t = 0; t < 400; t += 10) {
      b.step(10);
      if (b.eyes === 'happy') minSY = Math.min(minSY, b.eyeScaleY);
    }
    expect(minSY).toBeLessThan(0.5);
    const r = new PuppetBrain(AGATA_MOTION, 17);
    r.reduced = true;
    r.setEmotion('laugh');
    r.step(16);
    expect(r.eyes).toBe('happy');
    expect(r.eyeClose).toBe(0);
  });

  it('шаль и чёлка: качаются от движения корпуса и головы, но в пределах; без движения — на месте', () => {
    const b = new PuppetBrain(AGATA_MOTION, 18);
    let maxF = 0, maxB = 0;
    b.play(AGATA_MOTION.throwCard({ x: 300, y: 520 }));
    for (let t = 0; t < 2000; t += 16) {
      b.step(16);
      maxF = Math.max(maxF, Math.abs(b.fringe));
      maxB = Math.max(maxB, Math.abs(b.bangsRot));
    }
    expect(maxF).toBeGreaterThan(3);
    expect(maxF).toBeLessThanOrEqual(AGATA_MOTION.secondary.fringeMax);
    expect(maxB).toBeGreaterThan(0.2);
    expect(maxB).toBeLessThanOrEqual(AGATA_MOTION.secondary.bangsMax);
    const r = new PuppetBrain(AGATA_MOTION, 19);
    r.reduced = true;
    r.play(AGATA_MOTION.throwCard({ x: 300, y: 520 }));
    run(r, 500);
    expect(r.fringe).toBe(0);
    expect(r.bangsRot).toBe(0);
    expect(r.bangsY).toBe(0);
  });
});

describe('рот при речи', () => {
  const shapes = AGATA_PUPPET.speech;
  it('форма держится не меньше 70 мс, между слогами губы смыкаются, в долгой паузе — рот эмоции', () => {
    const m = new SpeechMouth(shapes);
    const out: (string | null)[] = [];
    // Уровень «пилой» каждые 16 мс: без удержания рот мерцал бы каждый кадр.
    for (let i = 0; i < 40; i++) out.push(m.step(i % 2 ? 0.9 : 0.35, 16));
    let changes = 0;
    for (let i = 1; i < out.length; i++) if (out[i] !== out[i - 1]) changes++;
    expect(changes).toBeLessThanOrEqual(Math.ceil((40 * 16) / 70));
    expect(m.step(0, 16)).not.toBeNull();
    for (let i = 0; i < 6; i++) m.step(0, 16);
    expect(m.step(0, 16)).toBe(shapes.closed);
    for (let i = 0; i < 20; i++) m.step(0, 16);
    expect(m.step(0, 16)).toBeNull();
  });

  it('громче — шире; в досаде рот не раскрывается до смеющегося', () => {
    const open = (lvl: number, max?: number) => {
      const m = new SpeechMouth(shapes);
      let s: string | null = null;
      for (let i = 0; i < 20; i++) s = m.step(lvl, 16, max);
      return s;
    };
    expect(shapes.levels[0]).toContain(open(0.2));
    expect(shapes.levels[2]).toContain(open(0.95));
    expect(shapes.levels[1]).toContain(open(0.95, 1));
  });

  it('уровень у границы ступени не перебрасывает форму туда-сюда', () => {
    const m = new SpeechMouth(shapes);
    const seen = new Set<string | null>();
    for (let i = 0; i < 200; i++) seen.add(m.step(0.38 + (i % 2 ? 0.02 : -0.02), 16));
    expect(seen.size).toBe(1);
  });
});
