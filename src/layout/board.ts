// Компоновка партии на доске (шахматы, шашки; docs/LAYOUT.md §7): общий кадр «персонаж напротив через стол»
// из computeLayout, а на столе — изометрическая доска-ромб. Верхний угол доски — у дальнего края стола между
// руками персонажа; сторона игрока — нижний левый край. Чистые функции: размеры окна → координаты (CSS-пиксели).
import { FRAME, type IsoBoard } from './iso';
import { BG_DESIGN, computeLayout, FIGURE, MIN_TOUCH, type LayoutSpec, type Point, type Rect, type Viewport } from './layout';

/** Высота ромба клетки к его ширине: «изометрия» чуть круче классической 1:2 — фигуры читаются лучше. */
export const ISO_RATIO = 0.58;
/** Толщина доски к высоте ромба клетки. */
export const DEPTH_RATIO = 0.5;
/** Насколько самая высокая фигура выше центра своей клетки (в ширинах клетки) — запас над дальним углом. */
export const PIECE_RISE = 1.05;

export interface BoardLayout extends LayoutSpec {
  readonly board: IsoBoard & {
    /** Взятые фигуры: у игрока — вдоль нижнего правого края, у соперника — вдоль верхнего левого. */
    readonly trays: { readonly human: Tray; readonly opponent: Tray };
    /** Радиус «притяжения» касания к подсказанной клетке (палец мимо ромба). */
    readonly snap: number;
  };
}

/** Ряд взятых фигур: начало, шаг вдоль края и размер значка. */
export interface Tray {
  readonly start: Point;
  readonly step: Point;
  readonly size: number;
  readonly max: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function computeBoardLayout(vp: Viewport): BoardLayout {
  const base = computeLayout(vp);
  const portraitish = base.kind === 'portrait' || base.kind === 'portrait-wide';
  const { safe } = base;
  const W = base.width, H = base.height;
  const btnH = clamp(H * 0.07, MIN_TOUCH + 4, 76);

  // Кнопки и строка состояния: карт в руке нет, поэтому на телефоне — внизу экрана, на компьютере — как в общей компоновке.
  let actions: Rect = base.actions;
  let status: Rect = base.status;
  if (portraitish) {
    actions = { x: safe.x + safe.w * 0.5, y: safe.y + safe.h - btnH, w: safe.w * 0.5, h: btnH };
    status = { x: safe.x, y: actions.y + (btnH - 40) / 2, w: safe.w * 0.5 - 8, h: 40 };
  }

  // Доска: верхний угол — у дальнего края стола, нижний (с толщиной) — над строкой состояния (телефон)
  // или у нижнего края (компьютер: кнопки и строка состояния — по сторонам доски).
  const bottom = portraitish ? Math.min(actions.y, status.y) - 10 : safe.y + safe.h - 4;
  // На компьютере персонаж меньше, чем за карточным столом: доске нужна высота.
  const farMin = base.kind === 'landscape' ? Math.round(H * 0.4) : base.table.farY;
  const span = 8 + 2 * FRAME;
  const boardHeight = (tw: number) => tw * ISO_RATIO * (span + DEPTH_RATIO);
  // По ширине: на телефоне — вся ширина; на компьютере — между строкой состояния и кнопками.
  // Телефон боком: кнопки и строка состояния — колонкой справа, доска и персонаж — левее неё.
  const compact = base.kind === 'landscape-compact';
  const regionRight = compact ? actions.x - 10 : safe.x + safe.w;
  const sideRoom = portraitish ? safe.w : compact ? regionRight - safe.x : Math.min(W - 2 * Math.max(actions.w, status.w) - 2 * safe.x - 24, safe.w * 0.8);
  const tileW = Math.max(18, Math.min((bottom - farMin - 6) / boardHeight(1), sideRoom / span, 132));
  const tileH = tileW * ISO_RATIO;
  const depth = tileH * DEPTH_RATIO;
  // Лишняя высота (телефон): доска опускается к кнопкам, персонаж становится крупнее.
  const free = bottom - farMin - 6 - boardHeight(tileW);
  const farY = Math.round(farMin + Math.max(0, free) * (portraitish ? 0.6 : 0.3));
  const top = farY + 6;
  const cx = compact ? (safe.x + regionRight) / 2 : safe.x + safe.w / 2;
  const cy = top + (4 + FRAME) * tileH;

  // Персонаж и стол — как в общей компоновке, но от своего дальнего края стола.
  const crop = base.character.crop;
  const anchorLocal = crop === 'bust' ? FIGURE.bustY : FIGURE.waistY;
  const topMargin = Math.max((vp.safe?.top ?? 0) + 6, H * 0.03);
  let scale = (farY - topMargin) / (anchorLocal - FIGURE.headTop);
  scale = Math.min(scale, cx / FIGURE.centerX, (W - cx) / (FIGURE.width - FIGURE.centerX), base.kind === 'landscape' ? 1.25 : 2);
  const charY = farY + 2;
  const charBounds: Rect = { x: cx - FIGURE.centerX * scale, y: charY - (anchorLocal - FIGURE.headTop) * scale, w: FIGURE.width * scale, h: (anchorLocal - FIGURE.headTop) * scale };
  const farHalf = Math.max(portraitish ? W / 2 + 24 : Math.min(W * 0.34, safe.w * 0.48), tileW * 2.2);
  const nearY = H + 60;
  const spread = portraitish ? 0.12 : 0.9;
  const nearHalf = farHalf + (nearY - farY) * spread;
  const table = { farY, farLeft: cx - farHalf, farRight: cx + farHalf, nearY, nearLeft: cx - nearHalf, nearRight: cx + nearHalf };
  const bgScale = Math.max(H / BG_DESIGN.height, (farY + 40) / BG_DESIGN.tableY);
  const background = { scale: bgScale, x: cx - BG_DESIGN.centerX * bgScale, y: farY - BG_DESIGN.tableY * bgScale };

  // Взятые фигуры — снаружи ромба, параллельно краям: у игрока — нижний правый край, у соперника — верхний левый.
  const size = clamp(tileW * 0.5, 14, 40);
  const n = 16;
  const tray = (from: Point, to: Point, normal: Point, shift: number): Tray => {
    const len = Math.hypot(to.x - from.x, to.y - from.y);
    const nl = Math.hypot(normal.x, normal.y);
    const off = size * 0.85;
    const ox = (normal.x / nl) * off, oy = (normal.y / nl) * off + shift;
    const pitch = Math.min(size * 0.7, (len * 0.7) / n);
    return { start: { x: from.x + ox, y: from.y + oy }, step: { x: ((to.x - from.x) / len) * pitch, y: ((to.y - from.y) / len) * pitch }, size, max: n };
  };
  const e = 4 + FRAME;
  const L = { x: cx - e * tileW, y: cy }, T = { x: cx, y: cy - e * tileH }, R = { x: cx + e * tileW, y: cy }, B = { x: cx, y: cy + e * tileH };
  const humanTray = tray({ x: B.x + (R.x - B.x) * 0.15, y: B.y + (R.y - B.y) * 0.15 }, R, { x: tileH, y: tileW }, depth);
  const oppTray = tray({ x: L.x + (T.x - L.x) * 0.1, y: L.y + (T.y - L.y) * 0.1 }, T, { x: -tileH, y: -tileW }, 0);

  return {
    ...base,
    actions,
    status,
    character: { x: cx, y: charY, scale, crop, bounds: charBounds },
    table,
    background,
    board: { cx, cy, tileW, tileH, depth, trays: { human: humanTray, opponent: oppTray }, snap: Math.max(MIN_TOUCH * 0.75, tileW * 0.7) },
  };
}

/** Где лежит k-я взятая фигура в ряду. */
export function traySlot(t: Tray, k: number): Point {
  const i = Math.min(k, t.max - 1);
  return { x: t.start.x + t.step.x * i, y: t.start.y + t.step.y * i };
}
