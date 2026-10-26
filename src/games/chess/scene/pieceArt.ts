// Шахматные фигуры для доски 2,5D (docs/ART_STYLE.md §11): точёные, с основанием-подставкой,
// крупными узнаваемыми силуэтами и мягкой тенью справа. Белые — слоновая кость, чёрные — тёмный орех.
// Рисунок 100 × 158, точка опоры — центр основания (50, 138). Модуль строит SVG-строки и не зависит от DOM.
import { cylinder, lathe, ol, shaded, smooth, svgDoc, type Tone } from '../../../board/pieceKit';
import type { PieceInfo } from '../../../board/scene';
import type { Kind } from '../rules/board';

export const PIECE_W = 100, PIECE_H = 158, FOOT_Y = 138;
const CX = 50;

export const TONES: Readonly<Record<'w' | 'b', Tone>> = {
  w: { base: '#F6EEDB', shade: '#D2BC97', hi: '#FFFFFF', accent: '#E8AB30' },
  b: { base: '#4B3A35', shade: '#2A1F1C', hi: '#8A726A', accent: '#E8AB30' },
};

/** Подставка: широкий низкий цилиндр и кольцо над ним. */
function plinth(id: string, t: Tone, r = 34): string {
  return cylinder(`${id}p`, CX, FOOT_Y - 10, FOOT_Y, r, t) + cylinder(`${id}q`, CX, FOOT_Y - 17, FOOT_Y - 10, r * 0.78, t, 3.4);
}

/** Тело вращения с тенью. */
const body = (id: string, t: Tone, profile: readonly (readonly [number, number])[]): string => {
  const top = Math.min(...profile.map((p) => p[1]));
  return shaded(`${id}b`, lathe(CX, profile), t, CX, top, profile[0]![1]);
};

/** Шар с бликом. */
const ball = (x: number, y: number, r: number, t: Tone): string => `<circle cx="${x}" cy="${y}" r="${r}" fill="${t.base}" ${ol(3.4)}/>
  <path d="M${x + r * 0.2} ${y + r * 0.95} A${r} ${r} 0 0 0 ${x + r * 0.95} ${y + r * 0.2} A${r * 1.2} ${r * 1.2} 0 0 1 ${x + r * 0.2} ${y + r * 0.95} Z" fill="${t.shade}" opacity="0.8"/>
  <circle cx="${x - r * 0.35}" cy="${y - r * 0.35}" r="${r * 0.28}" fill="${t.hi}" opacity="0.75"/>`;

function pawn(id: string, t: Tone): string {
  return plinth(id, t, 30) + body(id, t, [[20, FOOT_Y - 16], [16, 112], [10, 98], [8, 92]]) +
    cylinder(`${id}c`, CX, 88, 93, 15, t, 3.4) + ball(CX, 74, 15, t);
}

function rook(id: string, t: Tone): string {
  const top = 54;
  // Зубцы башни: передний край зубчатой короны в изометрии — по эллипсу.
  const crown = `<path d="M24 ${top + 6} L24 ${top - 8} L33 ${top - 8} L33 ${top} L44 ${top + 2} L44 ${top - 7} L56 ${top - 7} L56 ${top + 2} L67 ${top} L67 ${top - 8} L76 ${top - 8} L76 ${top + 6} Q50 ${top + 18} 24 ${top + 6} Z" fill="${t.base}" ${ol(3.6)}/>
  <path d="M60 ${top + 8} L67 ${top + 1} L76 ${top - 2} L76 ${top + 6} Q66 ${top + 12} 60 ${top + 12} Z" fill="${t.shade}" opacity="0.8"/>
  <ellipse cx="${CX}" cy="${top + 2}" rx="19" ry="5" fill="${t.shade}" opacity="0.7"/>`;
  return plinth(id, t) + body(id, t, [[24, FOOT_Y - 16], [19, 108], [18, 80], [23, top + 8]]) + cylinder(`${id}r`, CX, top + 8, top + 14, 26, t, 3.4) + crown;
}

function bishop(id: string, t: Tone): string {
  const mitre = `M${CX} 24 C${CX + 20} 38 ${CX + 22} 60 ${CX + 13} 72 L${CX - 13} 72 C${CX - 22} 60 ${CX - 20} 38 ${CX} 24 Z`;
  return plinth(id, t) + body(id, t, [[22, FOOT_Y - 16], [15, 108], [9, 90], [10, 80]]) + cylinder(`${id}c`, CX, 76, 82, 17, t, 3.4) +
    shaded(`${id}m`, mitre, t, CX, 24, 72, 3.6) +
    `<path d="M${CX + 3} 38 L${CX - 9} 56" fill="none" ${ol(3.4)}/>` + ball(CX, 20, 6.5, t);
}

function queen(id: string, t: Tone): string {
  // Корона: зубцы с шариками по эллипсу, сзади и спереди.
  const crownTop = 34;
  const points = [-24, -12, 0, 12, 24];
  const balls = points.map((dx) => ball(CX + dx, crownTop - (Math.abs(dx) < 1 ? 6 : Math.abs(dx) < 13 ? 2 : 0), 5, t)).join('');
  const crown = `M${CX - 25} ${crownTop + 2} L${CX - 15} ${crownTop + 22} L${CX - 12} ${crownTop + 2} L${CX - 3} ${crownTop + 22} L${CX} ${crownTop - 2} L${CX + 3} ${crownTop + 22} L${CX + 12} ${crownTop + 2} L${CX + 15} ${crownTop + 22} L${CX + 25} ${crownTop + 2} L${CX + 20} ${crownTop + 32} Q${CX} ${crownTop + 40} ${CX - 20} ${crownTop + 32} Z`;
  return plinth(id, t) + body(id, t, [[24, FOOT_Y - 16], [16, 106], [10, 86], [14, 72], [20, 66]]) + cylinder(`${id}c`, CX, 68, 75, 18, t, 3.4) +
    shaded(`${id}k`, crown, t, CX, crownTop, crownTop + 38, 3.6) + balls +
    `<path d="M${CX - 19} ${crownTop + 30} Q${CX} ${crownTop + 37} ${CX + 19} ${crownTop + 30}" fill="none" stroke="${t.accent}" stroke-width="3" stroke-linecap="round"/>`;
}

function king(id: string, t: Tone): string {
  const capTop = 38;
  const cap = `M${CX - 22} ${capTop + 30} C${CX - 26} ${capTop + 8} ${CX - 12} ${capTop} ${CX} ${capTop} C${CX + 12} ${capTop} ${CX + 26} ${capTop + 8} ${CX + 22} ${capTop + 30} Q${CX} ${capTop + 38} ${CX - 22} ${capTop + 30} Z`;
  const cross = `<path d="M${CX - 4} ${capTop - 2} L${CX - 4} ${capTop - 12} L${CX - 12} ${capTop - 12} L${CX - 12} ${capTop - 20} L${CX - 4} ${capTop - 20} L${CX - 4} ${capTop - 28} L${CX + 4} ${capTop - 28} L${CX + 4} ${capTop - 20} L${CX + 12} ${capTop - 20} L${CX + 12} ${capTop - 12} L${CX + 4} ${capTop - 12} L${CX + 4} ${capTop - 2} Z" fill="${t.base}" ${ol(3.4)}/>
  <path d="M${CX + 1} ${capTop - 12} L${CX + 4} ${capTop - 12} L${CX + 4} ${capTop - 2} L${CX + 1} ${capTop - 2} Z" fill="${t.shade}" opacity="0.8"/>`;
  return plinth(id, t) + body(id, t, [[25, FOOT_Y - 16], [17, 106], [11, 86], [15, 74], [21, 70]]) + cylinder(`${id}c`, CX, 70, 77, 19, t, 3.4) +
    shaded(`${id}k`, cap, t, CX, capTop, capTop + 36, 3.6) +
    `<path d="M${CX - 21} ${capTop + 26} Q${CX} ${capTop + 33} ${CX + 21} ${capTop + 26}" fill="none" stroke="${t.accent}" stroke-width="3.4" stroke-linecap="round"/>` + cross;
}

/** Конь — голова лошади в профиль; смотрит в сторону соперника (белые вправо, чёрные влево). */
function knight(id: string, t: Tone, side: 1 | -1): string {
  const pts: [number, number][] = [
    [-18, 118], [-20, 96], [-17, 74], [-10, 54], [-2, 40], [6, 30], [10, 22], [14, 30], [22, 40], [30, 54], [33, 64], [28, 70], [16, 66], [6, 70], [10, 86], [18, 104], [20, 118],
  ];
  const head = smooth(pts.map(([x, y]) => [CX + side * x, y] as [number, number]), true);
  const mane = smooth([[-10, 54], [-16, 66], [-18, 82], [-16, 100]].map(([x, y]) => [CX + side * x!, y!] as [number, number]));
  const eye = `<circle cx="${CX + side * 12}" cy="${46}" r="3.2" fill="${t === TONES.w ? '#3B2418' : '#F6EEDB'}"/>`;
  const nostril = `<circle cx="${CX + side * 27}" cy="${62}" r="2" fill="${t === TONES.w ? '#3B2418' : '#F6EEDB'}"/>`;
  return plinth(id, t) + cylinder(`${id}c`, CX, 114, 121, 24, t, 3.4) + shaded(`${id}h`, head, t, CX, 22, 118, 3.8) +
    `<path d="${mane}" fill="none" stroke="${t.accent}" stroke-width="4" stroke-linecap="round" opacity="0.9"/>` + eye + nostril +
    `<path d="M${CX + side * 4} ${30} L${CX + side * 2} ${18} L${CX + side * 10} ${26}" fill="${t.base}" ${ol(3)}/>`;
}

export function pieceSvg(color: 'w' | 'b', kind: Kind): string {
  const t = TONES[color];
  const id = `${color}${kind}`;
  const inner = kind === 'p' ? pawn(id, t) : kind === 'r' ? rook(id, t) : kind === 'n' ? knight(id, t, color === 'w' ? 1 : -1) : kind === 'b' ? bishop(id, t) : kind === 'q' ? queen(id, t) : king(id, t);
  return svgDoc(PIECE_W, PIECE_H, inner);
}

export const KINDS: readonly Kind[] = ['p', 'n', 'b', 'r', 'q', 'k'];
/** Ключ текстуры фигуры: цвет и вид, например «w.q». */
export const pieceKey = (color: 'w' | 'b', kind: Kind): string => `${color}.${kind}`;

/** Ширина фигуры на доске в клетках: пешка меньше, король и ферзь — крупнее. */
const CELLS: Readonly<Record<Kind, number>> = { p: 0.66, n: 0.78, b: 0.76, r: 0.76, q: 0.8, k: 0.82 };
export function pieceInfo(kind: Kind): PieceInfo {
  return { w: PIECE_W, h: PIECE_H, footY: FOOT_Y, cells: CELLS[kind] };
}
