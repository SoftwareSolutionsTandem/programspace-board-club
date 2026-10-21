// Векторная графика Бабушки Агаты — перенос утверждённого концепта (assets-src/concept/agata).
// Строит SVG-строки слоёв рига: тело, голова по эмоциям, рот, руки по позам. Карты — src/games/durak/scene/cardArt.ts,
// фон кафе — src/render/cafe.ts.
// Модуль не зависит от DOM: SVG превращается в текстуры в src/render/svgTexture.ts.
import type { CharacterArt } from '../art';
import type { Emotion, Pose } from '../types';

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
  red: '#C8263A',
};
const C: Palette = BASE;
const ol = (w = 4): string => `stroke="${C.outline}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

// Заколка-черва — фирменная деталь Агаты.
const HEART = 'M0 9 C-15 -2 -12 -14 -5.5 -14 C-2.5 -14 0 -11.5 0 -9 C0 -11.5 2.5 -14 5.5 -14 C12 -14 15 -2 0 9 Z';

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

/** Пучок с заколкой-червой (рисуется под основной массой волос). */
function bun(): string {
  return `
  <circle cx="120" cy="16" r="31" fill="${C.hair}" ${ol()}/>
  <path d="M100 8 Q112 -6 132 2" fill="none" stroke="${C.hairSh}" stroke-width="3" stroke-linecap="round"/>
  <path d="M104 26 Q118 34 138 24" fill="none" stroke="${C.hairSh}" stroke-width="3" stroke-linecap="round"/>
  <g transform="translate(146 2) rotate(18)">
    <rect x="-2" y="-2" width="4" height="30" rx="2" fill="${C.shawl}" ${ol(2)} transform="rotate(-30)"/>
    ${'' /* заколка-сердце */}
    <path d="${HEART}" transform="scale(0.95)" fill="${C.red}" ${ol(2.6)}/>
    <path d="M-6 -9 Q-8 -5 -5 -2" fill="none" stroke="${C.white}" stroke-width="2" stroke-linecap="round" opacity="0.9"/>
  </g>`;
}

/** Основная масса волос и кудри по бокам (без пучка). */
function hairMass(): string {
  return `
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
const hairBack = (): string => bun() + hairMass();
const earring = (x: number): string => `<path d="M${x} 188 Q${x + 3} 196 ${x - 3} 204 M${x} 188 Q${x + 6} 196 ${x + 7} 203" fill="none" stroke="${C.leaf}" stroke-width="2.2" stroke-linecap="round"/>
  <circle cx="${x - 4}" cy="207" r="5.5" fill="${C.red}" ${ol(2.2)}/><circle cx="${x + 8}" cy="206" r="5.5" fill="${C.red}" ${ol(2.2)}/>
  <circle cx="${x - 5.5}" cy="205" r="1.6" fill="${C.white}"/><circle cx="${x + 6.5}" cy="204" r="1.6" fill="${C.white}"/>`;
const earrings = (): string => earring(42) + earring(194);
const FACE = 'M44 138 C44 50 196 50 196 138 C196 194 162 224 120 224 C78 224 44 194 44 138 Z';
const BANGS = 'M36 142 C26 60 70 20 120 20 C170 20 214 60 204 142 C198 122 190 108 180 102 C176 86 160 80 148 86 C140 74 124 72 116 82 C106 72 88 74 82 86 C70 80 56 88 58 102 C48 108 40 122 36 142 Z';

/** Лицо: кожа с тенью от чёлки, контур, нос, морщинки (без румянца, глаз, очков и бровей). */
function faceBase(id: string): string {
  return `<clipPath id="${id}-face"><path d="${FACE}"/></clipPath>
  <path d="${FACE}" fill="${C.skinSh}"/>
  <g clip-path="url(#${id}-face)">
    <ellipse cx="111" cy="128" rx="82" ry="90" fill="${C.skin}"/>
    <path d="${BANGS}" transform="translate(0 7)" fill="${C.skinSh}"/>
  </g>
  <path d="${FACE}" fill="none" ${ol()}/>`;
}
const blushSvg = (opacity: number): string => `<ellipse cx="68" cy="176" rx="17" ry="10" fill="${C.blush}" opacity="${opacity}"/>
  <ellipse cx="172" cy="176" rx="17" ry="10" fill="${C.blush}" opacity="${opacity}"/>`;
/** Морщинки у глаз, складки у рта, нос (поверх румянца). */
const faceDetails = (): string => `<path d="M56 130 l-8 -3 M56 138 l-9 0 M56 146 l-8 3" ${ol(2)} opacity="0.6"/>
  <path d="M184 130 l8 -3 M184 138 l9 0 M184 146 l8 3" ${ol(2)} opacity="0.6"/>
  <path d="M95 172 Q90 182 94 190" fill="none" ${ol(2.2)} opacity="0.45"/>
  <path d="M145 172 Q150 182 146 190" fill="none" ${ol(2.2)} opacity="0.45"/>
  <ellipse cx="120" cy="164" rx="12" ry="10" fill="${C.skinSh}" ${ol(3)}/>
  <ellipse cx="116" cy="160" rx="4" ry="3" fill="${C.white}" opacity="0.8"/>`;
const chinLine = (): string => `<path d="M112 216 Q120 220 128 216" fill="none" ${ol(2)} opacity="0.4"/>`;
/** Очки: тон линз, дужки, переносица, оправа, блики. */
function glasses(): string {
  return `<circle cx="${EYE_L[0]}" cy="${EYE_L[1]}" r="27" fill="${C.lens}" opacity="0.28"/>
  <circle cx="${EYE_R[0]}" cy="${EYE_R[1]}" r="27" fill="${C.lens}" opacity="0.28"/>
  <path d="M63 136 L46 128 M177 136 L194 128" ${ol(8)}/><path d="M63 136 L46 128 M177 136 L194 128" stroke="${C.frame}" stroke-width="4" stroke-linecap="round"/>
  <path d="M116 137 Q120 131 124 137" fill="none" ${ol(8)}/><path d="M116 137 Q120 131 124 137" fill="none" stroke="${C.frame}" stroke-width="4" stroke-linecap="round"/>
  <circle cx="${EYE_L[0]}" cy="${EYE_L[1]}" r="27" fill="none" ${ol(9.5)}/>
  <circle cx="${EYE_R[0]}" cy="${EYE_R[1]}" r="27" fill="none" ${ol(9.5)}/>
  <circle cx="${EYE_L[0]}" cy="${EYE_L[1]}" r="27" fill="none" stroke="${C.frame}" stroke-width="5.5"/>
  <circle cx="${EYE_R[0]}" cy="${EYE_R[1]}" r="27" fill="none" stroke="${C.frame}" stroke-width="5.5"/>
  <path d="M72 130 Q75 120 84 117" fill="none" stroke="${C.white}" stroke-width="3" stroke-linecap="round" opacity="0.85"/>
  <path d="M132 130 Q135 120 144 117" fill="none" stroke="${C.white}" stroke-width="3" stroke-linecap="round" opacity="0.85"/>`;
}
/** Чёлка поверх бровей, блики и пряди. */
const bangs = (): string => `<path d="${BANGS}" fill="${C.hair}" ${ol()}/>
  <path d="M70 52 Q96 32 128 34" fill="none" stroke="${C.hairHi}" stroke-width="5" stroke-linecap="round"/>
  <path d="M60 78 Q66 64 80 60 M96 60 Q106 50 120 52 M140 56 Q156 52 166 62 M174 72 Q184 80 188 94" fill="none" stroke="${C.hairSh}" stroke-width="3" stroke-linecap="round"/>`;

/** Голова целиком — сборка тех же частей, что и у марионетки (src/characters/agata/puppet.ts). */
export function head(e: Expr, id = 'h', withMouth = true): string {
  const look = e.look ?? [0, 2];
  const blush = e.blush ?? 0.55;
  return `<g>
  ${hairBack()}
  ${earrings()}
  ${faceBase(id)}
  ${blushSvg(blush)}
  ${faceDetails()}
  ${withMouth ? mouth(e.mouth) : ''}
  ${chinLine()}
  ${eye(EYE_L, -1, e.eyes, look)}
  ${eye(EYE_R, 1, e.eyes, look)}
  ${glasses()}
  ${brow(EYE_L, -1, e.browL ?? e.brows ?? 'neutral')}
  ${brow(EYE_R, 1, e.browR ?? e.brows ?? 'neutral')}
  ${bangs()}
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

/** Тело (без головы и рук). Спинку кресла не рисуем: в кадре она читалась как лишние дуги за спиной. */
export const bodySvg = (): string => svgDoc(FIGURE_BOX, body('rb'));

/** Голова с эмоцией; рот рисуется отдельным слоем (для синхронизации с голосом). */
export const headSvg = (emotion: Emotion): string => svgDoc(HEAD_BOX, `<g transform="translate(90 0)">${head(EXPR[emotion], 'rh' + emotion, false)}</g>`);

/** Формы рта: выражение эмоции и фонемы липсинка (A–F). */
export const MOUTHS = ['smile', 'smirk', 'laugh', 'grin', 'o', 'pursed', 'wavy', 'frown', 'vA', 'vB', 'vC', 'vD', 'vE', 'vF'] as const;
export type MouthShape = (typeof MOUTHS)[number];
export const mouthSvg = (shape: MouthShape): string => svgDoc(MOUTH_BOX, `<g transform="translate(90 0)">${mouth(shape)}</g>`);
export const emotionMouth = (emotion: Emotion): MouthShape => (EXPR[emotion].mouth as MouthShape | undefined) ?? 'smile';

/** Верхний край век в координатах головы: от него веко опускается при моргании. */
export const LID_TOP = EYE_L[1] - 19.5;

/**
 * Опущенные веки поверх открытых глаз (координаты головы): кожа целиком закрывает глазное яблоко,
 * поверх — тот же оттенок линзы очков и линия ресниц. Анимация — масштаб по вертикали от LID_TOP.
 */
export const blinkSvg = (): string => {
  const lid = ([cx, cy]: [number, number]) => `<ellipse cx="${cx}" cy="${cy}" rx="17.5" ry="19.5" fill="${C.skin}"/>
    <ellipse cx="${cx}" cy="${cy}" rx="17.5" ry="19.5" fill="${C.lens}" opacity="0.28"/>
    <path d="M${cx - 15} ${cy + 3} Q${cx} ${cy + 13} ${cx + 15} ${cy + 3}" fill="none" ${ol(3.6)}/>`;
  return svgDoc(HEAD_BOX, `<g transform="translate(90 0)">${lid(EYE_L)}${lid(EYE_R)}</g>`);
};

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

// ---------- контракт рига (src/characters/art.ts) ----------
export const AGATA_ART: CharacterArt = {
  id: 'agata',
  figureBox: FIGURE_BOX,
  headBox: HEAD_BOX,
  mouthBox: MOUTH_BOX,
  headPivot: { x: 210, y: 225 },
  lidTop: LID_TOP,
  mouths: MOUTHS,
  bodySvg,
  headSvg,
  portraitSvg: (emotion) => svgDoc(HEAD_BOX, `<g transform="translate(90 0)">${head(EXPR[emotion], 'rp' + emotion, true)}</g>`),
  mouthSvg: (shape) => mouthSvg(shape as MouthShape),
  emotionMouth,
  speechMouths: ['vB', 'vC', 'vE', 'vD'],
  blinkSvg,
  blinks: (emotion) => !['happy', 'star', 'wide'].includes(EXPR[emotion].eyes),
  armsSvg,
  fan: { anchor: FAN_ANCHOR, handSvg: fanHandSvg, holds: poseHoldsFan },
};

// ---------- части марионетки (src/characters/agata/puppet.ts) ----------
// Те же функции рисунка, что собирают голову и фигуру выше: части не перерисованы, а разрезаны по слоям.
// Координаты головы — локальные (лицо по центру x = 120), фигуры — единицы рига.

/** Белки обоих глаз для стиля глаз (без зрачков и век; дуги смеха — целиком). */
function eyeWhites(style: 'ball' | 'wide' | 'star' | 'happy' | 'closed'): string {
  const one = ([cx, cy]: [number, number]): string => {
    switch (style) {
      case 'happy': return `<path d="M${cx - 13} ${cy + 5} Q${cx} ${cy - 11} ${cx + 13} ${cy + 5}" fill="none" ${ol(4.2)}/>`;
      case 'closed': return `<path d="M${cx - 13} ${cy + 1} Q${cx} ${cy + 9} ${cx + 13} ${cy + 1}" fill="none" ${ol(4.2)}/>`;
      case 'wide': return `<ellipse cx="${cx}" cy="${cy}" rx="17" ry="20" fill="${C.white}" ${ol(3)}/>`;
      case 'star': return `<ellipse cx="${cx}" cy="${cy}" rx="15" ry="17" fill="${C.white}" ${ol(3)}/>`;
      default: return `<ellipse cx="${cx}" cy="${cy}" rx="14" ry="16" fill="${C.white}" ${ol(3)}/>`;
    }
  };
  return one(EYE_L) + one(EYE_R);
}

/** Зрачок с бликом в начале координат (радиус r; звёздочка — для азарта). */
function pupil(r: number, star: boolean): string {
  return `<circle r="${r}" fill="${C.pupil}"/>${star
    ? `<path d="M-2.5 -3 l1.6 -4 1.6 4 4 1.6 -4 1.6 -1.6 4 -1.6 -4 -4 -1.6 Z" fill="${C.white}"/>`
    : `<circle cx="-2.6" cy="-3" r="2.7" fill="${C.white}"/>`}`;
}

/** Части рисунка для марионетки. */
export const AGATA_PIECES = {
  colors: C,
  eyeL: EYE_L,
  eyeR: EYE_R,
  bun,
  hairMass,
  earring,
  faceBase: () => faceBase('pf'),
  blush: () => blushSvg(1),
  faceDetails,
  chinLine,
  glasses,
  bangs,
  mouth,
  eyeWhites,
  pupil,
  /** Капли и искры эмоции (координаты головы). */
  extras: (emotion: Emotion): string => (EXPR[emotion].extras ?? []).join(''),
  /** Тело без рук и головы (единицы рига). */
  torso: () => body('pt'),
  /** Кисть в начале координат, без поворота. */
  hand: (r = 19): string => hand(0, 0, r, 0),
  /** Манжета в начале координат, длинная ось — по x. */
  cuff: (): string => cuff(0, 0, 0),
  /** Труба рукава: ширина заливки и цвет — как у tube(). */
  sleeve: { width: 30, outline: 8, fill: C.dress, line: C.outline },
};
