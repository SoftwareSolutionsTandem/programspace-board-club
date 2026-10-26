// Марионетки Харитона (шахматы) и Костяна (шашки): ресурсы, опорные точки, жесты, состояния.
// Мозг проверяется без отрисовки (как у Матвея, tests/characters/matvey.test.ts).
import { describe, expect, it } from 'vitest';
import { KHARITON_ART } from '../../src/characters/khariton/art';
import { KHARITON_LINES } from '../../src/characters/khariton/lines';
import { KHARITON_MOTION } from '../../src/characters/khariton/motions';
import { KHARITON_PUPPET } from '../../src/characters/khariton/puppet';
import { KOSTYAN_ART } from '../../src/characters/kostyan/art';
import { KOSTYAN_LINES } from '../../src/characters/kostyan/lines';
import { KOSTYAN_MOTION } from '../../src/characters/kostyan/motions';
import { KOSTYAN_PUPPET } from '../../src/characters/kostyan/puppet';
import { EMOTIONS, POSES } from '../../src/characters/types';
import type { PuppetArt } from '../../src/puppet/art';
import { PuppetBrain } from '../../src/puppet/brain';
import { puppetJobs, puppetParts } from '../../src/puppet/textures';
import { CHANNELS, type MotionStyle } from '../../src/puppet/types';

const run = (b: PuppetBrain, ms: number, dt = 16) => {
  for (let t = 0; t < ms; t += dt) b.step(dt);
};
const inside = (p: { x: number; y: number }, b: { x: number; y: number; w: number; h: number }) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;

const CHARS: readonly { name: string; id: string; puppet: PuppetArt; motion: MotionStyle; art: typeof KHARITON_ART; lines: typeof KHARITON_LINES }[] = [
  { name: 'Харитон', id: 'khariton', puppet: KHARITON_PUPPET, motion: KHARITON_MOTION, art: KHARITON_ART, lines: KHARITON_LINES },
  { name: 'Костян', id: 'kostyan', puppet: KOSTYAN_PUPPET, motion: KOSTYAN_MOTION, art: KOSTYAN_ART, lines: KOSTYAN_LINES },
];

for (const c of CHARS) {
  const rest = c.motion.rest;
  const near = (b: PuppetBrain, tol = 6) => {
    for (const ch of ['lHandX', 'lHandY', 'rHandX', 'rHandY'] as const) expect(Math.abs(b.values[ch] - (rest[ch] ?? 0)), ch).toBeLessThan(tol);
  };

  describe(`${c.name}: рисунок и части марионетки`, () => {
    it('все части — SVG с размерами, ключи не повторяются', () => {
      const parts = puppetParts(c.puppet);
      expect(new Set(parts.map((p) => p.key)).size).toBe(parts.length);
      for (const p of parts) {
        expect(p.box.w * p.box.h, p.key).toBeGreaterThan(0);
        expect(p.svg(), p.key).toMatch(/^<svg [^>]*viewBox="[-\d. ]+"/);
      }
      expect(puppetJobs(c.puppet, 2)).toHaveLength(parts.length + c.puppet.head.mouths.length);
      expect(c.puppet.id).toBe(c.id);
      expect(c.art.id).toBe(c.id);
    });

    it('портрет и позы контракта CharacterArt: SVG на каждую эмоцию и позу', () => {
      for (const e of EMOTIONS) expect(c.art.portraitSvg(e)).toContain('<svg');
      for (const p of POSES) expect(c.art.armsSvg(p)).toContain('<svg');
      expect(c.art.bodySvg()).toContain('<svg');
    });

    it('рты: у каждой эмоции и ступени речи — своя форма', () => {
      const mouths = new Set(c.puppet.head.mouths);
      for (const e of EMOTIONS) expect(mouths.has(c.puppet.emotionMouth(e)), e).toBe(true);
      expect(mouths.has(c.puppet.speech.closed)).toBe(true);
      for (const level of c.puppet.speech.levels) for (const m of level) expect(mouths.has(m), m).toBe(true);
    });

    it('опорные точки внутри частей; фигура симметрична относительно x = 210', () => {
      const a = c.puppet;
      for (const e of a.eyesAt) expect(inside(e, a.head.face.box)).toBe(true);
      for (const s of a.shoulders) expect(inside(s, a.torso.box)).toBe(true);
      expect(inside(a.neck, a.torso.box)).toBe(true);
      expect(inside(a.head.bangsPivot, a.head.bangs.box)).toBe(true);
      expect(a.shoulders[0].x + a.shoulders[1].x).toBeCloseTo(420, 6);
      expect(a.eyesAt[0].x + a.eyesAt[1].x).toBeCloseTo(240, 6);
      expect(a.neck.x).toBe(210);
    });

    it('реплики: уникальные ID с префиксом персонажа, текст и пометка есть', () => {
      const ids = c.lines.map((l) => l.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const l of c.lines) {
        expect(l.id).toMatch(new RegExp(`^${c.id}_[a-z0-9_]+$`));
        expect(l.text.length).toBeGreaterThan(1);
        expect(l.direction.length).toBeGreaterThan(1);
      }
    });
  });

  describe(`${c.name}: мозг марионетки`, () => {
    it('детерминирован; «меньше движения» — ровно поза покоя', () => {
      const a = new PuppetBrain(c.motion, 7);
      const b = new PuppetBrain(c.motion, 7);
      run(a, 12_000);
      run(b, 12_000);
      expect(a.values).toEqual(b.values);
      const r = new PuppetBrain(c.motion, 1);
      r.reduced = true;
      run(r, 200);
      for (const ch of CHANNELS) expect(r.values[ch], ch).toBeCloseTo(rest[ch] ?? 0, 6);
    });

    for (const [side, target] of [['r', { x: 300, y: 450 }], ['l', { x: 120, y: 450 }]] as const) {
      it(`ход к доске (${side === 'r' ? 'правой' : 'левой'} рукой): одно касание release, над фигурами только эта рука, затем покой`, () => {
        const b = new PuppetBrain(c.motion, 3);
        const events: string[] = [];
        const fronts = new Set<string | null>();
        b.play(c.motion.gestures!.move!(target), (n) => events.push(n));
        for (let t = 0; t < 1800; t += 16) {
          b.step(16);
          fronts.add(b.armsFront);
        }
        expect(events).toEqual(['release']);
        expect([...fronts].filter(Boolean)).toEqual([side]);
        run(b, 3000);
        expect(b.armsFront).toBeNull();
        near(b);
      });
    }

    it('каждый жест доигрывается, значения конечны, после него — покой', () => {
      for (const [id, make] of Object.entries(c.motion.gestures!)) {
        const b = new PuppetBrain(c.motion, 11);
        const def = make({ x: 300, y: 450 });
        b.play(def);
        for (let t = 0; t < def.duration + 3500; t += 16) {
          b.step(16);
          for (const ch of CHANNELS) expect(Number.isFinite(b.values[ch]), `${id}.${ch}`).toBe(true);
        }
        expect(b.armsFront, id).toBeNull();
        near(b, 7);
      }
    });

    it('раздумье: рука у лица; по времени — обратно в ожидание', () => {
      const b = new PuppetBrain(c.motion, 8);
      b.setState('think', 1800);
      run(b, 1200);
      expect(b.currentState).toBe('think');
      expect(b.values.rHandY).toBeLessThan((rest.rHandY ?? 0) - 80);
      run(b, 4000);
      expect(b.currentState).toBe('idle');
    });

    it('победа: всплеск и рука вверх; возврат — кулак разжат', () => {
      const b = new PuppetBrain(c.motion, 9);
      b.setState('victory');
      run(b, 1500);
      expect(b.values.rHandY).toBeLessThan(200);
      b.setState('idle');
      run(b, 4000);
      expect(b.values.rFist).toBeLessThan(0.1);
    });

    it('хохолок/чуб пружинит при резком движении головы и успокаивается', () => {
      const b = new PuppetBrain(c.motion, 10);
      b.play(c.motion.gestures!.surprised!());
      let swing = 0;
      for (let t = 0; t < 900; t += 16) {
        b.step(16);
        swing = Math.max(swing, Math.abs(b.bangsRot) + Math.abs(b.bangsY));
      }
      expect(swing).toBeGreaterThan(0.05);
    });
  });
}
