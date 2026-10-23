// Марионетка Деда Матвея (docs/ART_STYLE.md, docs/CHARACTERS.md): ресурсы, опорные точки, жесты, слои рук.
// Мозг проверяется без отрисовки; риг — на заглушечных текстурах (Pixi работает в Node без рендерера).
import { Texture, type Sprite } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import { MATVEY_MOTION } from '../../src/characters/matvey/motions';
import { MATVEY_PUPPET } from '../../src/characters/matvey/puppet';
import { EMOTIONS } from '../../src/characters/types';
import { PuppetBrain } from '../../src/puppet/brain';
import { PuppetRig } from '../../src/puppet/rig';
import { SpeechMouth } from '../../src/puppet/speech';
import { puppetJobs, puppetParts } from '../../src/puppet/textures';
import { CHANNELS } from '../../src/puppet/types';

const run = (b: PuppetBrain, ms: number, dt = 16) => {
  for (let t = 0; t < ms; t += dt) b.step(dt);
};
const inside = (p: { x: number; y: number }, b: { x: number; y: number; w: number; h: number }) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
const rest = MATVEY_MOTION.rest;
const near = (b: PuppetBrain, tol = 5) => {
  for (const c of ['lHandX', 'lHandY', 'rHandX', 'rHandY'] as const) expect(Math.abs(b.values[c] - (rest[c] ?? 0)), c).toBeLessThan(tol);
};
const ARM_TARGET_R = { x: 300, y: 520 };
const ARM_TARGET_L = { x: 120, y: 520 };

describe('Матвей: ресурсы и опорные точки', () => {
  it('все части — SVG с размерами, ключи не повторяются; у Матвея нет пучка и серёжек', () => {
    const parts = puppetParts(MATVEY_PUPPET);
    expect(new Set(parts.map((p) => p.key)).size).toBe(parts.length);
    for (const p of parts) {
      expect(p.box.w * p.box.h, p.key).toBeGreaterThan(0);
      expect(p.svg(), p.key).toMatch(/^<svg [^>]*viewBox="[-\d. ]+"/);
    }
    expect(MATVEY_PUPPET.head.bun).toBeUndefined();
    expect(MATVEY_PUPPET.head.earrings).toBeUndefined();
    expect(MATVEY_PUPPET.handFist).toBeDefined();
    expect(puppetJobs(MATVEY_PUPPET, 2)).toHaveLength(parts.length + MATVEY_PUPPET.head.mouths.length);
  });

  it('рты: у каждой эмоции и каждой ступени речи есть своя форма', () => {
    const mouths = new Set(MATVEY_PUPPET.head.mouths);
    for (const e of EMOTIONS) expect(mouths.has(MATVEY_PUPPET.emotionMouth(e)), e).toBe(true);
    expect(mouths.has(MATVEY_PUPPET.speech.closed)).toBe(true);
    for (const level of MATVEY_PUPPET.speech.levels) for (const m of level) expect(mouths.has(m), m).toBe(true);
    for (const m of MATVEY_PUPPET.head.mouths) expect(MATVEY_PUPPET.head.mouthSvg(m)).toContain('<svg');
  });

  it('опорные точки внутри своих частей: глаза на лице, плечи и шея на корпусе, кепка вращается у макушки', () => {
    const a = MATVEY_PUPPET;
    for (const e of a.eyesAt) expect(inside(e, a.head.face.box)).toBe(true);
    for (const s of a.shoulders) expect(inside(s, a.torso.box)).toBe(true);
    expect(inside(a.neck, a.torso.box)).toBe(true);
    // Корпус качается вокруг таза — под краем стола, по центру фигуры.
    expect(a.hip.x).toBe(210);
    expect(a.hip.y).toBeGreaterThan(a.shoulders[0].y);
    expect(inside(a.head.bangsPivot, a.head.bangs.box)).toBe(true);
    // Фигура симметрична относительно x = 210: на этом держится зеркальный жест левой руки.
    expect(a.shoulders[0].x + a.shoulders[1].x).toBeCloseTo(420, 6);
    expect(a.eyesAt[0].x + a.eyesAt[1].x).toBeCloseTo(240, 6);
    expect(a.neck.x).toBe(210);
  });
});

describe('Матвей: мозг марионетки', () => {
  it('детерминирован; «меньше движения» — ровно поза покоя', () => {
    const a = new PuppetBrain(MATVEY_MOTION, 7);
    const b = new PuppetBrain(MATVEY_MOTION, 7);
    run(a, 15_000);
    run(b, 15_000);
    expect(a.values).toEqual(b.values);
    const r = new PuppetBrain(MATVEY_MOTION, 1);
    r.reduced = true;
    run(r, 200);
    for (const c of CHANNELS) expect(r.values[c], c).toBeCloseTo(rest[c] ?? 0, 6);
  });

  for (const [name, target, side] of [['правой', ARM_TARGET_R, 'r'], ['левой', ARM_TARGET_L, 'l']] as const) {
    it(`кладёт кость ${name} рукой: берёт, несёт над костями, отпускает один раз, возвращается в покой`, () => {
      const b = new PuppetBrain(MATVEY_MOTION, 3);
      const events: [string, number][] = [];
      const fronts = new Set<string | null>();
      let t = 0;
      let heldBetween = true;
      b.play(MATVEY_MOTION.throwCard(target), (n) => events.push([n, t]));
      for (; t < 1700; t += 16) {
        b.step(16);
        fronts.add(b.armsFront);
        if (t > 400 && t < 860) heldBetween &&= b.holdCard && b.holdHand === side;
      }
      expect(events.map((e) => e[0])).toEqual(['pick', 'release']);
      expect(events[1]![1]).toBeGreaterThan(events[0]![1]);
      expect(heldBetween).toBe(true);
      // Над костями тянется только та рука, что несёт кость.
      expect([...fronts].filter(Boolean)).toEqual([side]);
      run(b, 3000);
      expect(b.gestureId).toBeNull();
      expect(b.holdCard).toBe(false);
      expect(b.armsFront).toBeNull();
      near(b);
    });
  }

  it('добор из базара — левой рукой: grab, затем release; рука возвращается', () => {
    const b = new PuppetBrain(MATVEY_MOTION, 4);
    const got: string[] = [];
    const fronts = new Set<string | null>();
    b.play(MATVEY_MOTION.takeCards({ x: 40, y: 420 }), (n) => got.push(n));
    for (let t = 0; t < 2000; t += 16) {
      b.step(16);
      fronts.add(b.armsFront);
    }
    expect(got).toEqual(['grab', 'release']);
    expect([...fronts].filter(Boolean)).toEqual(['l']);
    run(b, 3000);
    near(b);
  });

  it('каждый жест реакции доигрывается, значения конечны, после него — покой', () => {
    for (const [id, make] of Object.entries(MATVEY_MOTION.gestures!)) {
      const b = new PuppetBrain(MATVEY_MOTION, 11);
      const def = make(ARM_TARGET_R);
      b.play(def);
      for (let t = 0; t < def.duration + 3500; t += 16) {
        b.step(16);
        for (const c of CHANNELS) expect(Number.isFinite(b.values[c]), `${id}.${c}`).toBe(true);
      }
      expect(b.gestureId === null || !b.busy, id).toBe(true);
      expect(b.armsFront, id).toBeNull();
      near(b, 6);
    }
  });

  it('стук — кулаком (событие tap), «рыба» — шлепок ладонью (событие slap)', () => {
    const k = new PuppetBrain(MATVEY_MOTION, 5);
    const got: string[] = [];
    let fist = 0;
    k.play(MATVEY_MOTION.gestures!.knock!(), (n) => got.push(n));
    for (let t = 0; t < 1200; t += 16) {
      k.step(16);
      fist = Math.max(fist, k.values.rFist);
    }
    expect(got).toContain('tap');
    expect(fist).toBeGreaterThan(0.5);
    const s = new PuppetBrain(MATVEY_MOTION, 5);
    const got2: string[] = [];
    s.play(MATVEY_MOTION.gestures!.slap!(), (n) => got2.push(n));
    run(s, 1200);
    expect(got2).toContain('slap');
  });

  it('приподнимает кепку при поражении в матче и возвращает её на место', () => {
    const b = new PuppetBrain(MATVEY_MOTION, 6);
    const def = MATVEY_MOTION.gestures!.capTip!();
    b.play(def);
    let lift = 0;
    for (let t = 0; t < def.duration; t += 16) {
      b.step(16);
      lift = Math.max(lift, Math.abs(b.values.hatY) + Math.abs(b.values.hatRot));
    }
    expect(lift).toBeGreaterThan(1);
    run(b, 3000);
    expect(Math.abs(b.values.hatY)).toBeLessThan(0.5);
    expect(Math.abs(b.values.hatRot)).toBeLessThan(0.5);
  });

  it('раздумье: рука у усов; по времени — обратно в ожидание', () => {
    const b = new PuppetBrain(MATVEY_MOTION, 8);
    b.setState('think', 1800);
    run(b, 1200);
    expect(b.currentState).toBe('think');
    expect(b.values.rHandY).toBeLessThan((rest.rHandY ?? 0) - 80);
    run(b, 4000);
    expect(b.currentState).toBe('idle');
  });

  it('победа: вход со всплеском и кулак вверх; возврат в ожидание — рука опускается', () => {
    const b = new PuppetBrain(MATVEY_MOTION, 9);
    b.setState('victory');
    expect(b.gestureId).toBe('victoryBurst');
    run(b, 1500);
    expect(b.values.rHandY).toBeLessThan(200);
    expect(b.values.rFist).toBeGreaterThan(0.5);
    b.setState('idle');
    run(b, 4000);
    expect(b.values.rFist).toBeLessThan(0.1);
  });

  it('моргание, речь и движение руки не мешают друг другу', () => {
    const b = new PuppetBrain(MATVEY_MOTION, 12);
    const mouth = new SpeechMouth(MATVEY_PUPPET.speech);
    const shapes = new Set<string | null>();
    const before = b.blinks;
    let released = 0;
    for (let round = 0; round < 4; round++) {
      b.play(MATVEY_MOTION.throwCard(round % 2 ? ARM_TARGET_L : ARM_TARGET_R), (n) => (released += n === 'release' ? 1 : 0));
      for (let t = 0; t < 2600; t += 16) {
        const level = Math.abs(Math.sin(t / 90));
        b.setSpeech(level);
        b.step(16);
        shapes.add(mouth.step(level, 16));
        expect(b.blink).toBeGreaterThanOrEqual(0);
        expect(b.blink).toBeLessThanOrEqual(1);
      }
    }
    expect(released).toBe(4);
    expect(b.blinks).toBeGreaterThan(before);
    for (const s of shapes) if (s) expect(MATVEY_PUPPET.head.mouths).toContain(s);
    expect(shapes.size).toBeGreaterThan(2);
  });
});

describe('Матвей: риг и слои рук', () => {
  const make = () => {
    const rig = new PuppetRig(MATVEY_MOTION, 23);
    const parts = new Map(puppetParts(MATVEY_PUPPET).map((p) => [p.key, Texture.WHITE]));
    const mouths = new Map(MATVEY_PUPPET.head.mouths.map((m) => [m, Texture.WHITE]));
    rig.setTextures({ art: MATVEY_PUPPET, res: 1, parts, mouths }, null, Texture.WHITE);
    rig.update(16);
    return rig;
  };
  type Inner = { armR: Sprite; cuffR: Sprite; held: Sprite; handR: Sprite; handL: Sprite; cuffL: Sprite; armL: Sprite };
  const inner = (rig: PuppetRig) => rig as unknown as Inner;

  it('порядок рисования руки: рукав < манжета < кость в руке < кисть', () => {
    const rig = make();
    const i = inner(rig);
    const at = (s: Sprite) => rig.front.children.indexOf(s);
    expect(at(i.armR)).toBeLessThan(at(i.cuffR));
    expect(at(i.cuffR)).toBeLessThan(at(i.held));
    expect(at(i.held)).toBeLessThan(at(i.handR));
    expect(at(i.armL)).toBeLessThan(at(i.cuffL));
    expect(at(i.cuffL)).toBeLessThan(at(i.handL));
    // В overLayer тот же порядок задают zIndex.
    expect(i.armR.zIndex).toBeLessThan(i.cuffR.zIndex);
    expect(i.cuffR.zIndex).toBeLessThan(i.held.zIndex);
    expect(i.held.zIndex).toBeLessThan(i.handR.zIndex);
  });

  it('кость в руке идёт за кистью; рука уходит в слой над столом и возвращается', async () => {
    const rig = make();
    const i = inner(rig);
    let picked = false;
    const done = rig.throwCard(ARM_TARGET_R, () => (picked = true));
    let maxGap = 0;
    for (let t = 0; t < 900; t += 16) {
      rig.update(16);
      if (i.held.visible) maxGap = Math.max(maxGap, Math.hypot(i.held.x - i.handR.x, i.held.y - i.handR.y));
      if (rig.armsFront === 'r') rig.setArmOver('r');
    }
    expect(picked).toBe(true);
    expect(maxGap).toBeGreaterThan(0);
    expect(maxGap).toBeLessThan(MATVEY_PUPPET.hand.box.w);
    expect(rig.armOver).toBe('r');
    expect(i.handR.parentRenderLayer).toBe(rig.overLayer);
    expect(rig.handBounds('r').length).toBeGreaterThanOrEqual(2);
    const rel = await done;
    expect(rel.w).toBeGreaterThan(0);
    rig.setArmOver(null);
    expect(i.handR.parentRenderLayer).toBeNull();
    expect(i.held.parentRenderLayer).toBeNull();
  });

  it('gesture() ждёт своего события, whenFree() — конца жеста; неизвестный жест не зависает', async () => {
    const rig = make();
    let tapped = false;
    const p = rig.gesture('knock', undefined, 'tap').then(() => (tapped = true));
    for (let t = 0; t < 600; t += 16) rig.update(16);
    await p;
    expect(tapped).toBe(true);
    let free = false;
    const f = rig.whenFree().then(() => (free = true));
    for (let t = 0; t < 2000; t += 16) rig.update(16);
    await f;
    expect(free).toBe(true);
    await rig.gesture('no-such-gesture');
    rig.reducedMotion = true;
    await rig.gesture('place', ARM_TARGET_R, 'release');
  });
});
