// Шашки для изометрической доски (docs/ART_STYLE.md §11): толстые точёные диски с канавками по ободу;
// дамка — две шашки стопкой с золотой короной сверху. Белые — светлый клён, чёрные — тёмно-вишнёвые.
// Рисунок 100 × 90, точка опоры — центр нижнего основания (50, 66). Модуль строит SVG-строки и не зависит от DOM.
import { cylinder, FLAT, ol, svgDoc, type Tone } from '../../../board/pieceKit';
import type { PieceInfo } from '../../../board/scene';
import type { Piece } from '../rules/board';

export const MAN_W = 100, MAN_H = 90, FOOT_Y = 66;
const CX = 50, R = 40, THICK = 14;

export const TONES: Readonly<Record<'w' | 'b', Tone>> = {
  w: { base: '#F3E4C6', shade: '#CDB48A', hi: '#FFFFFF', accent: '#E8AB30' },
  b: { base: '#7A2E2A', shade: '#4E1A18', hi: '#B5615A', accent: '#E8AB30' },
};

/** Одна шашка: диск с канавками на ободу и кольцами на верхней грани. */
function disc(id: string, t: Tone, bottom: number): string {
  const top = bottom - THICK;
  const ry = R * FLAT;
  const grooves = [0.35, 0.68].map((k) => `<path d="M${CX - R} ${top + THICK * k} A${R} ${ry} 0 0 0 ${CX + R} ${top + THICK * k}" fill="none" stroke="${t.shade}" stroke-width="2.4" opacity="0.9"/>`).join('');
  const rings = `<ellipse cx="${CX}" cy="${top}" rx="${R * 0.66}" ry="${ry * 0.66}" fill="none" stroke="${t.shade}" stroke-width="3"/>
    <ellipse cx="${CX}" cy="${top}" rx="${R * 0.36}" ry="${ry * 0.36}" fill="none" stroke="${t.shade}" stroke-width="2.4" opacity="0.8"/>`;
  return cylinder(id, CX, top, bottom, R, t, 4) + grooves + rings;
}

/** Корона дамки на верхней грани. */
function crown(t: Tone, y: number): string {
  const w = 22;
  return `<path d="M${CX - w} ${y} L${CX - w - 4} ${y - 16} L${CX - 10} ${y - 7} L${CX} ${y - 20} L${CX + 10} ${y - 7} L${CX + w + 4} ${y - 16} L${CX + w} ${y} Q${CX} ${y + 7} ${CX - w} ${y} Z" fill="${t.accent}" ${ol(3.2)}/>
  <circle cx="${CX}" cy="${y - 20}" r="3.4" fill="#FFF1C9" ${ol(2)}/>
  <path d="M${CX - w + 3} ${y - 2} Q${CX} ${y + 3} ${CX + w - 3} ${y - 2}" fill="none" stroke="#FFF1C9" stroke-width="2" stroke-linecap="round" opacity="0.8"/>`;
}

export function pieceSvg(p: Piece): string {
  const color = p.toLowerCase() as 'w' | 'b';
  const t = TONES[color];
  const king = p === 'W' || p === 'B';
  const inner = king ? disc(`${p}a`, t, FOOT_Y) + disc(`${p}b`, t, FOOT_Y - THICK - 2) + crown(t, FOOT_Y - 2 * THICK - 2 + 3) : disc(`${p}a`, t, FOOT_Y);
  return svgDoc(MAN_W, MAN_H, inner);
}

export const PIECES: readonly Piece[] = ['w', 'b', 'W', 'B'];
/** Ключ текстуры: «w.m» — простая, «w.k» — дамка. */
export const pieceKey = (p: Piece): string => `${p.toLowerCase()}.${p === 'W' || p === 'B' ? 'k' : 'm'}`;
export const pieceInfo = (): PieceInfo => ({ w: MAN_W, h: MAN_H, footY: FOOT_Y, cells: 0.78 });
