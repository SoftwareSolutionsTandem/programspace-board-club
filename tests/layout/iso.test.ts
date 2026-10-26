import { describe, expect, it } from 'vitest';
import { cellAt, cellCenter, cellCorners, cellOfSquare, isoPoint, isoUnproject, pickCell, squareOfCell, type IsoBoard } from '../../src/layout/iso';

const B: IsoBoard = { cx: 400, cy: 300, tileW: 60, tileH: 36, depth: 14 };

describe('изометрическая проекция', () => {
  it('углы доски: левый, нижний, правый, верхний', () => {
    expect(isoPoint(B, 0, 0)).toEqual({ x: 160, y: 300 });
    expect(isoPoint(B, 8, 0)).toEqual({ x: 400, y: 444 });
    expect(isoPoint(B, 8, 8)).toEqual({ x: 640, y: 300 });
    expect(isoPoint(B, 0, 8)).toEqual({ x: 400, y: 156 });
  });

  it('обратная проекция точна', () => {
    for (let u = 0; u <= 8; u += 0.25) for (let v = 0; v <= 8; v += 0.5) {
      const p = isoPoint(B, u, v);
      const r = isoUnproject(B, p.x, p.y);
      expect(r.u).toBeCloseTo(u, 9);
      expect(r.v).toBeCloseTo(v, 9);
    }
  });

  it('центр каждой клетки попадает в свою клетку', () => {
    for (let u = 0; u < 8; u++) for (let v = 0; v < 8; v++) expect(cellAt(B, cellCenter(B, { u, v }).x, cellCenter(B, { u, v }).y)).toEqual({ u, v });
  });

  it('область попадания — ромб: углы прямоугольника вокруг клетки принадлежат соседям', () => {
    const c = { u: 3, v: 4 };
    const p = cellCenter(B, c);
    // Чуть внутри ромба — та же клетка.
    expect(cellAt(B, p.x + B.tileW * 0.45, p.y)).toEqual(c);
    expect(cellAt(B, p.x, p.y + B.tileH * 0.45)).toEqual(c);
    // Угол описанного прямоугольника — уже соседняя клетка (по диагонали ромба).
    expect(cellAt(B, p.x + B.tileW * 0.4, p.y + B.tileH * 0.4)).toEqual({ u: 4, v: 4 });
    expect(cellAt(B, p.x - B.tileW * 0.4, p.y - B.tileH * 0.4)).toEqual({ u: 2, v: 4 });
    expect(cellAt(B, p.x + B.tileW * 0.4, p.y - B.tileH * 0.4)).toEqual({ u: 3, v: 5 });
    expect(cellAt(B, p.x - B.tileW * 0.4, p.y + B.tileH * 0.4)).toEqual({ u: 3, v: 3 });
  });

  it('вне доски — null', () => {
    expect(cellAt(B, 150, 300)).toBeNull();
    expect(cellAt(B, 400, 150)).toBeNull();
    expect(cellAt(B, 170, 200)).toBeNull();
    const [l, , r] = cellCorners(B, { u: 0, v: 0 });
    expect(l).toEqual(isoPoint(B, 0, 0));
    expect(r).toEqual(isoPoint(B, 1, 1));
  });

  it('касание мимо ромба притягивается к ближайшей подсказанной клетке', () => {
    const target = { u: 5, v: 2 };
    const p = cellCenter(B, target);
    expect(pickCell(B, p.x + B.tileW * 0.55, p.y, [target], 40)).toEqual(target);
    expect(pickCell(B, p.x, p.y, [], 40)).toEqual(target);
    // Точное попадание в неподсказанную клетку при далёких подсказках — эта клетка.
    expect(pickCell(B, cellCenter(B, { u: 0, v: 0 }).x, cellCenter(B, { u: 0, v: 0 }).y, [target], 20)).toEqual({ u: 0, v: 0 });
  });

  it('клетки с точки зрения игрока: белые — a1 слева у края, чёрные — h8', () => {
    expect(cellOfSquare(0, 'w')).toEqual({ u: 0, v: 0 });
    expect(cellOfSquare(63, 'b')).toEqual({ u: 0, v: 0 });
    expect(cellOfSquare(7, 'w')).toEqual({ u: 7, v: 0 });
    for (let s = 0; s < 64; s++) for (const h of ['w', 'b'] as const) expect(squareOfCell(cellOfSquare(s, h), h)).toBe(s);
  });
});
