// Изометрическая доска 8 × 8 (docs/ART_STYLE.md §9, docs/LAYOUT.md §7): проекция клетки на экран и обратно.
// Доска повернута на 45°: ромб с углами слева, снизу, справа и сверху. Сторона игрока — нижний левый край
// (от левого угла к нижнему), сторона соперника — верхний правый. Координаты клетки — с точки зрения игрока:
// u — слева направо вдоль его края (0…7), v — от него вглубь (0…7). Чистые функции, без DOM.
import type { Point } from './layout';

export interface IsoBoard {
  /** Центр ромба верхней грани. */
  readonly cx: number;
  readonly cy: number;
  /** Ширина и высота ромба одной клетки. */
  readonly tileW: number;
  readonly tileH: number;
  /** Толщина доски (высота боковых граней), пиксели. */
  readonly depth: number;
}

export interface Cell {
  readonly u: number;
  readonly v: number;
}

/** Точка верхней грани по непрерывным координатам доски (0…8 по каждой оси). */
export function isoPoint(b: IsoBoard, u: number, v: number): Point {
  const hw = b.tileW / 2, hh = b.tileH / 2;
  return { x: b.cx - 4 * b.tileW + (u + v) * hw, y: b.cy + (u - v) * hh };
}

/** Центр клетки. */
export const cellCenter = (b: IsoBoard, c: Cell): Point => isoPoint(b, c.u + 0.5, c.v + 0.5);

/** Четыре угла ромба клетки: левый, нижний, правый, верхний. */
export function cellCorners(b: IsoBoard, c: Cell): [Point, Point, Point, Point] {
  return [isoPoint(b, c.u, c.v), isoPoint(b, c.u + 1, c.v), isoPoint(b, c.u + 1, c.v + 1), isoPoint(b, c.u, c.v + 1)];
}

/** Непрерывные координаты доски по точке экрана (обратная проекция). */
export function isoUnproject(b: IsoBoard, x: number, y: number): { u: number; v: number } {
  const dx = (x - (b.cx - 4 * b.tileW)) / (b.tileW / 2);
  const dy = (y - b.cy) / (b.tileH / 2);
  return { u: (dx + dy) / 2, v: (dx - dy) / 2 };
}

/** Клетка под точкой — строго по ромбу клетки; вне доски — null. */
export function cellAt(b: IsoBoard, x: number, y: number): Cell | null {
  const { u, v } = isoUnproject(b, x, y);
  if (u < 0 || v < 0 || u >= 8 || v >= 8) return null;
  return { u: Math.floor(u), v: Math.floor(v) };
}

/**
 * Клетка для касания пальцем: точное попадание в ромб, а если касание мимо — ближайшая из подсказанных
 * (например, доступных для хода) в пределах radius пикселей. Ромб клетки на телефоне ниже удобного касания.
 */
export function pickCell(b: IsoBoard, x: number, y: number, candidates: readonly Cell[], radius: number): Cell | null {
  const exact = cellAt(b, x, y);
  if (exact && (candidates.length === 0 || candidates.some((c) => c.u === exact.u && c.v === exact.v))) return exact;
  let best: Cell | null = null;
  let bestD = radius * radius;
  for (const c of candidates) {
    const p = cellCenter(b, c);
    // Расстояние в «изометрической» метрике: по вертикали ромб сжат, поэтому dy растягиваем.
    const dx = p.x - x, dy = (p.y - y) * (b.tileW / b.tileH);
    const d = dx * dx + dy * dy;
    if (d <= bestD) {
      bestD = d;
      best = c;
    }
  }
  return best ?? exact;
}

/** Порядок отрисовки: дальние клетки (выше на экране) раньше ближних. */
export const depthOf = (c: Cell): number => c.u - c.v;

/** Клетка доски с точки зрения игрока: у белых a1 слева у ближнего края, у чёрных — h8. */
export function cellOfSquare(square: number, human: 'w' | 'b'): Cell {
  const file = square & 7, rank = square >> 3;
  return human === 'w' ? { u: file, v: rank } : { u: 7 - file, v: 7 - rank };
}

export function squareOfCell(c: Cell, human: 'w' | 'b'): number {
  return human === 'w' ? c.v * 8 + c.u : (7 - c.v) * 8 + (7 - c.u);
}

/** Ширина рамки вокруг клеток, в клетках (рамка видна, но в неё не попадают касанием). */
export const FRAME = 0.32;

/** Габарит доски на экране вместе с рамкой и боковыми гранями. */
export function boardBounds(b: IsoBoard): { x: number; y: number; w: number; h: number } {
  const n = 4 + FRAME;
  return { x: b.cx - n * b.tileW, y: b.cy - n * b.tileH, w: 2 * n * b.tileW, h: 2 * n * b.tileH + b.depth };
}
