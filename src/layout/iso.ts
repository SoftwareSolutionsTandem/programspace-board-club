// Проекция доски 8 × 8 (docs/ART_STYLE.md §11, docs/LAYOUT.md §6в): взгляд сверху-сбоку с мягкой перспективой,
// как на карточный стол. Доска стоит прямо: ряды горизонтальны, ближний край — сторона игрока, дальний —
// сторона персонажа. Координаты клетки — с точки зрения игрока: u — слева направо (0…7), v — от него вглубь (0…7).
// Перспектива: глубина ряда z = 1 + persp · v / 8; ширина и положение ряда на экране — ∝ 1/z, поэтому дальний край
// чуть уже ближнего, а ряды к нему чуть сжимаются. Проекция обратима точно. Чистые функции, без DOM.
import type { Point } from './layout';

export interface IsoBoard {
  /** Середина доски по горизонтали. */
  readonly cx: number;
  /** Экранная высота ближнего края игрового поля (v = 0). */
  readonly nearY: number;
  /** Ширина клетки у ближнего края. */
  readonly tileW: number;
  /** Высота ближнего ряда к ширине клетки: «наклон» взгляда (1 — строго сверху). */
  readonly tilt: number;
  /** Сила перспективы: дальний край уже ближнего в 1 + persp раз. */
  readonly persp: number;
  /** Высота ближнего ряда (tileW · tilt) — для размеров подсветки и подписей. */
  readonly tileH: number;
  /** Толщина доски (видимая передняя грань), пиксели. */
  readonly depth: number;
}

export interface Cell {
  readonly u: number;
  readonly v: number;
}

/** Ширина рамки вокруг клеток, в клетках (рамка видна, но в неё не попадают касанием). */
export const FRAME = 0.32;

const depthZ = (b: IsoBoard, v: number) => 1 + (b.persp * v) / 8;
/** Расстояние от «горизонта» до ближнего края: подобрано так, чтобы ближний ряд был высотой tileH. */
const horizon = (b: IsoBoard) => (b.tileH * 8) / b.persp;

/** Точка верхней грани по непрерывным координатам доски (0…8 по каждой оси; за краями — рамка). */
export function isoPoint(b: IsoBoard, u: number, v: number): Point {
  const z = depthZ(b, v);
  const K = horizon(b);
  return { x: b.cx + ((u - 4) * b.tileW) / z, y: b.nearY - K + K / z };
}

/** Масштаб предметов на доске на экранной высоте y: 1 у ближнего края, меньше к дальнему. */
export function scaleAtY(b: IsoBoard, y: number): number {
  const K = horizon(b);
  return Math.max(0.2, (y - (b.nearY - K)) / K);
}

/** Центр клетки. */
export const cellCenter = (b: IsoBoard, c: Cell): Point => isoPoint(b, c.u + 0.5, c.v + 0.5);

/** Четыре угла трапеции клетки: ближний левый, ближний правый, дальний правый, дальний левый. */
export function cellCorners(b: IsoBoard, c: Cell): [Point, Point, Point, Point] {
  return [isoPoint(b, c.u, c.v), isoPoint(b, c.u + 1, c.v), isoPoint(b, c.u + 1, c.v + 1), isoPoint(b, c.u, c.v + 1)];
}

/** Непрерывные координаты доски по точке экрана (обратная проекция). */
export function isoUnproject(b: IsoBoard, x: number, y: number): { u: number; v: number } {
  const K = horizon(b);
  const d = y - (b.nearY - K);
  if (d <= 0) return { u: -1, v: Infinity };
  const z = K / d;
  return { u: 4 + ((x - b.cx) * z) / b.tileW, v: ((z - 1) * 8) / b.persp };
}

/** Клетка под точкой — строго по трапеции клетки; вне доски — null. */
export function cellAt(b: IsoBoard, x: number, y: number): Cell | null {
  const { u, v } = isoUnproject(b, x, y);
  if (!(u >= 0 && v >= 0 && u < 8 && v < 8)) return null;
  return { u: Math.floor(u), v: Math.floor(v) };
}

/**
 * Клетка для касания пальцем: точное попадание в клетку, а если касание мимо — ближайшая из подсказанных
 * (например, доступных для хода) в пределах radius пикселей: дальние ряды на телефоне ниже удобного касания.
 */
export function pickCell(b: IsoBoard, x: number, y: number, candidates: readonly Cell[], radius: number): Cell | null {
  const exact = cellAt(b, x, y);
  if (exact && (candidates.length === 0 || candidates.some((c) => c.u === exact.u && c.v === exact.v))) return exact;
  let best: Cell | null = null;
  let bestD = radius * radius;
  for (const c of candidates) {
    const p = cellCenter(b, c);
    // По вертикали клетки сжаты наклоном — расстояние по y растягиваем.
    const dx = p.x - x, dy = (p.y - y) / b.tilt;
    const d = dx * dx + dy * dy;
    if (d <= bestD) {
      bestD = d;
      best = c;
    }
  }
  return best ?? exact;
}

/** Порядок отрисовки: дальние ряды (выше на экране) раньше ближних. */
export const depthOf = (c: Cell): number => -c.v;

/** Клетка доски с точки зрения игрока: у белых a1 — ближний левый угол, у чёрных — h8. */
export function cellOfSquare(square: number, human: 'w' | 'b'): Cell {
  const file = square & 7, rank = square >> 3;
  return human === 'w' ? { u: file, v: rank } : { u: 7 - file, v: 7 - rank };
}

export function squareOfCell(c: Cell, human: 'w' | 'b'): number {
  return human === 'w' ? c.v * 8 + c.u : (7 - c.v) * 8 + (7 - c.u);
}

/** Габарит доски на экране вместе с рамкой и передней гранью. */
export function boardBounds(b: IsoBoard): { x: number; y: number; w: number; h: number } {
  const nl = isoPoint(b, -FRAME, -FRAME), nr = isoPoint(b, 8 + FRAME, -FRAME), far = isoPoint(b, -FRAME, 8 + FRAME);
  return { x: nl.x, y: far.y, w: nr.x - nl.x, h: nl.y + b.depth - far.y };
}
