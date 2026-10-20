// Векторная графика Деда Матвея (docs/CHARACTERS.md): высокий худой старик в кепке, усы щёткой, серо-синий пиджак.
// Строит SVG-строки слоёв рига в тех же единицах, что у Агаты (docs/ART_STYLE.md §5): тело, голова по эмоциям,
// рот вместе с усами, веки, руки по позам за столом домино. Модуль не зависит от DOM.
import type { CharacterArt } from '../art';
import type { Emotion, Pose } from '../types';

export interface Expr {
  readonly eyes: string;
  readonly brows?: string;
  readonly browL?: string;
  readonly browR?: string;
  readonly mouth: string;
  readonly look?: readonly [number, number];
  readonly blush?: number;
  readonly extras?: readonly string[];
}

const C = {
  outline: '#3B2418', skin: '#EDBE98', skinSh: '#D49A76', blush: '#E98579', nose: '#E39B85',
  hair: '#CDD0D6', hairSh: '#9EA4AE', hairHi: '#EEF0F3',
  cap: '#56677D', capSh: '#3E4C5E', capHi: '#7487A0',
  jacket: '#5F7591', jacketSh: '#475A73', vest: '#3B4A5C', shirt: '#EDE6D4', shirtSh: '#CFC6AF',
  pin: '#F6F1E4', pinDot: '#2A2230', white: '#FFFDF8', pupil: '#2A1A12',
  mouth: '#6B2230', tongue: '#E26A6E', drop: '#9ED3F0', spark: '#F4C542', steam: '#F3F0EA',
};
const ol = (w = 4): string => `stroke="${C.outline}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

// ---------- голова ----------
// Локальные координаты головы — как у Агаты: лицо по центру x = 120; в риге голова сдвинута на 90 по x.
const EYE_L: readonly [number, number] = [97, 128];
const EYE_R: readonly [number, number] = [143, 128];

/** Глаза у Матвея маленькие и глубоко посаженные: эмоцию несут брови и веки. */
function eye([cx, cy]: readonly [number, number], side: number, st: string, look: readonly [number, number]): string {
  const [lx, ly] = look;
  const inner = cx - side * 11, outer = cx + side * 11;
  // Верхнее веко: кожа сверху до линии века.
  const lid = (iy: number, oy: number): string => {
    const top = cy - 16;
    const mid = cy + Math.min(iy, oy) - 1;
    return `<path d="M${inner} ${cy + iy} Q${cx} ${mid} ${outer} ${cy + oy} L${outer} ${top} L${inner} ${top} Z" fill="${C.skin}"/>
    <path d="M${inner} ${cy + iy} Q${cx} ${mid} ${outer} ${cy + oy}" fill="none" ${ol(3.2)}/>`;
  };
  const ball = (rx: number, ry: number, pr: number, star = false): string => `
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${C.white}" ${ol(2.8)}/>
    <circle cx="${cx + lx}" cy="${cy + ly}" r="${pr}" fill="${C.pupil}"/>
    ${star
      ? `<path d="M${cx + lx - 1.5} ${cy + ly - 2.2} l1.2 -3 1.2 3 3 1.2 -3 1.2 -1.2 3 -1.2 -3 -3 -1.2 Z" fill="${C.white}"/>`
      : `<circle cx="${cx + lx - 1.8}" cy="${cy + ly - 2.2}" r="1.9" fill="${C.white}"/>`}`;
  // Мешки под глазами — возраст.
  const bag = `<path d="M${cx - 9} ${cy + 13} Q${cx} ${cy + 18} ${cx + 9} ${cy + 13}" fill="none" ${ol(2)} opacity="0.45"/>`;
  switch (st) {
    case 'happy':
      return `<path d="M${cx - 10} ${cy + 3} Q${cx} ${cy - 8} ${cx + 10} ${cy + 3}" fill="none" ${ol(3.8)}/>` + bag;
    case 'closed':
      return `<path d="M${cx - 10} ${cy + 1} Q${cx} ${cy + 7} ${cx + 10} ${cy + 1}" fill="none" ${ol(3.8)}/>` + bag;
    case 'wide': return ball(11, 13, 4.2) + bag;
    case 'star': return ball(10.5, 12, 5.6, true) + bag;
    case 'sly': return ball(9.5, 11, 5.2) + lid(-1, 2) + bag;
    case 'squint': return ball(9.5, 11, 5.2) + lid(3, 3) + bag;
    case 'annoyed': return ball(9.5, 11, 5) + lid(-2, -2) + bag;
    case 'sad': return ball(9.5, 11, 5) + lid(-6, 0) + bag;
    // Обычный взгляд: тяжеловатое веко — Матвей всегда немного прищурен.
    default: return ball(9.5, 11, 5.2) + lid(-6, -6) + bag;
  }
}

/** Брови-щётки — фирменная черта: густые, седые, очень подвижные. */
function brow([cx, cy0]: readonly [number, number], side: number, st: string): string {
  const cy = cy0 - 21;
  const inner = cx - side * 15, outer = cx + side * 19;
  const p = ({
    neutral: [2, 0, -4],
    happy: [-1, 2, -8],
    raised: [-9, -6, -15],
    annoyed: [8, -6, 0],
    sad: [-7, 6, -4],
    slyUp: [-8, -8, -14],
    slyDown: [5, 2, 0],
    frown: [6, -2, 1],
  } as Record<string, [number, number, number]>)[st] ?? [2, 0, -4];
  const [iy, oy, my] = p;
  const d = `M${outer} ${cy + oy} Q${cx} ${cy + my} ${inner} ${cy + iy}`;
  // Кустистость: короткие штрихи вдоль брови.
  let tufts = '';
  for (let k = 0; k <= 4; k++) {
    const t = k / 4;
    const x = outer + (inner - outer) * t;
    const y = (1 - t) * (1 - t) * (cy + oy) + 2 * t * (1 - t) * (cy + my) + t * t * (cy + iy);
    tufts += `M${x} ${y - 3} l${side * -3} -6 `;
  }
  return `<path d="${d}" fill="none" stroke="${C.outline}" stroke-width="17" stroke-linecap="round"/>
  <path d="${d}" fill="none" stroke="${C.hair}" stroke-width="12.5" stroke-linecap="round"/>
  <path d="${tufts}" fill="none" stroke="${C.hairSh}" stroke-width="2.2" stroke-linecap="round"/>`;
}

/** Усы щёткой: широкие, седые, закрывают верхнюю губу. Рисуются в одном слое со ртом и шевелятся вместе с ним. */
function mustache(lift = 0): string {
  const y = 166 - lift;
  const d = `M86 ${y + 6} C88 ${y - 6} 104 ${y - 10} 120 ${y - 6} C136 ${y - 10} 152 ${y - 6} 154 ${y + 6} C155 ${y + 14} 150 ${y + 20} 144 ${y + 18} C138 ${y + 22} 130 ${y + 19} 124 ${y + 21} L120 ${y + 18} L116 ${y + 21} C110 ${y + 19} 102 ${y + 22} 96 ${y + 18} C90 ${y + 20} 85 ${y + 14} 86 ${y + 6} Z`;
  let strands = '';
  for (let x = 92; x <= 148; x += 7) strands += `M${x} ${y + 2} l${x < 120 ? -1.5 : 1.5} 12 `;
  return `<path d="${d}" fill="${C.hair}" ${ol(3.4)}/>
  <path d="${strands}" fill="none" stroke="${C.hairSh}" stroke-width="2" stroke-linecap="round"/>
  <path d="M100 ${y - 1} Q110 ${y - 5} 118 ${y - 2}" fill="none" stroke="${C.hairHi}" stroke-width="2.6" stroke-linecap="round"/>`;
}

/** Рот под усами. Подбородок у Матвея длинный, рот — между усами и ямкой подбородка. */
export function mouthShape(st: string): string {
  switch (st) {
    case 'laugh':
      return `<path d="M100 184 Q120 180 140 184 Q138 214 120 214 Q102 214 100 184 Z" fill="${C.mouth}" ${ol(3.2)}/>
      <ellipse cx="120" cy="206" rx="10" ry="5" fill="${C.tongue}"/>`;
    case 'grin':
      return `<path d="M98 185 Q120 190 142 185 Q137 206 120 206 Q103 206 98 185 Z" fill="${C.mouth}" ${ol(3.2)}/>
      <path d="M101 186 Q120 191 139 186 L137 192 Q120 196 103 192 Z" fill="${C.white}"/>`;
    case 'smirk':
      return `<path d="M104 192 Q122 197 138 186" fill="none" ${ol(3.6)}/><path d="M136 183 Q141 185 140 190" fill="none" ${ol(2.8)}/>`;
    case 'o':
      return `<ellipse cx="120" cy="195" rx="8" ry="10.5" fill="${C.mouth}" ${ol(3.2)}/>`;
    case 'wavy':
      return `<path d="M104 195 Q109 190 114 194 Q120 198 126 193 Q131 189 136 194" fill="none" ${ol(3.6)}/>`;
    case 'frown':
      return `<path d="M105 200 Q120 186 135 200" fill="none" ${ol(3.8)}/>`;
    case 'pursed':
      return `<path d="M113 194 Q120 189 127 194 Q120 199 113 194 Z" fill="${C.mouth}" ${ol(2.8)}/>`;
    case 'flat':
      return `<path d="M106 193 Q120 196 134 193" fill="none" ${ol(3.6)}/>`;
    // формы рта для липсинка (Preston Blair / Rhubarb: A–F)
    case 'vA': return `<path d="M107 192 Q120 194 133 192" fill="none" ${ol(4)}/>`;
    case 'vB':
      return `<path d="M104 188 Q120 186 136 188 Q133 198 120 198 Q107 198 104 188 Z" fill="${C.mouth}" ${ol(3)}/>
      <path d="M106 189 Q120 187 134 189 L133 192.5 Q120 194.5 107 192.5 Z" fill="${C.white}"/>`;
    case 'vC':
      return `<path d="M103 187 Q120 184 137 187 Q135 205 120 205 Q105 205 103 187 Z" fill="${C.mouth}" ${ol(3)}/>
      <path d="M105 188 Q120 185 135 188 L134 191.5 Q120 193.5 106 191.5 Z" fill="${C.white}"/>`;
    case 'vD': return mouthShape('laugh');
    case 'vE': return `<ellipse cx="120" cy="196" rx="10" ry="11" fill="${C.mouth}" ${ol(3)}/><ellipse cx="120" cy="203" rx="6" ry="3" fill="${C.tongue}"/>`;
    case 'vF': return `<ellipse cx="120" cy="195" rx="5.5" ry="6" fill="${C.mouth}" ${ol(3)}/>`;
    // Тёплая улыбка: уголки из-под усов.
    default:
      return `<path d="M104 190 Q120 202 136 190" fill="none" ${ol(3.6)}/><path d="M102 187 Q103 191 106 191" fill="none" ${ol(2.4)}/><path d="M138 187 Q137 191 134 191" fill="none" ${ol(2.4)}/>`;
  }
}

/** Рот и усы — один слой: при речи усы приподнимаются вместе с губой. */
export function mouth(st: string): string {
  const open = st === 'laugh' || st === 'grin' || st === 'o' || st === 'vC' || st === 'vD' || st === 'vE';
  return mouthShape(st) + mustache(open ? 2 : 0);
}

const drop = (x: number, y: number, k = 1): string => `<path d="M0 -13 C7 -3 9 4 0 9 C-9 4 -7 -3 0 -13 Z" transform="translate(${x} ${y}) scale(${k})" fill="${C.drop}" ${ol(2.4)}/><path d="M-2.5 -2 Q-3 2 0 4" transform="translate(${x} ${y}) scale(${k})" fill="none" stroke="${C.white}" stroke-width="2" stroke-linecap="round"/>`;
const spark = (x: number, y: number, k = 1): string => `<path d="M0 -12 C1.5 -3 3 -1.5 12 0 C3 1.5 1.5 3 0 12 C-1.5 3 -3 1.5 -12 0 C-3 -1.5 -1.5 -3 0 -12 Z" transform="translate(${x} ${y}) scale(${k})" fill="${C.spark}" ${ol(2)}/>`;
/** Облачко пара над кепкой — ворчит. */
const steam = (x: number, y: number): string => `<g transform="translate(${x} ${y})"><path d="M-12 6 C-20 6 -20 -6 -12 -6 C-12 -16 4 -18 6 -8 C14 -12 22 -2 14 4 C14 10 -6 12 -12 6 Z" fill="${C.steam}" ${ol(2.4)}/></g>`;
/** Капли смеха и морщинки-лучики у глаз. */
const crow = (side: number): string => {
  const [cx, cy] = side < 0 ? EYE_L : EYE_R;
  const x = cx + side * 15;
  return `<path d="M${x} ${cy - 4} l${side * 7} -4 M${x + side * 1} ${cy + 2} l${side * 8} 0 M${x} ${cy + 8} l${side * 7} 4" ${ol(2)} opacity="0.55"/>`;
};

const FACE = 'M64 108 C62 52 178 52 176 108 L176 150 C176 196 152 222 120 222 C88 222 64 196 64 150 Z';

function ears(): string {
  const one = (x: number, side: number) => `<path d="M${x} 112 C${x + side * 22} 104 ${x + side * 26} 150 ${x + side * 4} 158" fill="${C.skin}" ${ol(3.6)}/>
  <path d="M${x + side * 4} 122 C${x + side * 14} 122 ${x + side * 14} 142 ${x + side * 4} 146" fill="none" ${ol(2.2)} opacity="0.6"/>`;
  return one(66, -1) + one(174, 1);
}

/** Седые вихры из-под кепки над ушами и на затылке. */
function sideHair(): string {
  const tuft = (x: number, side: number) => `<path d="M${x} 74 C${x + side * 16} 78 ${x + side * 18} 96 ${x + side * 8} 110 C${x + side * 14} 100 ${x + side * 4} 92 ${x} 104 Z" fill="${C.hair}" ${ol(3)}/>`;
  return tuft(70, -1) + tuft(170, 1);
}

/** Кепка-восьмиклинка с коротким козырьком, слегка набок. */
function cap(tilt = 0): string {
  return `<g transform="rotate(${tilt} 120 60)">
  <path d="M48 70 C40 30 70 2 122 0 C176 -2 206 28 196 66 C170 58 76 58 48 70 Z" fill="${C.cap}" ${ol()}/>
  <path d="M60 58 C62 30 86 14 120 12" fill="none" stroke="${C.capHi}" stroke-width="5" stroke-linecap="round" opacity="0.9"/>
  <path d="M122 2 Q118 30 120 58 M86 10 Q90 34 82 62 M158 10 Q156 34 162 62" fill="none" stroke="${C.capSh}" stroke-width="3" stroke-linecap="round"/>
  <circle cx="122" cy="2" r="5" fill="${C.capSh}" ${ol(2.4)}/>
  <path d="M52 70 C80 58 164 56 192 68 C186 84 150 92 120 92 C88 92 58 86 52 70 Z" fill="${C.capSh}" ${ol(3.6)}/>
  <path d="M66 74 C96 66 148 66 178 72" fill="none" stroke="${C.cap}" stroke-width="3" stroke-linecap="round" opacity="0.9"/>
  </g>`;
}

export function head(e: Expr, id = 'm', withMouth = true, capTilt = -4): string {
  const look = e.look ?? [0, 1];
  const blush = e.blush ?? 0.35;
  return `<g>
  ${ears()}
  <clipPath id="${id}-face"><path d="${FACE}"/></clipPath>
  <path d="${FACE}" fill="${C.skinSh}"/>
  <g clip-path="url(#${id}-face)">
    <ellipse cx="113" cy="124" rx="62" ry="96" fill="${C.skin}"/>
  </g>
  <path d="${FACE}" fill="none" ${ol()}/>
  ${sideHair()}
  <path d="M78 186 Q86 206 104 214" fill="none" ${ol(2.2)} opacity="0.4"/>
  <path d="M162 186 Q154 206 136 214" fill="none" ${ol(2.2)} opacity="0.4"/>
  <path d="M74 150 Q78 168 86 176 M166 150 Q162 168 154 176" fill="none" ${ol(2)} opacity="0.35"/>
  <ellipse cx="80" cy="160" rx="11" ry="7" fill="${C.blush}" opacity="${blush}"/>
  <ellipse cx="160" cy="160" rx="11" ry="7" fill="${C.blush}" opacity="${blush}"/>
  <path d="M112 216 Q120 219 128 216" fill="none" ${ol(2)} opacity="0.4"/>
  ${eye(EYE_L, -1, e.eyes, look)}
  ${eye(EYE_R, 1, e.eyes, look)}
  <path d="M112 128 C108 146 104 152 108 160 C112 166 128 166 132 160 C136 152 132 146 128 128" fill="${C.nose}" ${ol(3.4)}/>
  <ellipse cx="114" cy="152" rx="4" ry="3" fill="${C.white}" opacity="0.7"/>
  ${withMouth ? mouth(e.mouth) : ''}
  <path d="M88 96 Q104 92 116 96 M124 96 Q138 92 152 96" fill="none" ${ol(2)} opacity="0.35"/>
  ${brow(EYE_L, -1, e.browL ?? e.brows ?? 'neutral')}
  ${brow(EYE_R, 1, e.browR ?? e.brows ?? 'neutral')}
  ${cap(capTilt)}
  ${(e.extras ?? []).join('')}
  </g>`;
}

export const EXPR: Record<Emotion, Expr> = {
  warm: { eyes: 'open', brows: 'neutral', mouth: 'smile', extras: [crow(-1), crow(1)] },
  sly: { eyes: 'sly', look: [4, 1], browL: 'slyDown', browR: 'slyUp', mouth: 'smirk' },
  laugh: { eyes: 'happy', brows: 'happy', mouth: 'laugh', blush: 0.7, extras: [crow(-1), crow(1), drop(60, 140, 0.55)] },
  azart: { eyes: 'star', brows: 'raised', mouth: 'grin', blush: 0.55, extras: [spark(214, 40, 0.8), spark(26, 70, 0.55)] },
  surprise: { eyes: 'wide', brows: 'raised', mouth: 'o' },
  think: { eyes: 'open', look: [4, -4], browL: 'frown', browR: 'slyUp', mouth: 'pursed' },
  annoyed: { eyes: 'annoyed', brows: 'annoyed', mouth: 'wavy', extras: [steam(204, -6)] },
  sad: { eyes: 'sad', look: [-1, 4], brows: 'sad', mouth: 'frown', blush: 0.2, extras: [drop(72, 170, 0.7)] },
};

// ---------- тело ----------
// Узкие плечи, длинная шея, пиджак поверх жилета; тело уходит под стол.
const JACKET = 'M170 250 C142 256 130 290 128 340 L126 540 L294 540 L292 340 C290 290 278 256 250 250 Z';
const VEST = 'M188 256 L232 256 L240 540 L180 540 Z';

function tube(d: string, w = 26, fill = C.jacket): string {
  return `<path d="${d}" fill="none" stroke="${C.outline}" stroke-width="${w + 8}" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="${d}" fill="none" stroke="${fill}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

/** Худая кисть с костяшками; fist — сжатый кулак. */
const hand = (x: number, y: number, rot = 0, fist = false): string => `<g transform="translate(${x} ${y}) rotate(${rot})">
  <ellipse rx="17" ry="14" fill="${C.skin}" ${ol(3.4)}/>
  ${fist
    ? `<path d="M-10 -6 q4 -4 8 0 M-2 -6 q4 -4 8 0 M6 -6 q3 -3 6 1" fill="none" ${ol(2.2)}/>`
    : `<path d="M-12 -3 q4 -3 8 0 M-3 -4 q4 -3 8 0 M6 -3 q3 -2 6 1" fill="none" ${ol(2)} opacity="0.6"/>`}
  <ellipse cx="-15" cy="-4" rx="6" ry="8" fill="${C.skin}" ${ol(2.8)}/>
  </g>`;
const cuff = (x: number, y: number, rot = 0): string => `<ellipse cx="${x}" cy="${y}" rx="15" ry="7" transform="rotate(${rot} ${x} ${y})" fill="${C.shirt}" ${ol(3)}/>`;

/** Значок-костяшка домино на лацкане. */
const pin = (x: number, y: number): string => `<g transform="translate(${x} ${y}) rotate(-12)">
  <rect x="-7" y="-12" width="14" height="24" rx="3" fill="${C.pin}" ${ol(2.2)}/>
  <path d="M-5 0 H5" stroke="${C.outline}" stroke-width="1.6"/>
  <circle cx="0" cy="-6" r="1.8" fill="${C.pinDot}"/><circle cx="-3" cy="4" r="1.6" fill="${C.pinDot}"/><circle cx="3" cy="8" r="1.6" fill="${C.pinDot}"/>
  </g>`;

function body(id: string): string {
  return `
  <path d="M196 214 L196 262 L224 262 L224 214 Z" fill="${C.skinSh}" ${ol(3.6)}/>
  <path d="M200 236 Q210 244 220 236" fill="none" ${ol(2)} opacity="0.5"/>
  <clipPath id="${id}-jacket"><path d="${JACKET}"/></clipPath>
  <path d="${JACKET}" fill="${C.jacketSh}"/>
  <g clip-path="url(#${id}-jacket)">
    <ellipse cx="196" cy="380" rx="96" ry="190" fill="${C.jacket}"/>
    <path d="${VEST}" fill="${C.vest}"/>
    <path d="M190 262 L210 300 L230 262 Z" fill="${C.shirt}"/>
    <path d="M210 300 L210 540" stroke="${C.outline}" stroke-width="2" opacity="0.5"/>
    <circle cx="214" cy="326" r="3.4" fill="${C.capSh}" ${ol(1.6)}/><circle cx="214" cy="362" r="3.4" fill="${C.capSh}" ${ol(1.6)}/>
  </g>
  <path d="${JACKET}" fill="none" ${ol()}/>
  <path d="M190 258 L172 300 L186 312 L184 380" fill="none" ${ol(3.4)}/>
  <path d="M230 258 L248 300 L234 312 L236 380" fill="none" ${ol(3.4)}/>
  <path d="M190 256 L210 286 L230 256 L222 250 L210 268 L198 250 Z" fill="${C.shirt}" ${ol(3)}/>
  ${pin(250, 304)}
  <path d="M150 300 Q144 340 146 380 M270 300 Q276 340 274 380" fill="none" stroke="${C.jacketSh}" stroke-width="3.4" stroke-linecap="round"/>`;
}

// ---------- сидящая за столом фигура: слои рига ----------
/** Область фигуры, общая для тела и рук (единицы рига): та же, что у Агаты, — компоновка у персонажей общая. */
export const FIGURE_BOX = { x: 0, y: -30, w: 430, h: 470 } as const;
export const HEAD_BOX = { x: 80, y: -30, w: 260, h: 270 } as const;
/** Рот вместе с усами. */
export const MOUTH_BOX = { x: 170, y: 146, w: 80, h: 76 } as const;
/** Точка вращения головы — шея. */
export const HEAD_PIVOT = { x: 210, y: 230 } as const;

const svgDoc = (box: { x: number; y: number; w: number; h: number }, inner: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.x} ${box.y} ${box.w} ${box.h}" width="${box.w}" height="${box.h}">${inner}</svg>`;

export const bodySvg = (): string => svgDoc(FIGURE_BOX, body('mb'));

export const headSvg = (emotion: Emotion): string => svgDoc(HEAD_BOX, `<g transform="translate(90 0)">${head(EXPR[emotion], 'mh' + emotion, false)}</g>`);

/** Голова целиком (с ртом) — портрет для меню. */
export const portraitSvg = (emotion: Emotion = 'warm'): string => svgDoc(HEAD_BOX, `<g transform="translate(90 0)">${head(EXPR[emotion], 'mp' + emotion, true)}</g>`);

export const MOUTHS = ['smile', 'smirk', 'laugh', 'grin', 'o', 'pursed', 'wavy', 'frown', 'vA', 'vB', 'vC', 'vD', 'vE', 'vF'] as const;
export type MouthShape = (typeof MOUTHS)[number];
export const mouthSvg = (shape: MouthShape): string => svgDoc(MOUTH_BOX, `<g transform="translate(90 0)">${mouth(shape)}</g>`);
export const emotionMouth = (emotion: Emotion): MouthShape => (EXPR[emotion].mouth as MouthShape | undefined) ?? 'smile';

/** Верхний край век (координаты фигуры). */
export const LID_TOP = EYE_L[1] - 13;

/** Опущенные веки поверх глаз; анимация — масштаб по вертикали от LID_TOP. */
export const blinkSvg = (): string => {
  const lid = ([cx, cy]: readonly [number, number]) => `<ellipse cx="${cx}" cy="${cy}" rx="12" ry="13" fill="${C.skin}"/>
    <path d="M${cx - 11} ${cy + 2} Q${cx} ${cy + 9} ${cx + 11} ${cy + 2}" fill="none" ${ol(3.4)}/>`;
  return svgDoc(HEAD_BOX, `<g transform="translate(90 0)">${lid(EYE_L)}${lid(EYE_R)}</g>`);
};

/** Костяшка в руке (рубашкой к игроку) — для позы «стукнуть». */
const boneInHand = (x: number, y: number, rot: number): string => `<g transform="translate(${x} ${y}) rotate(${rot})">
  <rect x="-17" y="-32" width="34" height="64" rx="6" fill="#3A2A22" ${ol(3.4)}/>
  <rect x="-12" y="-27" width="24" height="54" rx="4" fill="none" stroke="#E8AB30" stroke-width="2"/>
  <circle r="3" fill="#E8AB30"/>
  </g>`;
/** Штрихи удара о стол. */
const impact = (x: number, y: number): string => `<path d="M${x - 44} ${y - 8} l-18 -10 M${x - 42} ${y + 8} l-20 3 M${x + 44} ${y - 8} l18 -10 M${x + 42} ${y + 8} l20 3" ${ol(3.6)}/>`;

const LEFT_REST = () => tube('M148 268 Q104 330 150 384') + cuff(152, 382, 70) + hand(166, 392, 10);
const RIGHT_REST = () => tube('M272 268 Q316 330 270 384') + cuff(268, 382, -70) + hand(254, 392, 170);
const POSE_ARMS: Record<Pose, () => string> = {
  // Руки на столе за своими костями.
  idle: () => LEFT_REST() + RIGHT_REST(),
  // Поглаживает усы: правая рука у подбородка.
  think: () => LEFT_REST() + tube('M272 268 Q336 300 282 230') + cuff(286, 236, -40) + hand(268, 214, -150),
  // Стук костяшкой о стол.
  throw: () => LEFT_REST() + tube('M272 270 Q326 330 262 388') + cuff(268, 384, -50) + boneInHand(236, 412, 90) + hand(250, 394, 170, true) + impact(236, 414),
  // Тянется к базару (слева от игрока — справа от Матвея).
  took: () => RIGHT_REST() + tube('M148 268 Q86 320 62 392') + cuff(66, 384, 50) + hand(58, 404, 30),
  // Кулак вверх.
  victory: () => LEFT_REST() + tube('M272 266 Q340 210 322 128') + cuff(324, 140, -10) + hand(322, 112, -80, true) + spark(364, 70, 1.1) + spark(282, 46, 0.7),
};
export const armsSvg = (pose: Pose): string => svgDoc(FIGURE_BOX, POSE_ARMS[pose]());

/** Глаза, которые не моргают: закрытые от смеха, «звёздочки» азарта, широко раскрытые от удивления. */
export const NO_BLINK_EYES: ReadonlySet<string> = new Set(['happy', 'star', 'wide', 'closed']);

/** Палитра персонажа — для листа-концепта и интерфейса. */
export const PALETTE = C;

// ---------- контракт рига (src/characters/art.ts) ----------
export const MATVEY_ART: CharacterArt = {
  id: 'matvey',
  figureBox: FIGURE_BOX,
  headBox: HEAD_BOX,
  mouthBox: MOUTH_BOX,
  headPivot: HEAD_PIVOT,
  lidTop: LID_TOP,
  mouths: MOUTHS,
  bodySvg,
  headSvg,
  portraitSvg,
  mouthSvg: (shape) => mouthSvg(shape as MouthShape),
  emotionMouth,
  speechMouths: ['vB', 'vC', 'vE', 'vD'],
  blinkSvg,
  blinks: (emotion) => !NO_BLINK_EYES.has(EXPR[emotion].eyes),
  armsSvg,
  fan: null,
};
