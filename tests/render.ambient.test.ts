// Комнаты персонажей и их фоновые анимации (docs/ART_STYLE.md §12): движения цикличны, спокойны, с разными
// периодами, не заходят на табло счёта и место лица, при «Меньше движения» замирают.
import { describe, expect, it } from 'vitest';
import { AGATA_ROOM } from '../src/characters/agata/room';
import { KHARITON_ROOM } from '../src/characters/khariton/room';
import { KOSTYAN_ROOM } from '../src/characters/kostyan/room';
import { MATVEY_ROOM } from '../src/characters/matvey/room';
import { ambientJobs, hueTint, poseBounds, propPose, type AmbientPose, type BgRect, type RoomArt } from '../src/render/ambient';
import { BG_BOARD } from '../src/render/cafe';
import { BG_DESIGN } from '../src/layout/layout';

const ROOMS: readonly RoomArt[] = [AGATA_ROOM, MATVEY_ROOM, KHARITON_ROOM, KOSTYAN_ROOM];
// Где лицо персонажа (единицы фона): за ним ничего не шевелится, чтобы не отвлекать от мимики.
const FACE: BgRect = { x: 1060, y: 80, w: 280, h: 260 };
const SCORE: BgRect = { x: BG_BOARD.x - 10, y: BG_BOARD.y - 10, w: BG_BOARD.w + 20, h: BG_BOARD.h + 20 };

const overlaps = (a: BgRect, b: BgRect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const same = (a: AmbientPose, b: AmbientPose) => {
  for (const k of ['rot', 'dx', 'dy', 'alpha', 'sx', 'sy'] as const) expect(a[k] ?? 0).toBeCloseTo(b[k] ?? 0, 4);
  if (a.tint !== undefined || b.tint !== undefined) {
    // Оттенок — целое RGB: сравниваем по каналам с допуском на округление.
    for (const sh of [16, 8, 0]) expect(Math.abs((((a.tint ?? 0) >> sh) & 255) - (((b.tint ?? 0) >> sh) & 255))).toBeLessThanOrEqual(1);
  }
};

describe.each(ROOMS.map((r) => [r.id, r] as const))('комната %s', (_id, room) => {
  const animated = room.props.filter((p) => p.motion);

  it('фон — документ 2400 × 900 с табло счёта на месте мела', () => {
    const svg = room.backgroundSvg();
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg.trim().endsWith('</svg>')).toBe(true);
    expect(svg).toContain(`viewBox="0 0 ${BG_DESIGN.width} ${BG_DESIGN.height}"`);
    expect(svg).toContain(`x="${BG_BOARD.x}" y="${BG_BOARD.y}" width="${BG_BOARD.w}" height="${BG_BOARD.h}"`);
    expect(svg).not.toMatch(/NaN|undefined/);
    for (const p of room.props) expect(p.svg).not.toMatch(/NaN|undefined/);
  });

  it('2–5 видов движения, у каждого свой период не короче 2 с', () => {
    const periods = animated.map((p) => p.period!);
    expect(periods.every((v) => v !== undefined && v >= 2)).toBe(true);
    expect(periods.length).toBeGreaterThanOrEqual(2);
    expect(periods.length).toBeLessThanOrEqual(6);
    const sorted = [...periods].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) expect(sorted[i]! / sorted[i - 1]!).toBeGreaterThan(1.05);
  });

  it('движения цикличны', () => {
    for (const p of animated)
      for (let i = 0; i < (p.count ?? 1); i++)
        for (const t of [0, 0.7, 3.1, 11.9]) same(p.motion!(t + p.period!, i), p.motion!(t, i));
  });

  it('спокойно: малая скорость, предмет не уходит далеко, не заходит на табло, лицо и стол', () => {
    for (const p of room.props) {
      const reach = p.reach ?? 30;
      const area: BgRect = { x: p.box.x - reach, y: p.box.y - reach, w: p.box.w + 2 * reach, h: p.box.h + 2 * reach };
      const period = p.period ?? 1;
      for (let i = 0; i < (p.count ?? 1); i++) {
        let prev: BgRect | null = null;
        for (let t = 0; t <= period; t += 1 / 30) {
          const pose = propPose(p, t, i, false)!;
          const b = poseBounds(p, pose);
          const visible = (pose.alpha ?? 1) > 0.05;
          if (visible) {
            expect(b.x, `${p.key} слева`).toBeGreaterThanOrEqual(area.x - 0.5);
            expect(b.y, `${p.key} сверху`).toBeGreaterThanOrEqual(area.y - 0.5);
            expect(b.x + b.w, `${p.key} справа`).toBeLessThanOrEqual(area.x + area.w + 0.5);
            expect(b.y + b.h, `${p.key} снизу`).toBeLessThanOrEqual(area.y + area.h + 0.5);
            expect(overlaps(b, SCORE), `${p.key} на табло`).toBe(false);
            expect(b.y + b.h, `${p.key} ниже края стола`).toBeLessThanOrEqual(BG_DESIGN.tableY);
            if (p.motion) expect(overlaps(b, FACE), `${p.key} за лицом`).toBe(false);
          }
          if (prev && visible) {
            // Не быстрее 80 единиц фона в секунду (≈ 70 пикселей на компьютере) — ни рывков, ни мельтешения.
            const v = Math.max(Math.abs(b.x - prev.x), Math.abs(b.y - prev.y), Math.abs(b.w - prev.w), Math.abs(b.h - prev.h)) * 30;
            expect(v, `${p.key}#${i} скорость`).toBeLessThan(80);
          }
          prev = visible ? b : null;
        }
      }
    }
  });

  it('«Меньше движения»: частицы скрыты, остальное замерло', () => {
    for (const p of room.props)
      for (let i = 0; i < (p.count ?? 1); i++) {
        const a = propPose(p, 0, i, true);
        if (p.particle) expect(a).toBeNull();
        else for (const t of [1.3, 7.7, 42]) same(propPose(p, t, i, true)!, a!);
      }
  });

  it('текстуры предметов — небольшие', () => {
    const jobs = ambientJobs(room, 1);
    const px = jobs.reduce((s, j) => s + j.w * j.h, 0);
    // Меньше трети пикселей фона.
    expect(px).toBeLessThan((BG_DESIGN.width * BG_DESIGN.height) / 3);
  });
});

it('у каждого персонажа своя комната', () => {
  expect(new Set(ROOMS.map((r) => r.id)).size).toBe(4);
  expect(new Set(ROOMS.map((r) => r.backgroundSvg())).size).toBe(4);
});

it('hueTint даёт корректный RGB', () => {
  for (let u = 0; u < 1; u += 0.05) {
    const c = hueTint(u);
    expect(c).toBeGreaterThanOrEqual(0);
    expect(c).toBeLessThanOrEqual(0xffffff);
  }
});
