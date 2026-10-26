import { describe, expect, it } from 'vitest';
import { boardBounds, cellAt, cellCenter, cellCorners, cellOfSquare, isoPoint, isoUnproject, pickCell, scaleAtY, squareOfCell, type IsoBoard } from '../../src/layout/iso';

const B: IsoBoard = { cx: 400, nearY: 500, tileW: 60, tilt: 0.7, persp: 0.2, tileH: 42, depth: 18 };

describe('проекция доски: прямо, сверху-сбоку, мягкая перспектива', () => {
  it('ближний край горизонтален и шириной 8 клеток; дальний — тоже горизонтален и уже в 1 + persp раз', () => {
    const nl = isoPoint(B, 0, 0), nr = isoPoint(B, 8, 0), fl = isoPoint(B, 0, 8), fr = isoPoint(B, 8, 8);
    expect(nl).toEqual({ x: 160, y: 500 });
    expect(nr).toEqual({ x: 640, y: 500 });
    expect(fl.y).toBeCloseTo(fr.y, 9);
    expect((fr.x - fl.x) * 1.2).toBeCloseTo(480, 6);
    // Доска симметрична относительно своей середины.
    expect(fl.x + fr.x).toBeCloseTo(800, 9);
    expect(fl.y).toBeLessThan(nl.y);
  });

  it('ближний ряд высотой tileH, ряды к дальнему краю сжимаются, но не больше, чем в (1 + persp)²', () => {
    const rows = Array.from({ length: 8 }, (_, v) => isoPoint(B, 0, v).y - isoPoint(B, 0, v + 1).y);
    expect(rows[0]).toBeCloseTo(42 / (1 + 0.2 / 8), 0);
    for (let v = 1; v < 8; v++) expect(rows[v]!).toBeLessThan(rows[v - 1]!);
    expect(rows[7]! * 1.2 * 1.2).toBeGreaterThan(rows[0]! * 0.95);
  });

  it('обратная проекция точна', () => {
    for (let u = -0.3; u <= 8.3; u += 0.25) for (let v = -0.3; v <= 8.3; v += 0.5) {
      const p = isoPoint(B, u, v);
      const r = isoUnproject(B, p.x, p.y);
      expect(r.u).toBeCloseTo(u, 9);
      expect(r.v).toBeCloseTo(v, 9);
    }
  });

  it('центр каждой клетки попадает в свою клетку; область попадания — трапеция клетки', () => {
    for (let u = 0; u < 8; u++) for (let v = 0; v < 8; v++) {
      const c = cellCenter(B, { u, v });
      expect(cellAt(B, c.x, c.y)).toEqual({ u, v });
      const [p0, p1, p2, p3] = cellCorners(B, { u, v });
      // Чуть внутри углов — та же клетка, чуть снаружи — соседняя.
      const inside = (p: { x: number; y: number }) => ({ x: c.x + (p.x - c.x) * 0.9, y: c.y + (p.y - c.y) * 0.9 });
      for (const p of [p0, p1, p2, p3]) expect(cellAt(B, inside(p).x, inside(p).y)).toEqual({ u, v });
    }
    const c = cellCenter(B, { u: 3, v: 4 });
    const w = (isoPoint(B, 4, 4.5).x - isoPoint(B, 3, 4.5).x) / 2;
    expect(cellAt(B, c.x + w * 1.1, c.y)).toEqual({ u: 4, v: 4 });
    expect(cellAt(B, c.x - w * 1.1, c.y)).toEqual({ u: 2, v: 4 });
  });

  it('вне доски — null', () => {
    expect(cellAt(B, 150, 480)).toBeNull();
    expect(cellAt(B, 400, 510)).toBeNull();
    expect(cellAt(B, 400, isoPoint(B, 4, 8).y - 2)).toBeNull();
    expect(cellAt(B, 400, -1000)).toBeNull();
  });

  it('предметы у дальнего края мельче ровно на перспективу', () => {
    expect(scaleAtY(B, 500)).toBeCloseTo(1, 9);
    expect(scaleAtY(B, isoPoint(B, 0, 8).y)).toBeCloseTo(1 / 1.2, 9);
  });

  it('касание мимо клетки притягивается к ближайшей подсказанной', () => {
    const target = { u: 5, v: 7 };
    const p = cellCenter(B, target);
    expect(pickCell(B, p.x, p.y - 30, [target], 50)).toEqual(target);
    expect(pickCell(B, p.x, p.y, [], 40)).toEqual(target);
    const a1 = cellCenter(B, { u: 0, v: 0 });
    expect(pickCell(B, a1.x, a1.y, [target], 20)).toEqual({ u: 0, v: 0 });
  });

  it('клетки с точки зрения игрока: белые — a1 у ближнего левого угла, чёрные — h8', () => {
    expect(cellOfSquare(0, 'w')).toEqual({ u: 0, v: 0 });
    expect(cellOfSquare(63, 'b')).toEqual({ u: 0, v: 0 });
    expect(cellOfSquare(7, 'w')).toEqual({ u: 7, v: 0 });
    for (let s = 0; s < 64; s++) for (const h of ['w', 'b'] as const) expect(squareOfCell(cellOfSquare(s, h), h)).toBe(s);
  });

  it('габарит доски включает рамку и переднюю грань', () => {
    const bb = boardBounds(B);
    expect(bb.x).toBeLessThan(160);
    expect(bb.x + bb.w).toBeGreaterThan(640);
    expect(bb.y + bb.h).toBeGreaterThan(500 + 18);
  });
});
