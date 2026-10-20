import { describe, expect, it } from 'vitest';
import { chainPoses, computeDominoLayout, dominoHandSlots, endAt, fitChain, opponentBoneSlots, type BonePose, type ChainBone, type DominoLayout } from '../../src/layout/dominoes';
import { MIN_TOUCH, type Rect } from '../../src/layout/layout';
import { createRng, nextInt, type RngState } from '../../src/core/rng';
import { actor, apply, legalActions } from '../../src/games/dominoes/rules/engine';
import { startMatch } from '../../src/games/dominoes/rules/setup';
import type { DominoState } from '../../src/games/dominoes/rules/state';

/** Набор экранов из docs/LAYOUT.md §7. */
const SCREENS: [number, number][] = [
  [360, 640], [390, 844], [412, 915], [844, 390], [915, 412], [768, 1024], [1024, 768], [820, 1180],
  [1280, 720], [1366, 768], [1440, 900], [1920, 1080], [2560, 1440], [1180, 820],
];

const inside = (r: Rect, outer: Rect, eps = 1) => r.x >= outer.x - eps && r.y >= outer.y - eps && r.x + r.w <= outer.x + outer.w + eps && r.y + r.h <= outer.y + outer.h + eps;

/** Прямоугольник кости на экране по позе (поворот кратен 90°). */
function boneRect(p: BonePose, half: number): Rect {
  const vertical = Math.abs(Math.round(p.rot / (Math.PI / 2))) % 2 === 1;
  const w = vertical ? half : half * 2, h = vertical ? half * 2 : half;
  return { x: p.x - w / 2, y: p.y - h / 2, w, h };
}
const overlapArea = (a: Rect, b: Rect) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

const toChain = (s: DominoState): ChainBone[] => s.chain.map((p) => ({ hi: p.bone.hi, lo: p.bone.lo, left: p.left, right: p.right }));

/** Раздача случайными ходами; origin — индекс первой кости (число выкладок влево после неё). */
function playHand(seed: number, steps = 400): { state: DominoState; origin: number; states: { state: DominoState; origin: number }[] } {
  let s = startMatch(seed);
  let rng: RngState = createRng(seed * 7 + 1);
  let origin = 0;
  const states: { state: DominoState; origin: number }[] = [];
  for (let i = 0; i < steps && actor(s) !== null; i++) {
    const opts = legalActions(s);
    const [k, next] = nextInt(rng, opts.length);
    rng = next;
    const a = opts[k]!;
    const before = s.chain.length;
    const r = apply(s, a);
    if (!r.ok) throw new Error(r.error);
    s = r.state;
    if (a.type === 'play' && before > 0 && a.end === 'left') origin++;
    states.push({ state: s, origin });
  }
  return { state: s, origin, states };
}

/** Цепочка из всех 28 костей (эйлеров цикл по числам 0…6, алгоритм Хирхольцера) — худший случай по длине. */
function longChain(): ChainBone[] {
  const left = new Set<string>();
  for (let a = 0; a <= 6; a++) for (let b = 0; b <= a; b++) left.add(`${a}:${b}`);
  const key = (a: number, b: number) => `${Math.max(a, b)}:${Math.min(a, b)}`;
  const stack = [0];
  const path: number[] = [];
  while (stack.length) {
    const v = stack[stack.length - 1]!;
    const n = [0, 1, 2, 3, 4, 5, 6].find((x) => left.has(key(v, x)));
    if (n === undefined) path.push(stack.pop()!);
    else {
      left.delete(key(v, n));
      stack.push(n);
    }
  }
  return path.slice(1).map((r, i) => ({ hi: Math.max(path[i]!, r), lo: Math.min(path[i]!, r), left: path[i]!, right: r }));
}

describe('компоновка домино', () => {
  for (const [w, h] of SCREENS) {
    describe(`${w}×${h}`, () => {
      const s: DominoLayout = computeDominoLayout({ width: w, height: h, pointer: w < 900 ? 'coarse' : 'fine' });
      const screen: Rect = { x: 0, y: 0, w, h };

      it('рука из 7 костей помещается в один ряд, кости не мельче удобного касания', () => {
        const slots = dominoHandSlots(s, 7);
        expect(new Set(slots.map((p) => p.y)).size).toBe(1);
        for (const p of slots) {
          expect(p.half).toBeGreaterThanOrEqual(MIN_TOUCH * 0.8 - 0.01);
          expect(inside({ x: p.x - p.half / 2, y: p.y - p.half, w: p.half, h: p.half * 2 }, screen)).toBe(true);
        }
        for (let i = 1; i < slots.length; i++) expect(slots[i]!.x - slots[i - 1]!.x).toBeGreaterThanOrEqual(slots[i]!.half);
      });

      it('большая рука (до 21 кости) остаётся на экране и без перекрытия', () => {
        for (const n of [10, 14, 21]) {
          const slots = dominoHandSlots(s, n);
          const rects = slots.map((p) => ({ x: p.x - p.half / 2, y: p.y - p.half, w: p.half, h: p.half * 2 }));
          for (const r of rects) expect(inside(r, screen)).toBe(true);
          for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) expect(overlapArea(rects[i]!, rects[j]!)).toBe(0);
        }
      });

      it('кости Матвея — на дальнем краю стола, в пределах экрана', () => {
        for (const n of [1, 7, 15, 21]) {
          for (const p of opponentBoneSlots(s, n)) {
            expect(inside({ x: p.x - p.half / 2, y: p.y - p.half, w: p.half, h: p.half * 2 }, screen)).toBe(true);
            expect(p.y).toBeGreaterThan(s.table.farY);
          }
        }
      });

      it('поле цепочки — над рукой и под костями Матвея; базар — левее поля', () => {
        const a = s.domino.chain.area;
        expect(a.y).toBeGreaterThan(s.domino.opponent.y);
        expect(a.y + a.h).toBeLessThan(s.hand.bottom - s.domino.handHalf * 2);
        expect(s.domino.bazaar.x).toBeLessThan(a.x);
        expect(inside(a, screen)).toBe(true);
      });

      it('цепочка из 28 костей помещается в поле без перекрытий', () => {
        const chain = longChain();
        expect(chain.length).toBe(28);
        for (const origin of [0, 9, 14, 27]) {
          const plan = fitChain(chain, origin, s);
          const rects = plan.poses.map((p) => boneRect(p, plan.half));
          for (const r of rects) expect(inside(r, s.domino.chain.area, 2)).toBe(true);
          for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) expect(overlapArea(rects[i]!, rects[j]!)).toBeLessThan(plan.half * plan.half * 0.02);
        }
      });
    });
  }

  it('цепочки настоящих раздач на телефоне: связны, в поле, без перекрытий; концы рядом с крайними костями', () => {
    const s = computeDominoLayout({ width: 390, height: 844, pointer: 'coarse' });
    for (let seed = 0; seed < 120; seed++) {
      for (const { state, origin } of playHand(seed).states) {
        if (state.chain.length === 0) continue;
        const plan = fitChain(toChain(state), origin, s);
        const rects = plan.poses.map((p) => boneRect(p, plan.half));
        for (const r of rects) expect(inside(r, s.domino.chain.area, 2)).toBe(true);
        for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) expect(overlapArea(rects[i]!, rects[j]!)).toBeLessThan(plan.half * plan.half * 0.02);
        // Соседние кости цепочки соприкасаются (с зазором не больше половины короткой стороны).
        for (let i = 1; i < rects.length; i++) {
          const a = rects[i - 1]!, b = rects[i]!;
          const gapX = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w));
          const gapY = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h));
          expect(Math.max(gapX, gapY)).toBeLessThanOrEqual(plan.half * 0.5);
        }
        expect(plan.ends).not.toBeNull();
        expect(endAt(plan, plan.ends!.left)).toBe('left');
        expect(endAt(plan, plan.ends!.right)).toBe('right');
      }
    }
  });

  it('поворот кости: внешнее число смотрит по ходу цепочки', () => {
    const area = { x: 0, y: 0, w: 1000, h: 400 };
    // Цепочка 2:5 | 5:3: первая кость в центре, вторая справа; внешнее число второй — 3.
    const plan = chainPoses([{ hi: 5, lo: 2, left: 2, right: 5 }, { hi: 5, lo: 3, left: 5, right: 3 }], 0, area, 20);
    // Текстура: старшая половина слева (−x). Первая кость: слева 2 (младшая) → повёрнута на π.
    expect(Math.cos(plan.poses[0]!.rot)).toBeCloseTo(-1);
    // Вторая: слева 5 (старшая) → без поворота.
    expect(Math.cos(plan.poses[1]!.rot)).toBeCloseTo(1);
    expect(plan.poses[1]!.x).toBeGreaterThan(plan.poses[0]!.x);
    // Дубль поперёк.
    const d = chainPoses([{ hi: 4, lo: 4, left: 4, right: 4 }], 0, area, 20);
    expect(Math.abs(Math.sin(d.poses[0]!.rot))).toBeCloseTo(1);
  });
});
