import { describe, expect, it } from 'vitest';
import { computeLayout, defenseOffset, FIGURE, handSlots, layoutKind, MIN_TOUCH, MIN_VISIBLE, pairSlot, type LayoutSpec, type Rect } from '../../src/layout/layout';

/** Набор экранов из docs/LAYOUT.md §7. */
const SCREENS: [number, number][] = [
  [360, 640], [390, 844], [412, 915], [844, 390], [915, 412], [768, 1024], [1024, 768], [820, 1180],
  [1280, 720], [1366, 768], [1440, 900], [1920, 1080], [2560, 1440], [1180, 820],
];

const inside = (r: Rect, outer: Rect, eps = 0.5) => r.x >= outer.x - eps && r.y >= outer.y - eps && r.x + r.w <= outer.x + outer.w + eps && r.y + r.h <= outer.y + outer.h + eps;
const overlap = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const union = (rs: Rect[]): Rect => {
  const x = Math.min(...rs.map((r) => r.x)), y = Math.min(...rs.map((r) => r.y));
  return { x, y, w: Math.max(...rs.map((r) => r.x + r.w)) - x, h: Math.max(...rs.map((r) => r.y + r.h)) - y };
};

function zones(s: LayoutSpec, handCount = 6) {
  const { w: tw, h: th } = s.tableCard;
  const off = defenseOffset(s);
  // Пара с небольшим поворотом карт (±10°) — запас 8%.
  const pairs = union([0, 1, 2, 3, 4, 5].map((i) => {
    const p = pairSlot(s, i);
    return { x: p.x - tw * 0.54, y: p.y - th * 0.54, w: tw * 1.08 + off.x, h: th * 1.08 + off.y };
  }));
  // Колода с козырем: козырь лежит поперёк, сдвинут вправо на 0,42 ширины карты.
  const deck = { x: s.deck.x - tw * 0.6, y: s.deck.y - th * 0.56, w: tw * 0.6 + tw * 0.42 + th / 2, h: th * 1.12 };
  const discard = { x: s.discard.x - tw * 0.75, y: s.discard.y - th * 0.6, w: tw * 1.5, h: th * 1.2 };
  const slots = handSlots(s, handCount);
  const hand = union(slots.map((p) => ({ x: p.x - s.hand.cardW * 0.55, y: p.y - s.hand.cardH / 2 - s.hand.lift, w: s.hand.cardW * 1.1, h: s.hand.cardH + s.hand.lift })));
  return { pairs, deck, discard, hand, slots };
}

describe('компоновка: выбор вида', () => {
  it('телефон в портрете, компьютер — landscape, телефон боком — compact, планшет в портрете — portrait-wide', () => {
    expect(layoutKind(390, 844)).toBe('portrait');
    expect(layoutKind(1280, 720)).toBe('landscape');
    expect(layoutKind(844, 390)).toBe('landscape-compact');
    expect(layoutKind(820, 1000)).toBe('portrait-wide');
    expect(layoutKind(1000, 1000)).toBe('portrait-wide');
  });
});

describe('компоновка: инварианты на наборе экранов (LAYOUT.md §7)', () => {
  for (const [w, h] of SCREENS) {
    for (const pointer of ['coarse', 'fine'] as const) {
      it(`${w}×${h} ${pointer}`, () => {
        const s = computeLayout({ width: w, height: h, pointer });
        const z = zones(s);
        const screen = { x: 0, y: 0, w, h };
        // 1. Ничего не обрезано: игровые зоны внутри безопасной области (стол и фон — за её пределы можно).
        for (const r of [z.pairs, z.hand, s.actions, s.hud, s.status]) expect(inside(r, s.safe), JSON.stringify(r)).toBe(true);
        for (const r of [z.deck, z.discard]) expect(inside(r, screen)).toBe(true);
        // Персонаж: голова в кадре, фигура не шире экрана.
        expect(s.character.bounds.y).toBeGreaterThanOrEqual(0);
        expect(s.character.bounds.x).toBeGreaterThanOrEqual(-1);
        expect(s.character.bounds.x + s.character.bounds.w).toBeLessThanOrEqual(w + 1);
        // 2. Нет перекрытий игровых зон.
        expect(overlap(z.pairs, z.hand)).toBe(false);
        expect(overlap(z.pairs, z.deck)).toBe(false);
        expect(overlap(z.pairs, z.discard)).toBe(false);
        // Плашка с числом карт колоды не закрыта отбоем и парами.
        const label = { x: s.deckLabel.x - 18, y: s.deckLabel.y - 11, w: 36, h: 22 };
        expect(overlap(label, z.discard), JSON.stringify({ label, discard: z.discard })).toBe(false);
        expect(overlap(label, z.pairs)).toBe(false);
        for (const r of [z.hand, s.actions, s.status]) expect(overlap(z.discard, r)).toBe(false);
        expect(overlap(z.deck, z.discard)).toBe(false);
        expect(overlap(z.pairs, s.actions)).toBe(false);
        expect(overlap(z.hand, s.actions)).toBe(false);
        expect(overlap(z.pairs, s.status)).toBe(false);
        expect(overlap(z.hand, s.status)).toBe(false);
        // Стол ниже персонажа: игровые карты не залезают на фигуру выше края стола.
        expect(z.pairs.y).toBeGreaterThan(s.table.farY);
        // 3. Размеры: кнопки ≥ 44, карты руки читаемы.
        expect(s.actions.h).toBeGreaterThanOrEqual(MIN_TOUCH);
        expect(s.hud.h).toBeGreaterThanOrEqual(MIN_TOUCH);
        expect(s.hand.cardW).toBeGreaterThanOrEqual(50);
        expect(s.tableCard.w).toBeGreaterThanOrEqual(34);
      });
    }
  }
});

describe('компоновка: большая рука и случайные размеры', () => {
  it('каждая карта руки остаётся выбираемой при руке до 30 карт', () => {
    for (const [w, h] of SCREENS) {
      const s = computeLayout({ width: w, height: h });
      for (const n of [1, 6, 12, 20, 30]) {
        const slots = handSlots(s, n);
        expect(slots).toHaveLength(n);
        for (const p of slots) {
          expect(p.visible).toBeGreaterThanOrEqual(MIN_VISIBLE - 0.01);
          expect(p.x - s.hand.cardW / 2).toBeGreaterThanOrEqual(s.hand.left - 0.5);
          expect(p.x + s.hand.cardW / 2).toBeLessThanOrEqual(s.hand.right + 0.5);
          expect(p.y + s.hand.cardH / 2).toBeLessThanOrEqual(s.hand.bottom + s.hand.cardH * 0.04);
        }
        // Даже большая рука не залезает на стол.
        const top = Math.min(...slots.map((p) => p.y - s.hand.cardH / 2 - s.hand.lift));
        const z = zones(s);
        expect(top).toBeGreaterThan(z.pairs.y + z.pairs.h - s.hand.cardH * 0.9);
      }
    }
  });

  it('500 случайных размеров окна: зоны в безопасной области, без перекрытий', () => {
    let seed = 12345;
    const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (let i = 0; i < 500; i++) {
      const w = Math.round(320 + rand() * 2300);
      const h = Math.round(340 + rand() * 1200);
      const s = computeLayout({ width: w, height: h });
      if (s.tooSmall) continue;
      const z = zones(s);
      for (const r of [z.pairs, z.hand, s.actions]) expect(inside(r, s.safe), `${w}×${h} ${JSON.stringify(r)}`).toBe(true);
      expect(overlap(z.pairs, z.hand), `${w}×${h}`).toBe(false);
      expect(overlap(z.hand, s.actions), `${w}×${h}`).toBe(false);
      expect(overlap(z.pairs, s.actions), `${w}×${h}`).toBe(false);
    }
  });

  it('меньше минимума — флаг подсказки; поддерживаемые экраны набора — без флага', () => {
    expect(computeLayout({ width: 376, height: 393 }).tooSmall).toBe(true);
    expect(computeLayout({ width: 300, height: 600 }).tooSmall).toBe(true);
    for (const [w, h] of SCREENS) expect(computeLayout({ width: w, height: h }).tooSmall).toBe(false);
  });

  it('безопасные зоны устройства учитываются', () => {
    const s = computeLayout({ width: 390, height: 844, safe: { top: 47, right: 0, bottom: 34, left: 0 } });
    expect(s.hud.y).toBeGreaterThanOrEqual(47);
    expect(s.hand.bottom).toBeLessThanOrEqual(844 - 34);
  });

  it('на компьютере пары в один ряд, на телефоне — в два', () => {
    expect(computeLayout({ width: 1280, height: 720 }).pairs.cols).toBe(6);
    expect(computeLayout({ width: 390, height: 844 }).pairs.cols).toBe(3);
    expect(computeLayout({ width: 844, height: 390 }).pairs.cols).toBe(6);
  });

  it('компьютер — Агата крупнее и выше относительно экрана, телефон боком — кадрирование по грудь', () => {
    const d = computeLayout({ width: 1280, height: 720 });
    const c = computeLayout({ width: 844, height: 390 });
    expect(d.character.crop).toBe('waist');
    expect(c.character.crop).toBe('bust');
    expect(d.character.bounds.h).toBeGreaterThan(720 * 0.45);
    expect(FIGURE.waistY).toBeGreaterThan(FIGURE.bustY);
  });
});
