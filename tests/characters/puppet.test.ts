import { describe, expect, it } from 'vitest';
import { AGATA_MOTION } from '../../src/characters/agata/motions';
import { PuppetBrain } from '../../src/puppet/brain';
import { Spring } from '../../src/puppet/motion';
import { CHANNELS } from '../../src/puppet/types';
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
    for (const c of CHANNELS) expect(b.values[c], c).toBeCloseTo(AGATA_MOTION.rest[c], 6);
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
    expect(minY).toBeLessThan(AGATA_MOTION.rest.rHandY - 100);
    expect(maxY).toBeGreaterThan(395);
    run(b, 3000);
    expect(b.gestureId).toBeNull();
    expect(Math.abs(b.values.rHandX - AGATA_MOTION.rest.rHandX)).toBeLessThan(4);
    expect(Math.abs(b.values.rHandY - AGATA_MOTION.rest.rHandY)).toBeLessThan(4);
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
