import { describe, expect, it } from 'vitest';
import { computeBoardLayout, traySlot } from '../../src/layout/board';
import { boardBounds, cellCenter } from '../../src/layout/iso';

const VIEWPORTS = [
  [320, 568], [360, 740], [390, 844], [430, 932], [768, 1024], [820, 1180], [1024, 768],
  [1280, 720], [1366, 768], [1440, 900], [1920, 1080], [2560, 1440], [844, 390], [740, 360], [667, 375], [568, 320], [480, 340],
] as const;

const inside = (r: { x: number; y: number; w: number; h: number }, W: number, H: number) => r.x >= 0 && r.y >= 0 && r.x + r.w <= W + 0.5 && r.y + r.h <= H + 0.5;
const overlaps = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe('компоновка доски', () => {
  it.each(VIEWPORTS)('%i×%i: доска в окне, не под кнопками и строкой состояния', (W, H) => {
    const s = computeBoardLayout({ width: W, height: H });
    const b = boardBounds(s.board);
    expect(inside(b, W, H)).toBe(true);
    // Ромб доски не заходит в прямоугольники кнопок и строки: проверяем углы и середины краёв ромба.
    const pts = [cellCenter(s.board, { u: 0, v: 0 }), cellCenter(s.board, { u: 7, v: 0 }), cellCenter(s.board, { u: 7, v: 7 }), cellCenter(s.board, { u: 0, v: 7 })];
    // Ряды взятых фигур — под доской и не под кнопками.
    for (const tr of [s.board.trays.human, s.board.trays.opponent]) {
      // Ряд не заходит на доску: он под ней или сбоку от неё.
      const below = tr.start.y - tr.size > b.y + b.h - 1;
      const beside = tr.start.x + tr.size / 2 <= b.x + 1 || tr.start.x - tr.size / 2 >= b.x + b.w - 1;
      expect(below || beside).toBe(true);
      for (const r of [s.actions, s.status]) expect(overlaps({ x: tr.start.x - tr.size / 2, y: tr.start.y - tr.size, w: tr.size, h: tr.size }, r)).toBe(false);
    }
    for (const p of pts) {
      for (const r of [s.actions, s.status]) expect(p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h).toBe(false);
    }
    for (const r of [s.actions, s.status]) expect(overlaps(b, r)).toBe(false);
    // Доска на столе перед персонажем: дальний край — ниже дальнего края стола (там лежат его руки).
    expect(b.y).toBeGreaterThan(s.table.farY + 4);
    // На самых низких экранах (телефон боком, 320–340 px) клетка мельче, касание выручает притяжение к подсказанному полю.
    expect(s.board.tileW).toBeGreaterThanOrEqual(H < 360 ? 26 : 30);
    // Ряды взятых фигур — в пределах окна.
    for (const t of [s.board.trays.human, s.board.trays.opponent]) {
      for (const k of [0, t.max - 1]) {
        const p = traySlot(t, k);
        expect(p.x - t.size / 2).toBeGreaterThanOrEqual(-1);
        expect(p.x + t.size / 2).toBeLessThanOrEqual(W + 1);
      }
    }
  });

  it('на телефоне доска во всю ширину, на компьютере — крупная', () => {
    const phone = computeBoardLayout({ width: 390, height: 844 });
    expect(boardBounds(phone.board).w).toBeGreaterThan(390 * 0.85);
    const desk = computeBoardLayout({ width: 1920, height: 1080 });
    expect(desk.board.tileW).toBeGreaterThan(75);
  });
});
