// Векторная графика Бабушки Агаты и карт — перенос утверждённого концепта (assets-src/concept/agata).
// Строит SVG-строки слоёв рига: тело, голова по эмоциям, рот, руки по позам, карты и фон кафе.
// Модуль не зависит от DOM: SVG превращается в текстуры в src/render/svgTexture.ts.
import type { Emotion, Pose } from '../types';

type SuitKey = 'h' | 'd' | 's' | 'c';
type Palette = typeof BASE;
export interface Expr {
  readonly eyes: string;
  readonly brows?: string;
  readonly browL?: string;
  readonly browR?: string;
  readonly mouth: string;
  readonly look?: [number, number];
  readonly blush?: number;
  readonly extras?: readonly string[];
}

const BASE = {
  outline: '#3B2418', skin: '#F7CBA9', skinSh: '#E5A684', blush: '#F2878A',
  hair: '#DEDAE8', hairSh: '#B3ACC9', hairHi: '#F7F5FB',
  frame: '#B8232F', lens: '#DCEFF8',
  shawl: '#E8AB30', shawlSh: '#C1871A', shawlPat: '#C5333B',
  dress: '#A82A3D', dressSh: '#7E1B2D', dot: '#F6E7D8',
  shoe: '#5B3A2B', leaf: '#4E7D3A', white: '#FFFDF8', pupil: '#2A1A12',
  mouth: '#6B2230', tongue: '#E26A6E', drop: '#9ED3F0', spark: '#F4C542',
  card: '#FFFDF6', red: '#C8263A', black: '#2A2230', back: '#8E2236', backPat: '#E8AB30',
};
const C: Palette = BASE;
const ol = (w = 4): string => `stroke="${C.outline}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

// ---------- масти и карты ----------
const SUIT: Record<SuitKey, string> = {
  h: 'M0 9 C-15 -2 -12 -14 -5.5 -14 C-2.5 -14 0 -11.5 0 -9 C0 -11.5 2.5 -14 5.5 -14 C12 -14 15 -2 0 9 Z',
  d: 'M0 -13 L9.5 0 L0 13 L-9.5 0 Z',
  s: 'M0 -13 C12 -3 15 5 7 7 C3.5 7.5 1.5 5.5 0 3.5 C-1.5 5.5 -3.5 7.5 -7 7 C-15 5 -12 -3 0 -13 Z M-4.5 13 L0 3 L4.5 13 Z',
  c: 'M0 -12.5 a5.6 5.6 0 1 1 -0.01 0 Z M-6.5 -2 a5.6 5.6 0 1 1 -0.01 0 Z M6.5 -2 a5.6 5.6 0 1 1 -0.01 0 Z M-4 13 L0 2 L4 13 Z',
};
const suitColor = (s: SuitKey): string => (s === 'h' || s === 'd' ? C.red : C.black);
const suit = (s: SuitKey, x: number, y: number, k = 1): string => `<path d="${SUIT[s]}" transform="translate(${x} ${y}) scale(${k})" fill="${suitColor(s)}"/>`;

function cardBack(x: number, y: number, rot: number, k = 1): string {
  return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${k})">
  <rect x="-23" y="-33" width="46" height="66" rx="6" fill="${C.back}" ${ol(2.5)}/>
  <rect x="-17" y="-27" width="34" height="54" rx="3" fill="none" stroke="${C.backPat}" stroke-width="1.6"/>
  <path d="M0 -21 L11 0 L0 21 L-11 0 Z" fill="none" stroke="${C.backPat}" stroke-width="1.6"/>
  ${suit('h', 0, 0.5, 0.42).replace(C.red, C.backPat)}
  </g>`;
}

// ---------- голова ----------
// Локальные координаты головы: 240×230, лицо по центру x=120.
const EYE_L: [number, number] = [90, 140], EYE_R: [number, number] = [150, 140];

function eye([cx, cy]: [number, number], side: number, st: string, look: [number, number]): string {
  const [lx, ly] = look;
  const innerX = cx - side * 16, outerX = cx + side * 16;
  const lid = (iy: number, oy: number): string => {
    const top = cy - 24;
    const mid = cy + Math.min(iy, oy) - 2;
    return `<path d="M${innerX} ${cy + iy} Q${cx} ${mid} ${outerX} ${cy + oy} L${outerX} ${top} L${innerX} ${top} Z" fill="${C.skin}"/>
    <path d="M${innerX} ${cy + iy} Q${cx} ${mid} ${outerX} ${cy + oy}" fill="none" ${ol(3.4)}/>`;
  };
  const ball = (rx: number, ry: number, pr: number, star = false): string => `
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${C.white}" ${ol(3)}/>
    <circle cx="${cx + lx}" cy="${cy + ly}" r="${pr}" fill="${C.pupil}"/>
    ${star
      ? `<path d="M${cx + lx - 2.5} ${cy + ly - 3} l1.6 -4 1.6 4 4 1.6 -4 1.6 -1.6 4 -1.6 -4 -4 -1.6 Z" fill="${C.white}"/>`
      : `<circle cx="${cx + lx - 2.6}" cy="${cy + ly - 3}" r="2.7" fill="${C.white}"/>`}`;
  switch (st) {
    case 'happy':
      return `<path d="M${cx - 13} ${cy + 5} Q${cx} ${cy - 11} ${cx + 13} ${cy + 5}" fill="none" ${ol(4.2)}/>`;
    case 'wide': return ball(17, 20, 5.5);
    case 'star': return ball(15, 17, 8, true);
    case 'sly': return ball(14, 16, 7.5) + lid(-3, -1);
    case 'annoyed': return ball(14, 16, 7) + lid(-4, -4);
    case 'sad': return ball(14, 16, 7) + lid(-9, -1);
    case 'closed':
      return `<path d="M${cx - 13} ${cy + 1} Q${cx} ${cy + 9} ${cx + 13} ${cy + 1}" fill="none" ${ol(4.2)}/>`;
    default: return ball(14, 16, 7.5);
  }
}

function brow([cx, cy0]: [number, number], side: number, st: string): string {
  const cy = cy0 - 40;
  const innerX = cx - side * 15, outerX = cx + side * 15;
  const p = ({
    neutral: [2, 2, -6],
    happy: [0, 1, -10],
    raised: [-9, -9, -19],
    annoyed: [7, -5, -2],
    sad: [-7, 5, -5],
    slyUp: [-7, -9, -17],
    slyDown: [4, 0, -3],
  } as Record<string, [number, number, number]>)[st] ?? [2, 2, -6];
  const [iy, oy, my] = p;
  return `<path d="M${outerX} ${cy + oy} Q${cx} ${cy + my} ${innerX} ${cy + iy}" fill="none" stroke="${C.hairSh}" stroke-width="6.5" stroke-linecap="round"/>
  <path d="M${outerX} ${cy + oy} Q${cx} ${cy + my} ${innerX} ${cy + iy}" fill="none" stroke="${C.outline}" stroke-width="1.6" stroke-linecap="round" opacity="0.55"/>`;
}

export function mouth(st: string): string {
  switch (st) {
    case 'laugh':
      return `<path d="M95 183 Q120 178 145 183 Q143 220 120 220 Q97 220 95 183 Z" fill="${C.mouth}" ${ol(3.4)}/>
      <path d="M97 184 Q120 180 143 184 L141.5 191 Q120 194 98.5 191 Z" fill="${C.white}"/>
      <ellipse cx="120" cy="211" rx="13" ry="6.5" fill="${C.tongue}"/>`;
    case 'grin':
      return `<path d="M93 184 Q120 189 147 184 Q141 210 120 210 Q99 210 93 184 Z" fill="${C.mouth}" ${ol(3.4)}/>
      <path d="M95 185 Q120 190 145 185 L143 192 Q120 197 97 192 Z" fill="${C.white}"/>`;
    case 'smirk':
      return `<path d="M101 191 Q121 197 140 182" fill="none" ${ol(3.8)}/><path d="M138 179 Q143 181 142 186" fill="none" ${ol(3)}/>`;
    case 'o':
      return `<ellipse cx="120" cy="195" rx="9.5" ry="12.5" fill="${C.mouth}" ${ol(3.4)}/>`;
    case 'wavy':
      return `<path d="M102 194 Q108 189 114 193 Q120 197 126 192 Q132 188 138 193" fill="none" ${ol(3.8)}/>`;
    case 'frown':
      return `<path d="M102 199 Q120 183 138 199" fill="none" ${ol(4)}/>`;
    case 'pursed':
      return `<path d="M118 194 Q126 188 134 194 Q126 199 118 194 Z" fill="${C.mouth}" ${ol(3)}/>`;
    // формы рта для липсинка (набор Preston Blair / Rhubarb: A–F, X)
    case 'vA': return `<path d="M104 192 Q120 195 136 192" fill="none" ${ol(4.4)}/>`;
    case 'vB':
      return `<path d="M101 188 Q120 186 139 188 Q136 199 120 199 Q104 199 101 188 Z" fill="${C.mouth}" ${ol(3.2)}/>
      <path d="M103 189 Q120 187 137 189 L136 193 Q120 195 104 193 Z" fill="${C.white}"/>`;
    case 'vC':
      return `<path d="M100 186 Q120 183 140 186 Q138 206 120 206 Q102 206 100 186 Z" fill="${C.mouth}" ${ol(3.2)}/>
      <path d="M102 187 Q120 184 138 187 L137 191 Q120 193 103 191 Z" fill="${C.white}"/>`;
    case 'vD': return mouth('laugh');
    case 'vE': return `<ellipse cx="120" cy="196" rx="12" ry="13" fill="${C.mouth}" ${ol(3.2)}/><ellipse cx="120" cy="204" rx="7" ry="3.5" fill="${C.tongue}"/>`;
    case 'vF': return `<ellipse cx="120" cy="195" rx="6.5" ry="7" fill="${C.mouth}" ${ol(3.2)}/>`;
    default:
      return `<path d="M99 186 Q120 204 141 186" fill="none" ${ol(4)}/><path d="M97 183 Q99 187 102 187" fill="none" ${ol(2.6)}/><path d="M143 183 Q141 187 138 187" fill="none" ${ol(2.6)}/>`;
  }
}

const drop = (x: number, y: number, k = 1): string => `<path d="M0 -13 C7 -3 9 4 0 9 C-9 4 -7 -3 0 -13 Z" transform="translate(${x} ${y}) scale(${k})" fill="${C.drop}" ${ol(2.4)}/><path d="M-2.5 -2 Q-3 2 0 4" transform="translate(${x} ${y}) scale(${k})" fill="none" stroke="${C.white}" stroke-width="2" stroke-linecap="round"/>`;
const spark = (x: number, y: number, k = 1): string => `<path d="M0 -12 C1.5 -3 3 -1.5 12 0 C3 1.5 1.5 3 0 12 C-1.5 3 -3 1.5 -12 0 C-3 -1.5 -1.5 -3 0 -12 Z" transform="translate(${x} ${y}) scale(${k})" fill="${C.spark}" ${ol(2)}/>`;

function hairBack(): string {
  return `
  <circle cx="120" cy="16" r="31" fill="${C.hair}" ${ol()}/>
  <path d="M100 8 Q112 -6 132 2" fill="none" stroke="${C.hairSh}" stroke-width="3" stroke-linecap="round"/>
  <path d="M104 26 Q118 34 138 24" fill="none" stroke="${C.hairSh}" stroke-width="3" stroke-linecap="round"/>
  <g transform="translate(146 2) rotate(18)">
    <rect x="-2" y="-2" width="4" height="30" rx="2" fill="${C.shawl}" ${ol(2)} transform="rotate(-30)"/>
    ${'' /* заколка-сердце */}
    <path d="${SUIT.h}" transform="scale(0.95)" fill="${C.red}" ${ol(2.6)}/>
    <path d="M-6 -9 Q-8 -5 -5 -2" fill="none" stroke="${C.white}" stroke-width="2" stroke-linecap="round" opacity="0.9"/>
  </g>
  <path d="M38 150 C14 120 20 60 64 36 C88 20 152 20 176 36 C220 60 226 120 202 150 Z" fill="${C.hair}" ${ol()}/>
  <circle cx="40" cy="132" r="15" fill="${C.hair}" ${ol()}/>
  <circle cx="200" cy="132" r="15" fill="${C.hair}" ${ol()}/>
  <circle cx="36" cy="154" r="14" fill="${C.hair}" ${ol()}/>
  <circle cx="204" cy="154" r="14" fill="${C.hair}" ${ol()}/>
  <circle cx="44" cy="174" r="11" fill="${C.hair}" ${ol()}/>
  <circle cx="196" cy="174" r="11" fill="${C.hair}" ${ol()}/>
  <path d="M28 152 Q34 146 42 150" fill="none" stroke="${C.hairSh}" stroke-width="3" stroke-linecap="round"/>
  <path d="M198 150 Q206 146 212 152" fill="none" stroke="${C.hairSh}" stroke-width="3" stroke-linecap="round"/>`;
}
function earrings(): string {
  const one = (x: number): string => `<path d="M${x} 188 Q${x + 3} 196 ${x - 3} 204 M${x} 188 Q${x + 6} 196 ${x + 7} 203" fill="none" stroke="${C.leaf}" stroke-width="2.2" stroke-linecap="round"/>
  <circle cx="${x - 4}" cy="207" r="5.5" fill="${C.red}" ${ol(2.2)}/><circle cx="${x + 8}" cy="206" r="5.5" fill="${C.red}" ${ol(2.2)}/>
  <circle cx="${x - 5.5}" cy="205" r="1.6" fill="${C.white}"/><circle cx="${x + 6.5}" cy="204" r="1.6" fill="${C.white}"/>`;
  return one(42) + one(194);
}
const FACE = 'M44 138 C44 50 196 50 196 138 C196 194 162 224 120 224 C78 224 44 194 44 138 Z';
const BANGS = 'M36 142 C26 60 70 20 120 20 C170 20 214 60 204 142 C198 122 190 108 180 102 C176 86 160 80 148 86 C140 74 124 72 116 82 C106 72 88 74 82 86 C70 80 56 88 58 102 C48 108 40 122 36 142 Z';

export function head(e: Expr, id = 'h', withMouth = true): string {
  const look = e.look ?? [0, 2];
  const blush = e.blush ?? 0.55;
  return `<g>
  ${hairBack()}
  ${earrings()}
  <clipPath id="${id}-face"><path d="${FACE}"/></clipPath>
  <path d="${FACE}" fill="${C.skinSh}"/>
  <g clip-path="url(#${id}-face)">
    <ellipse cx="111" cy="128" rx="82" ry="90" fill="${C.skin}"/>
    <path d="${BANGS}" transform="translate(0 7)" fill="${C.skinSh}"/>
  </g>
  <path d="${FACE}" fill="none" ${ol()}/>
  <ellipse cx="68" cy="176" rx="17" ry="10" fill="${C.blush}" opacity="${blush}"/>
  <ellipse cx="172" cy="176" rx="17" ry="10" fill="${C.blush}" opacity="${blush}"/>
  <path d="M56 130 l-8 -3 M56 138 l-9 0 M56 146 l-8 3" ${ol(2)} opacity="0.6"/>
  <path d="M184 130 l8 -3 M184 138 l9 0 M184 146 l8 3" ${ol(2)} opacity="0.6"/>
  <path d="M95 172 Q90 182 94 190" fill="none" ${ol(2.2)} opacity="0.45"/>
  <path d="M145 172 Q150 182 146 190" fill="none" ${ol(2.2)} opacity="0.45"/>
  <ellipse cx="120" cy="164" rx="12" ry="10" fill="${C.skinSh}" ${ol(3)}/>
  <ellipse cx="116" cy="160" rx="4" ry="3" fill="${C.white}" opacity="0.8"/>
  ${withMouth ? mouth(e.mouth) : ''}
  <path d="M112 216 Q120 220 128 216" fill="none" ${ol(2)} opacity="0.4"/>
  ${eye(EYE_L, -1, e.eyes, look)}
  ${eye(EYE_R, 1, e.eyes, look)}
  <circle cx="${EYE_L[0]}" cy="${EYE_L[1]}" r="27" fill="${C.lens}" opacity="0.28"/>
  <circle cx="${EYE_R[0]}" cy="${EYE_R[1]}" r="27" fill="${C.lens}" opacity="0.28"/>
  <path d="M63 136 L46 128 M177 136 L194 128" ${ol(8)}/><path d="M63 136 L46 128 M177 136 L194 128" stroke="${C.frame}" stroke-width="4" stroke-linecap="round"/>
  <path d="M116 137 Q120 131 124 137" fill="none" ${ol(8)}/><path d="M116 137 Q120 131 124 137" fill="none" stroke="${C.frame}" stroke-width="4" stroke-linecap="round"/>
  <circle cx="${EYE_L[0]}" cy="${EYE_L[1]}" r="27" fill="none" ${ol(9.5)}/>
  <circle cx="${EYE_R[0]}" cy="${EYE_R[1]}" r="27" fill="none" ${ol(9.5)}/>
  <circle cx="${EYE_L[0]}" cy="${EYE_L[1]}" r="27" fill="none" stroke="${C.frame}" stroke-width="5.5"/>
  <circle cx="${EYE_R[0]}" cy="${EYE_R[1]}" r="27" fill="none" stroke="${C.frame}" stroke-width="5.5"/>
  <path d="M72 130 Q75 120 84 117" fill="none" stroke="${C.white}" stroke-width="3" stroke-linecap="round" opacity="0.85"/>
  <path d="M132 130 Q135 120 144 117" fill="none" stroke="${C.white}" stroke-width="3" stroke-linecap="round" opacity="0.85"/>
  ${brow(EYE_L, -1, e.browL ?? e.brows ?? 'neutral')}
  ${brow(EYE_R, 1, e.browR ?? e.brows ?? 'neutral')}
  <path d="${BANGS}" fill="${C.hair}" ${ol()}/>
  <path d="M70 52 Q96 32 128 34" fill="none" stroke="${C.hairHi}" stroke-width="5" stroke-linecap="round"/>
  <path d="M60 78 Q66 64 80 60 M96 60 Q106 50 120 52 M140 56 Q156 52 166 62 M174 72 Q184 80 188 94" fill="none" stroke="${C.hairSh}" stroke-width="3" stroke-linecap="round"/>
  ${(e.extras ?? []).join('')}
  </g>`;
}

export const EXPR: Record<Emotion, Expr> = {
  warm: { eyes: 'open', brows: 'neutral', mouth: 'smile' },
  sly: { eyes: 'sly', look: [6, 2], browL: 'slyDown', browR: 'slyUp', mouth: 'smirk' },
  laugh: { eyes: 'happy', brows: 'happy', mouth: 'laugh', blush: 0.85, extras: [drop(56, 158, 0.6)] },
  azart: { eyes: 'star', brows: 'raised', mouth: 'grin', blush: 0.75, extras: [spark(214, 70, 0.9), spark(30, 92, 0.6)] },
  surprise: { eyes: 'wide', brows: 'raised', mouth: 'o' },
  think: { eyes: 'open', look: [5, -6], browL: 'neutral', browR: 'slyUp', mouth: 'pursed' },
  annoyed: { eyes: 'annoyed', brows: 'annoyed', mouth: 'wavy', extras: [drop(204, 96, 1)] },
  sad: { eyes: 'sad', look: [-1, 6], brows: 'sad', mouth: 'frown', blush: 0.35, extras: [drop(74, 178, 0.75)] },
};

// ---------- тело ----------
const DRESS = 'M128 222 C94 290 56 420 64 516 Q210 552 356 516 C364 420 326 290 292 222 Z';
const SHAWL = 'M108 238 C148 204 272 204 312 238 L304 266 C272 304 240 352 210 394 C180 352 148 304 116 266 Z';

function tube(d: string, w = 30, fill = C.dress): string {
  return `<path d="${d}" fill="none" stroke="${C.outline}" stroke-width="${w + 8}" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="${d}" fill="none" stroke="${fill}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
}
const hand = (x: number, y: number, r = 18, rot = 0): string => `<g transform="translate(${x} ${y}) rotate(${rot})">
  <circle r="${r}" fill="${C.skin}" ${ol(3.6)}/>
  <path d="M${-r * 0.5} ${-r * 0.2} q${r * 0.5} ${-r * 0.35} ${r * 0.95} 0" fill="none" ${ol(2.4)} opacity="0.55"/>
  <ellipse cx="${-r * 0.85}" cy="${-r * 0.35}" rx="${r * 0.38}" ry="${r * 0.5}" fill="${C.skin}" ${ol(3)}/>
  </g>`;
const cuff = (x: number, y: number, rot = 0): string => `<ellipse cx="${x}" cy="${y}" rx="17" ry="8" transform="rotate(${rot} ${x} ${y})" fill="${C.shawl}" ${ol(3)}/>`;

function shawlDecor(): string {
  let s = '';
  const edge = (x0: number, y0: number, x1: number, y1: number): void => {
    for (let t = 0.12; t < 0.95; t += 0.135) {
      const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
      s += `<path d="M${x} ${y - 7} l6 7 -6 7 -6 -7 Z" fill="${C.shawlPat}" ${ol(1.6)}/>`;
    }
  };
  edge(128, 262, 210, 374);
  edge(292, 262, 210, 374);
  let f = '';
  const fr = (x0: number, y0: number, x1: number, y1: number, dir: number): void => {
    for (let t = 0.04; t < 0.98; t += 0.06) {
      const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
      f += `M${x} ${y} l${dir * 4} 11 `;
    }
  };
  fr(116, 268, 210, 396, -1);
  fr(304, 268, 210, 396, 1);
  return `<path d="${f}" stroke="${C.shawlSh}" stroke-width="3.2" stroke-linecap="round"/>` + s;
}

function body(id: string): string {
  return `
  <ellipse cx="168" cy="536" rx="30" ry="14" fill="${C.shoe}" ${ol(3.6)}/>
  <ellipse cx="252" cy="536" rx="30" ry="14" fill="${C.shoe}" ${ol(3.6)}/>
  <clipPath id="${id}-dress"><path d="${DRESS}"/></clipPath>
  <pattern id="${id}-dots" width="30" height="30" patternUnits="userSpaceOnUse">
    <circle cx="8" cy="8" r="3.8" fill="${C.dot}"/><circle cx="23" cy="23" r="3.8" fill="${C.dot}"/>
  </pattern>
  <path d="${DRESS}" fill="${C.dressSh}"/>
  <g clip-path="url(#${id}-dress)">
    <ellipse cx="192" cy="380" rx="150" ry="200" fill="${C.dress}"/>
    <rect x="60" y="200" width="300" height="420" fill="url(#${id}-dots)" opacity="0.92"/>
    <path d="M138 400 Q148 460 134 516 M282 400 Q272 460 286 516" fill="none" stroke="${C.dressSh}" stroke-width="4" stroke-linecap="round"/>
  </g>
  <path d="${DRESS}" fill="none" ${ol()}/>
  <path d="M70 500 Q210 536 350 500" fill="none" stroke="${C.dot}" stroke-width="5" stroke-linecap="round" opacity="0.9"/>
  <clipPath id="${id}-shawl"><path d="${SHAWL}"/></clipPath>
  <path d="${SHAWL}" fill="${C.shawlSh}"/>
  <g clip-path="url(#${id}-shawl)"><ellipse cx="196" cy="260" rx="112" ry="120" fill="${C.shawl}"/></g>
  ${shawlDecor()}
  <path d="${SHAWL}" fill="none" ${ol()}/>
  <path d="M168 240 Q176 290 198 330 M252 240 Q244 290 222 330" fill="none" stroke="${C.shawlSh}" stroke-width="3.4" stroke-linecap="round"/>`;
}


// ---------- сидящая за столом фигура: слои рига ----------
/** Область фигуры, общая для тела и рук (единицы рига): x 0…430, y −30…440. */
export const FIGURE_BOX = { x: 0, y: -30, w: 430, h: 470 } as const;
/** Область головы и рта в единицах рига (голова сдвинута на 90 по x). */
export const HEAD_BOX = { x: 80, y: -30, w: 260, h: 270 } as const;
export const MOUTH_BOX = { x: 172, y: 168, w: 76, h: 62 } as const;
/** Точка, у которой левая рука держит веер своих карт. */
export const FAN_ANCHOR = { x: 146, y: 296 } as const;

const svgDoc = (box: { x: number; y: number; w: number; h: number }, inner: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.x} ${box.y} ${box.w} ${box.h}" width="${box.w}" height="${box.h}">${inner}</svg>`;

const chair = (): string => `<path d="M24 340 C24 196 396 196 396 340 L370 340 C370 236 50 236 50 340 Z" fill="#8C5A31" ${ol(4)}/>`;

/** Тело со спинкой кресла (без головы и рук). */
export const bodySvg = (): string => svgDoc(FIGURE_BOX, chair() + body('rb'));

/** Голова с эмоцией; рот рисуется отдельным слоем (для синхронизации с голосом). */
export const headSvg = (emotion: Emotion): string => svgDoc(HEAD_BOX, `<g transform="translate(90 0)">${head(EXPR[emotion], 'rh' + emotion, false)}</g>`);

/** Формы рта: выражение эмоции и фонемы липсинка (A–F). */
export const MOUTHS = ['smile', 'smirk', 'laugh', 'grin', 'o', 'pursed', 'wavy', 'frown', 'vA', 'vB', 'vC', 'vD', 'vE', 'vF'] as const;
export type MouthShape = (typeof MOUTHS)[number];
export const mouthSvg = (shape: MouthShape): string => svgDoc(MOUTH_BOX, `<g transform="translate(90 0)">${mouth(shape)}</g>`);
export const emotionMouth = (emotion: Emotion): MouthShape => (EXPR[emotion].mouth as MouthShape | undefined) ?? 'smile';

/** Веки для моргания поверх головы (координаты головы). */
export const blinkSvg = (): string =>
  svgDoc(HEAD_BOX, `<g transform="translate(90 0)">${eye(EYE_L, -1, 'closed', [0, 0])}${eye(EYE_R, 1, 'closed', [0, 0])}</g>`);

// Левая рука (держит веер) и правая — по позам.
const LEFT_FAN_ARM = () => tube('M132 256 Q96 318 150 338') + cuff(146, 334, 70);
const LEFT_FAN_HAND = () => hand(150, 342, 19, 10);
const POSE_ARMS: Record<Pose, () => string> = {
  // Для поз с веером кисть левой руки — отдельный слой поверх карт (fanHandSvg).
  idle: () => LEFT_FAN_ARM() + tube('M288 256 Q332 330 316 392') + cuff(318, 380, 6) + hand(316, 398, 19, -40),
  think: () => LEFT_FAN_ARM() + tube('M288 256 Q338 290 286 232') + cuff(296, 246, -20) + hand(276, 214, 18, -150),
  throw: () => LEFT_FAN_ARM() + tube('M288 256 Q356 318 334 400') + cuff(336, 384, 12) + hand(336, 408, 19, -70),
  took: () => tube('M132 256 Q104 350 180 392') + tube('M288 256 Q316 350 240 392') + cuff(172, 386, 70) + cuff(248, 386, -70) + hand(188, 398, 19, 30) + hand(232, 398, 19, 150),
  victory: () => tube('M132 252 Q74 190 96 108') + tube('M288 252 Q346 190 324 108') + cuff(96, 128, 10) + cuff(324, 128, -10) + hand(96, 100, 20, 160) + hand(324, 100, 20, 20) + spark(60, 60, 1.1) + spark(362, 52, 0.9),
};
export const armsSvg = (pose: Pose): string => svgDoc(FIGURE_BOX, POSE_ARMS[pose]());
/** Кисть, держащая веер: рисуется поверх карт веера. */
export const fanHandSvg = (): string => svgDoc(FIGURE_BOX, LEFT_FAN_HAND());
/** Держит ли поза веер своих карт левой рукой. */
export const poseHoldsFan = (pose: Pose): boolean => pose === 'idle' || pose === 'think' || pose === 'throw';

// ---------- карты ----------
export const CARD_BOX = { x: -24, y: -34, w: 48, h: 68 } as const;
const RANK_LABEL: Record<number, string> = { 6: '6', 7: '7', 8: '8', 9: '9', 10: '10', 11: 'В', 12: 'Д', 13: 'К', 14: 'Т' };
const SUIT_KEY: Record<string, SuitKey> = { H: 'h', D: 'd', S: 's', C: 'c' };

/** Лицо карты: крупное достоинство и масть в углу, большая масть в центре; подписи — по-русски (В, Д, К, Т). */
export function cardFaceSvg(suitCode: 'S' | 'C' | 'D' | 'H', rank: number): string {
  const k = SUIT_KEY[suitCode] as SuitKey;
  const col = suitColor(k);
  const label = RANK_LABEL[rank] ?? String(rank);
  const fs = label.length > 1 ? 13 : 15;
  const inner = `<rect x="-23" y="-33" width="46" height="66" rx="6" fill="${C.card}" ${ol(2.2)}/>
  <text x="-18" y="-17" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="${fs}" fill="${col}">${label}</text>
  ${suit(k, -13, -6.5, 0.42)}
  <g transform="rotate(180)"><text x="-18" y="-17" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="${fs}" fill="${col}">${label}</text>${suit(k, -13, -6.5, 0.42)}</g>
  ${suit(k, 0, 1, rank >= 11 ? 0.62 : 0.8)}
  ${rank >= 11 ? `<path d="M-14 15 Q0 9 14 15" fill="none" stroke="${col}" stroke-width="1.6" opacity="0.6"/>` : ''}`;
  return svgDoc(CARD_BOX, inner);
}
export const cardBackSvg = (): string => svgDoc(CARD_BOX, cardBack(0, 0, 0));

// ---------- фон кафе (единицы BG_DESIGN: 2400 × 900, центр персонажа x = 1200, дальний край стола y = 470) ----------
export function cafeBackgroundSvg(): string {
  const lamp = (x: number) => `<path d="M${x} 0 V60" ${ol(3)}/><path d="M${x - 48} 104 Q${x} 46 ${x + 48} 104 Z" fill="#C5333B" ${ol(4)}/><ellipse cx="${x}" cy="106" rx="17" ry="6" fill="#FFF1C9"/>`;
  const glow = (x: number) => `<ellipse cx="${x}" cy="280" rx="360" ry="300" fill="url(#bgGlow)"/>`;
  const panel = (x: number) => `<rect x="${x}" y="368" width="210" height="88" rx="6" fill="none" stroke="#8C5A31" stroke-width="3"/>`;
  const window = (x: number) => `<g>
    <rect x="${x}" y="110" width="250" height="215" rx="8" fill="url(#bgSky)" ${ol(5)}/>
    <path d="M${x} 285 L${x + 40} 266 L${x + 40} 246 L${x + 72} 246 L${x + 72} 272 L${x + 118} 254 L${x + 118} 234 L${x + 150} 234 L${x + 150} 260 L${x + 196} 244 L${x + 250} 266 L${x + 250} 325 L${x} 325 Z" fill="#2B3354" opacity="0.85"/>
    <circle cx="${x + 192}" cy="146" r="13" fill="#FFF3D1" opacity="0.9"/>
    <path d="M${x + 125} 110 V325 M${x} 216 H${x + 250}" stroke="#8C5A31" stroke-width="7"/>
    <rect x="${x}" y="110" width="250" height="215" rx="8" fill="none" ${ol(5)}/>
    <path d="M${x - 20} 94 C${x - 6} 160 ${x + 18} 250 ${x + 4} 334 L${x + 40} 334 C${x + 36} 260 ${x + 26} 160 ${x + 28} 94 Z" fill="#B8323F" ${ol(4)}/>
    <path d="M${x + 270} 94 C${x + 256} 160 ${x + 232} 250 ${x + 246} 334 L${x + 210} 334 C${x + 214} 260 ${x + 224} 160 ${x + 222} 94 Z" fill="#B8323F" ${ol(4)}/>
    <rect x="${x - 34}" y="84" width="318" height="15" rx="7" fill="#8C5A31" ${ol(3.5)}/></g>`;
  const shelf = (x: number) => `<g>
    <rect x="${x}" y="284" width="270" height="15" rx="4" fill="#8C5A31" ${ol(3.5)}/>
    <rect x="${x + 14}" y="228" width="36" height="56" rx="4" fill="#C5333B" ${ol(3)}/>
    <rect x="${x + 52}" y="242" width="60" height="42" rx="4" fill="#E8AB30" ${ol(3)}/>
    <rect x="${x + 114}" y="220" width="28" height="64" rx="4" fill="#2F7A72" ${ol(3)}/>
    <path d="M${x + 160} 284 L${x + 166} 250 L${x + 220} 250 L${x + 226} 284 Z" fill="#C2774A" ${ol(3)}/>
    <path d="M${x + 193} 250 C${x + 182} 214 ${x + 160} 204 ${x + 150} 210 C${x + 166} 220 ${x + 177} 234 ${x + 188} 250 M${x + 193} 250 C${x + 198} 210 ${x + 220} 194 ${x + 234} 198 C${x + 220} 212 ${x + 208} 230 ${x + 198} 250" fill="#5B9A4E" ${ol(2.6)}/></g>`;
  const picture = (x: number) => `<g><rect x="${x}" y="150" width="150" height="110" rx="6" fill="#8C5A31" ${ol(4)}/><rect x="${x + 12}" y="162" width="126" height="86" rx="3" fill="#E9D7B4"/>
    <path d="M${x + 20} 238 L${x + 60} 196 L${x + 86} 222 L${x + 104} 206 L${x + 130} 238 Z" fill="#7FA36B"/><circle cx="${x + 110}" cy="184" r="9" fill="#F4C542"/></g>`;
  const board = `<rect x="1520" y="96" width="230" height="124" rx="10" fill="#2E4038" ${ol(5)}/><rect x="1529" y="105" width="212" height="106" rx="6" fill="none" stroke="#8C5A31" stroke-width="5"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2400 900" width="2400" height="900">
  <defs>
    <linearGradient id="bgWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F3DDB8"/><stop offset="1" stop-color="#E6C08C"/></linearGradient>
    <linearGradient id="bgSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3E4C7A"/><stop offset="0.65" stop-color="#C77F7A"/><stop offset="1" stop-color="#F0B26E"/></linearGradient>
    <radialGradient id="bgGlow" cx="0.5" cy="0.3" r="0.6"><stop offset="0" stop-color="#FFF1C9" stop-opacity="0.5"/><stop offset="1" stop-color="#FFF1C9" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="2400" height="900" fill="url(#bgWall)"/>
  <rect y="350" width="2400" height="550" fill="#B97E4B"/>
  <path d="M0 350 H2400" ${ol(4)}/>
  ${[30, 270, 510, 750, 1460, 1700, 1940, 2180].map(panel).join('')}
  ${window(640)}${window(120)}
  ${picture(2120)}
  ${shelf(1500)}${board}
  ${glow(880)}${glow(1520)}
  ${lamp(880)}${lamp(1520)}
  </svg>`;
}

/** Где на фоне висит доска для счёта (единицы фона). */
export const BG_BOARD = { x: 1529, y: 105, w: 212, h: 106 } as const;
