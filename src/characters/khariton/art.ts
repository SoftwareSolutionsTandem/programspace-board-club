// Векторная графика Харитона (docs/CHARACTERS.md): шахматист, профессор-чудак 50–60 лет. Высокий лоб, седые
// вихры торчат над ушами и непослушный хохолок на макушке, круглые очки в золотистой оправе, бородка-эспаньолка
// с усами, подвижные тёмные брови; твидовый пиджак, горчичный жилет и бабочка в горошек, значок-конь на лацкане.
// Те же единицы рига, что у Агаты и Матвея (docs/ART_STYLE.md §5). Модуль строит SVG-строки и не зависит от DOM.
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
  outline: '#3B2418', skin: '#F1C6A0', skinSh: '#D9A27E', blush: '#E98579', nose: '#E8A88A',
  hair: '#C3C7CF', hairSh: '#8F95A1', hairHi: '#ECEEF2', brow: '#5C5652', browHi: '#8A827B',
  frame: '#C08F2E', frameHi: '#F2D27A', lens: '#DDEFF2',
  tweed: '#7D6C49', tweedSh: '#5F5135', tweedFleck: '#A08D62', vest: '#D49B2C', vestSh: '#AE7B1E',
  shirt: '#F3EFE3', shirtSh: '#D6CFBC', bow: '#2F7A72', bowSh: '#215A55', dot: '#F3EFE3', pocket: '#C5333B',
  white: '#FFFDF8', pupil: '#2A1A12', mouth: '#6B2230', tongue: '#E26A6E', drop: '#9ED3F0', spark: '#F4C542', bulb: '#FFE27A',
};
const ol = (w = 4): string => `stroke="${C.outline}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

// ---------- голова ----------
// Локальные координаты головы — общие: лицо по центру x = 120; в риге голова сдвинута на 90 по x.
const EYE_L: readonly [number, number] = [98, 130];
const EYE_R: readonly [number, number] = [142, 130];

function eye([cx, cy]: readonly [number, number], side: number, st: string, look: readonly [number, number]): string {
  const [lx, ly] = look;
  const inner = cx - side * 11, outer = cx + side * 11;
  const lid = (iy: number, oy: number): string => {
    const top = cy - 16;
    const mid = cy + Math.min(iy, oy) - 1;
    return `<path d="M${inner} ${cy + iy} Q${cx} ${mid} ${outer} ${cy + oy} L${outer} ${top} L${inner} ${top} Z" fill="${C.skin}"/>
    <path d="M${inner} ${cy + iy} Q${cx} ${mid} ${outer} ${cy + oy}" fill="none" ${ol(3)}/>`;
  };
  const ball = (rx: number, ry: number, pr: number, star = false): string => `
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${C.white}" ${ol(2.8)}/>
    <circle cx="${cx + lx}" cy="${cy + ly}" r="${pr}" fill="${C.pupil}"/>
    ${star
      ? `<path d="M${cx + lx - 1.5} ${cy + ly - 2.2} l1.2 -3 1.2 3 3 1.2 -3 1.2 -1.2 3 -1.2 -3 -3 -1.2 Z" fill="${C.white}"/>`
      : `<circle cx="${cx + lx - 1.8}" cy="${cy + ly - 2.2}" r="1.9" fill="${C.white}"/>`}`;
  switch (st) {
    case 'happy': return `<path d="M${cx - 10} ${cy + 3} Q${cx} ${cy - 8} ${cx + 10} ${cy + 3}" fill="none" ${ol(3.8)}/>`;
    case 'closed': return `<path d="M${cx - 10} ${cy + 1} Q${cx} ${cy + 7} ${cx + 10} ${cy + 1}" fill="none" ${ol(3.8)}/>`;
    case 'wide': return ball(11.5, 13.5, 4.4);
    case 'star': return ball(11, 12.5, 5.8, true);
    case 'sly': return ball(10, 11.5, 5.4) + lid(-1, 3);
    case 'annoyed': return ball(10, 11.5, 5.2) + lid(-3, -1);
    case 'sad': return ball(10, 11.5, 5.2) + lid(-7, 0);
    // Обычный взгляд — живой, широко раскрытый: веко у самого верха.
    default: return ball(10, 11.5, 5.4) + lid(-9, -9);
  }
}

/** Брови — тёмные, густые, «домиком»: профессор то удивлён, то сосредоточен. */
function brow([cx, cy0]: readonly [number, number], side: number, st: string): string {
  const cy = cy0 - 22;
  const inner = cx - side * 13, outer = cx + side * 17;
  const [iy, oy, my] = ({
    neutral: [1, 2, -5],
    happy: [-1, 3, -9],
    raised: [-10, -4, -16],
    annoyed: [8, -5, 0],
    sad: [-8, 6, -4],
    slyUp: [-9, -6, -15],
    slyDown: [5, 3, 0],
    frown: [7, -1, 1],
  } as Record<string, [number, number, number]>)[st] ?? [1, 2, -5];
  const d = `M${outer} ${cy + oy} Q${cx} ${cy + my} ${inner} ${cy + iy}`;
  return `<path d="${d}" fill="none" stroke="${C.outline}" stroke-width="12" stroke-linecap="round"/>
  <path d="${d}" fill="none" stroke="${C.brow}" stroke-width="7.5" stroke-linecap="round"/>
  <path d="M${outer - side * 3} ${cy + oy - 1} Q${cx} ${cy + my - 1.5} ${cx - side * 2} ${cy + (my + iy) / 2 - 1}" fill="none" stroke="${C.browHi}" stroke-width="1.8" stroke-linecap="round" opacity="0.8"/>`;
}

/** Усы и бородка-эспаньолка — один слой со ртом: при речи бородка опускается вместе с челюстью. */
function beard(drop = 0): string {
  const y = 172;
  const stache = `M96 ${y + 4} C100 ${y - 6} 114 ${y - 6} 120 ${y - 1} C126 ${y - 6} 140 ${y - 6} 144 ${y + 4} C140 ${y + 9} 132 ${y + 7} 126 ${y + 4} L120 ${y + 2} L114 ${y + 4} C108 ${y + 7} 100 ${y + 9} 96 ${y + 4} Z`;
  const by = 204 + drop;
  const goatee = `M106 ${by - 2} C108 ${by + 10} 114 ${by + 24} 120 ${by + 32} C126 ${by + 24} 132 ${by + 10} 134 ${by - 2} C128 ${by + 3} 112 ${by + 3} 106 ${by - 2} Z`;
  return `<path d="${goatee}" fill="${C.hair}" ${ol(3.2)}/>
  <path d="M114 ${by + 6} L117 ${by + 20} M126 ${by + 6} L123 ${by + 20}" fill="none" stroke="${C.hairSh}" stroke-width="2" stroke-linecap="round"/>
  <path d="${stache}" fill="${C.hair}" ${ol(3)}/>
  <path d="M102 ${y + 2} Q110 ${y - 2} 116 ${y + 1}" fill="none" stroke="${C.hairHi}" stroke-width="2.2" stroke-linecap="round"/>`;
}

/** Рот под усами (подбородок — под бородкой). */
export function mouthShape(st: string): string {
  switch (st) {
    case 'laugh':
      return `<path d="M103 184 Q120 181 137 184 Q135 210 120 210 Q105 210 103 184 Z" fill="${C.mouth}" ${ol(3.2)}/>
      <ellipse cx="120" cy="203" rx="9" ry="4.5" fill="${C.tongue}"/>`;
    case 'grin':
      return `<path d="M101 184 Q120 189 139 184 Q135 203 120 203 Q105 203 101 184 Z" fill="${C.mouth}" ${ol(3.2)}/>
      <path d="M104 185 Q120 190 136 185 L135 191 Q120 195 105 191 Z" fill="${C.white}"/>`;
    case 'smirk':
      return `<path d="M106 191 Q123 196 137 185" fill="none" ${ol(3.4)}/><path d="M135 182 Q140 184 139 189" fill="none" ${ol(2.6)}/>`;
    case 'o':
      return `<ellipse cx="120" cy="193" rx="7.5" ry="10" fill="${C.mouth}" ${ol(3.2)}/>`;
    case 'wavy':
      return `<path d="M105 193 Q110 188 115 192 Q120 196 125 191 Q130 187 135 192" fill="none" ${ol(3.4)}/>`;
    case 'frown':
      return `<path d="M106 198 Q120 185 134 198" fill="none" ${ol(3.6)}/>`;
    case 'pursed':
      return `<path d="M113 192 Q120 187 127 192 Q120 197 113 192 Z" fill="${C.mouth}" ${ol(2.8)}/>`;
    case 'vA': return `<path d="M108 190 Q120 192 132 190" fill="none" ${ol(3.8)}/>`;
    case 'vB':
      return `<path d="M105 186 Q120 184 135 186 Q132 196 120 196 Q108 196 105 186 Z" fill="${C.mouth}" ${ol(3)}/>
      <path d="M107 187 Q120 185 133 187 L132 190.5 Q120 192.5 108 190.5 Z" fill="${C.white}"/>`;
    case 'vC':
      return `<path d="M104 185 Q120 182 136 185 Q134 202 120 202 Q106 202 104 185 Z" fill="${C.mouth}" ${ol(3)}/>
      <path d="M106 186 Q120 183 134 186 L133 189.5 Q120 191.5 107 189.5 Z" fill="${C.white}"/>`;
    case 'vD': return mouthShape('laugh');
    case 'vE': return `<ellipse cx="120" cy="194" rx="9.5" ry="10.5" fill="${C.mouth}" ${ol(3)}/><ellipse cx="120" cy="200" rx="5.5" ry="3" fill="${C.tongue}"/>`;
    case 'vF': return `<ellipse cx="120" cy="193" rx="5" ry="5.5" fill="${C.mouth}" ${ol(3)}/>`;
    // Приветливая улыбка с ямочками.
    default:
      return `<path d="M106 188 Q120 199 134 188" fill="none" ${ol(3.4)}/><path d="M104 185 Q105 189 108 189" fill="none" ${ol(2.2)}/><path d="M136 185 Q135 189 132 189" fill="none" ${ol(2.2)}/>`;
  }
}

const OPEN_MOUTHS = new Set(['laugh', 'grin', 'o', 'vC', 'vD', 'vE']);
export function mouth(st: string): string {
  return mouthShape(st) + beard(OPEN_MOUTHS.has(st) ? 5 : st === 'vB' || st === 'vF' ? 2 : 0);
}

const drop = (x: number, y: number, k = 1): string => `<path d="M0 -13 C7 -3 9 4 0 9 C-9 4 -7 -3 0 -13 Z" transform="translate(${x} ${y}) scale(${k})" fill="${C.drop}" ${ol(2.4)}/><path d="M-2.5 -2 Q-3 2 0 4" transform="translate(${x} ${y}) scale(${k})" fill="none" stroke="${C.white}" stroke-width="2" stroke-linecap="round"/>`;
const spark = (x: number, y: number, k = 1): string => `<path d="M0 -12 C1.5 -3 3 -1.5 12 0 C3 1.5 1.5 3 0 12 C-1.5 3 -3 1.5 -12 0 C-3 -1.5 -1.5 -3 0 -12 Z" transform="translate(${x} ${y}) scale(${k})" fill="${C.spark}" ${ol(2)}/>`;
/** Лампочка-идея над головой — «эврика!». */
const bulb = (x: number, y: number): string => `<g transform="translate(${x} ${y}) rotate(12)">
  <path d="M-10 4 C-18 -6 -12 -22 0 -22 C12 -22 18 -6 10 4 L8 10 L-8 10 Z" fill="${C.bulb}" ${ol(2.6)}/>
  <rect x="-7" y="10" width="14" height="7" rx="2" fill="${C.hairSh}" ${ol(2.2)}/>
  <path d="M-4 0 Q0 -8 4 0" fill="none" ${ol(1.8)}/>
  <path d="M-22 -18 l-6 -4 M22 -18 l6 -4 M0 -30 v-6" ${ol(2.4)}/></g>`;
/** Вопросики-штрихи над бровью — досада. */
const fluster = (x: number, y: number): string => `<path d="M${x} ${y} q6 -8 12 0 q6 8 12 0" fill="none" ${ol(2.6)}/><path d="M${x + 4} ${y - 14} q5 -6 10 0" fill="none" ${ol(2.4)}/>`;

// Высокий лоб: лицо длиннее, чем у Агаты, макушка куполом.
const FACE = 'M66 112 C62 34 178 34 174 112 L172 152 C170 198 150 224 120 224 C90 224 70 198 68 152 Z';

function ears(): string {
  const one = (x: number, side: number) => `<path d="M${x} 116 C${x + side * 20} 108 ${x + side * 24} 150 ${x + side * 3} 158" fill="${C.skin}" ${ol(3.4)}/>
  <path d="M${x + side * 3} 126 C${x + side * 12} 126 ${x + side * 12} 144 ${x + side * 3} 148" fill="none" ${ol(2)} opacity="0.6"/>`;
  return one(68, -1) + one(172, 1);
}

/** Седые вихры над ушами и на затылке — пушатся облачком во все стороны (за лицом). */
function sideHair(): string {
  // Облачко из полукруглых завитков вдоль дуги: центр (x, y), завитки наружу.
  const tuft = (side: number) => {
    const x = side < 0 ? 70 : 170;
    const pts: [number, number, number][] = [[0, 70, 13], [12, 82, 14], [16, 98, 13], [12, 113, 11], [4, 124, 8]];
    const puffs = pts.map(([dx, y, r]) => `<circle cx="${x + side * dx}" cy="${y}" r="${r}"/>`).join('');
    const curls = pts.slice(0, 4).map(([dx, y, r]) => `<path d="M${x + side * (dx + r * 0.2)} ${y - r * 0.3} q${side * r * 0.5} ${r * 0.1} ${side * r * 0.4} ${r * 0.6}" fill="none" stroke="${C.hairSh}" stroke-width="2.2" stroke-linecap="round"/>`).join('');
    return `<g fill="${C.hair}" stroke="${C.outline}" stroke-width="6.4">${puffs}</g><g fill="${C.hair}">${puffs}</g>${curls}`;
  };
  // Затылок: седой венчик по краю купола, с прядками.
  const crown = `<path d="M66 100 C60 56 86 26 120 26 C154 26 180 56 174 100 C168 72 150 56 120 56 C90 56 72 72 66 100 Z" fill="${C.hair}" ${ol(3)}/>
  <path d="M80 70 Q90 50 108 42 M160 70 Q150 50 132 42 M120 30 L120 40" fill="none" stroke="${C.hairSh}" stroke-width="2.2" stroke-linecap="round"/>`;
  return crown + tuft(-1) + tuft(1);
}

/** Непослушный хохолок на макушке — передняя деталь головы, качается от резких движений. */
function cowlick(): string {
  return `<path d="M104 46 C96 26 104 6 122 0 C116 12 118 20 128 22 C134 10 146 6 154 10 C142 18 140 30 146 44 C134 36 120 36 104 46 Z" fill="${C.hair}" ${ol(3.2)}/>
  <path d="M114 34 Q118 18 126 12 M132 36 Q138 26 146 20" fill="none" stroke="${C.hairSh}" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M110 30 Q112 20 118 14" fill="none" stroke="${C.hairHi}" stroke-width="2.4" stroke-linecap="round"/>`;
}

/** Круглые очки в золотистой оправе — лежат над глазами. */
function glasses(): string {
  const lens = ([cx, cy]: readonly [number, number]) => `<circle cx="${cx}" cy="${cy}" r="17" fill="${C.lens}" opacity="0.22"/>
    <circle cx="${cx}" cy="${cy}" r="17" fill="none" stroke="${C.outline}" stroke-width="6"/>
    <circle cx="${cx}" cy="${cy}" r="17" fill="none" stroke="${C.frame}" stroke-width="3"/>
    <path d="M${cx - 11} ${cy - 8} Q${cx - 6} ${cy - 13} ${cx} ${cy - 13}" fill="none" stroke="${C.white}" stroke-width="2.4" stroke-linecap="round" opacity="0.8"/>`;
  return `${lens(EYE_L)}${lens(EYE_R)}
  <path d="M115 128 Q120 123 125 128" fill="none" stroke="${C.outline}" stroke-width="5.5" stroke-linecap="round"/>
  <path d="M115 128 Q120 123 125 128" fill="none" stroke="${C.frame}" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M81 126 L68 120 M159 126 L172 120" fill="none" stroke="${C.outline}" stroke-width="5" stroke-linecap="round"/>
  <path d="M81 126 L68 120 M159 126 L172 120" fill="none" stroke="${C.frame}" stroke-width="2.4" stroke-linecap="round"/>`;
}

function faceBase(id: string): string {
  return `<clipPath id="${id}-face"><path d="${FACE}"/></clipPath>
  <path d="${FACE}" fill="${C.skinSh}"/>
  <g clip-path="url(#${id}-face)">
    <ellipse cx="113" cy="122" rx="62" ry="100" fill="${C.skin}"/>
    <ellipse cx="102" cy="62" rx="22" ry="12" fill="#FFF3E4" opacity="0.5"/>
  </g>
  <path d="${FACE}" fill="none" ${ol()}/>`;
}
const blushSvg = (opacity: number): string => `<ellipse cx="82" cy="162" rx="10" ry="6.5" fill="${C.blush}" opacity="${opacity}"/>
  <ellipse cx="158" cy="162" rx="10" ry="6.5" fill="${C.blush}" opacity="${opacity}"/>`;
/** Нос — длинный, с горбинкой (под очками, над ртом). */
const nose = (): string => `<path d="M117 128 C114 144 110 154 112 162 C114 168 126 168 130 163 C132 158 126 154 124 144" fill="${C.nose}" ${ol(3.2)}/>
  <ellipse cx="116" cy="157" rx="3.2" ry="2.4" fill="${C.white}" opacity="0.7"/>`;
/** Морщины лба — от удивления видны сильнее. */
const forehead = (): string => `<path d="M92 84 Q106 80 118 84 M122 84 Q134 80 148 84 M98 74 Q120 68 142 74" fill="none" ${ol(2)} opacity="0.3"/>`;
const smileLines = (): string => `<path d="M88 172 Q90 188 98 196 M152 172 Q150 188 142 196" fill="none" ${ol(2)} opacity="0.35"/>`;

export function head(e: Expr, id = 'k', withMouth = true): string {
  const look = e.look ?? [0, 1];
  return `<g>
  ${sideHair()}
  ${ears()}
  ${faceBase(id)}
  ${blushSvg(e.blush ?? 0.3)}
  ${forehead()}${smileLines()}
  ${nose()}
  ${eye(EYE_L, -1, e.eyes, look)}
  ${eye(EYE_R, 1, e.eyes, look)}
  ${glasses()}
  ${withMouth ? mouth(e.mouth) : ''}
  ${brow(EYE_L, -1, e.browL ?? e.brows ?? 'neutral')}
  ${brow(EYE_R, 1, e.browR ?? e.brows ?? 'neutral')}
  ${cowlick()}
  ${(e.extras ?? []).join('')}
  </g>`;
}

export const EXPR: Record<Emotion, Expr> = {
  warm: { eyes: 'open', brows: 'neutral', mouth: 'smile' },
  sly: { eyes: 'sly', look: [4, 1], browL: 'slyDown', browR: 'slyUp', mouth: 'smirk' },
  laugh: { eyes: 'happy', brows: 'happy', mouth: 'laugh', blush: 0.65, extras: [drop(58, 140, 0.55)] },
  azart: { eyes: 'star', brows: 'raised', mouth: 'grin', blush: 0.5, extras: [bulb(206, 18), spark(30, 64, 0.6)] },
  surprise: { eyes: 'wide', brows: 'raised', mouth: 'o' },
  think: { eyes: 'open', look: [-4, -5], browL: 'slyUp', browR: 'frown', mouth: 'pursed' },
  annoyed: { eyes: 'annoyed', brows: 'annoyed', mouth: 'wavy', extras: [fluster(178, 70)] },
  sad: { eyes: 'sad', look: [-1, 4], brows: 'sad', mouth: 'frown', blush: 0.18, extras: [drop(74, 172, 0.65)] },
};

// ---------- тело ----------
// Средние плечи, твидовый пиджак поверх горчичного жилета, бабочка; тело уходит под стол.
const JACKET = 'M164 248 C134 256 122 292 120 342 L118 540 L302 540 L300 342 C298 292 286 256 256 248 Z';
const VEST = 'M184 256 L236 256 L246 540 L174 540 Z';

function tube(d: string, w = 28, fill = C.tweed): string {
  return `<path d="${d}" fill="none" stroke="${C.outline}" stroke-width="${w + 8}" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="${d}" fill="none" stroke="${fill}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

/** Кисть с длинными пальцами; fist — сжата. */
const hand = (x: number, y: number, rot = 0, fist = false): string => `<g transform="translate(${x} ${y}) rotate(${rot})">
  <ellipse rx="16" ry="13" fill="${C.skin}" ${ol(3.4)}/>
  ${fist
    ? `<path d="M-10 -6 q4 -4 8 0 M-2 -6 q4 -4 8 0 M6 -6 q3 -3 6 1" fill="none" ${ol(2.2)}/>`
    : `<path d="M-11 -3 q4 -3 8 0 M-3 -4 q4 -3 8 0 M5 -3 q3 -2 6 1" fill="none" ${ol(2)} opacity="0.55"/>`}
  <ellipse cx="-14" cy="-4" rx="5.5" ry="8" fill="${C.skin}" ${ol(2.8)}/>
  </g>`;
const cuff = (x: number, y: number, rot = 0): string => `<ellipse cx="${x}" cy="${y}" rx="15" ry="7" transform="rotate(${rot} ${x} ${y})" fill="${C.shirt}" ${ol(3)}/>`;

/** Значок-конь на лацкане. */
const pin = (x: number, y: number): string => `<g transform="translate(${x} ${y}) rotate(-8)">
  <circle r="11" fill="${C.frame}" ${ol(2.2)}/>
  <path d="M-4 7 L-5 1 Q-6 -5 0 -8 Q5 -7 6 -2 L3 -2 L2 2 L5 7 Z" fill="${C.outline}"/>
  </g>`;

/** Бабочка в горошек. */
const bowTie = (): string => `<g>
  <path d="M210 270 L184 258 Q178 270 184 284 Z" fill="${C.bow}" ${ol(3)}/>
  <path d="M210 270 L236 258 Q242 270 236 284 Z" fill="${C.bow}" ${ol(3)}/>
  <path d="M190 264 L188 280 M230 264 L232 280" stroke="${C.bowSh}" stroke-width="3" stroke-linecap="round"/>
  <circle cx="194" cy="268" r="2.2" fill="${C.dot}"/><circle cx="190" cy="276" r="2" fill="${C.dot}"/><circle cx="226" cy="268" r="2.2" fill="${C.dot}"/><circle cx="230" cy="276" r="2" fill="${C.dot}"/>
  <rect x="203" y="262" width="14" height="16" rx="4" fill="${C.bowSh}" ${ol(2.6)}/>
  </g>`;

function body(id: string): string {
  // Твид: светлые крапинки по пиджаку.
  let flecks = '';
  for (let i = 0; i < 46; i++) {
    const x = 126 + ((i * 53) % 170), y = 262 + ((i * 37) % 270);
    flecks += `M${x} ${y} l3 1.5 `;
  }
  return `
  <path d="M192 214 L192 262 L228 262 L228 214 Z" fill="${C.skinSh}" ${ol(3.6)}/>
  <clipPath id="${id}-jacket"><path d="${JACKET}"/></clipPath>
  <path d="${JACKET}" fill="${C.tweedSh}"/>
  <g clip-path="url(#${id}-jacket)">
    <ellipse cx="196" cy="380" rx="100" ry="190" fill="${C.tweed}"/>
    <path d="${flecks}" fill="none" stroke="${C.tweedFleck}" stroke-width="2" stroke-linecap="round" opacity="0.8"/>
    <path d="${VEST}" fill="${C.vest}"/>
    <path d="M236 256 L246 540 L226 540 L222 256 Z" fill="${C.vestSh}" opacity="0.7"/>
    <path d="M188 258 L210 304 L232 258 Z" fill="${C.shirt}"/>
    <circle cx="210" cy="330" r="3.4" fill="${C.vestSh}" ${ol(1.6)}/><circle cx="210" cy="362" r="3.4" fill="${C.vestSh}" ${ol(1.6)}/><circle cx="210" cy="394" r="3.4" fill="${C.vestSh}" ${ol(1.6)}/>
  </g>
  <path d="${JACKET}" fill="none" ${ol()}/>
  <path d="M188 256 L166 304 L182 316 L178 390" fill="none" ${ol(3.4)}/>
  <path d="M232 256 L254 304 L238 316 L242 390" fill="none" ${ol(3.4)}/>
  <path d="M186 254 L210 288 L234 254 L224 248 L210 266 L196 248 Z" fill="${C.shirt}" ${ol(3)}/>
  ${bowTie()}
  <path d="M262 330 L290 326 L292 346 L262 348 Z" fill="${C.tweedSh}" ${ol(2.6)}/>
  <path d="M266 330 L270 318 L276 328 L282 316 L286 328" fill="${C.pocket}" ${ol(2.4)}/>
  ${pin(170, 300)}
  <path d="M146 300 Q140 340 142 380 M274 300 Q280 340 278 380" fill="none" stroke="${C.tweedSh}" stroke-width="3.4" stroke-linecap="round"/>`;
}

// ---------- сидящая фигура: слои рига ----------
export const FIGURE_BOX = { x: 0, y: -30, w: 430, h: 470 } as const;
export const HEAD_BOX = { x: 80, y: -30, w: 260, h: 270 } as const;
/** Рот вместе с усами и бородкой. */
export const MOUTH_BOX = { x: 160, y: 150, w: 100, h: 100 } as const;
export const HEAD_PIVOT = { x: 210, y: 230 } as const;

const svgDoc = (box: { x: number; y: number; w: number; h: number }, inner: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.x} ${box.y} ${box.w} ${box.h}" width="${box.w}" height="${box.h}">${inner}</svg>`;

export const bodySvg = (): string => svgDoc(FIGURE_BOX, body('kb'));
export const headSvg = (emotion: Emotion): string => svgDoc(HEAD_BOX, `<g transform="translate(90 0)">${head(EXPR[emotion], 'kh' + emotion, false)}</g>`);
export const portraitSvg = (emotion: Emotion = 'warm'): string => svgDoc(HEAD_BOX, `<g transform="translate(90 0)">${head(EXPR[emotion], 'kp' + emotion, true)}</g>`);

export const MOUTHS = ['smile', 'smirk', 'laugh', 'grin', 'o', 'pursed', 'wavy', 'frown', 'vA', 'vB', 'vC', 'vD', 'vE', 'vF'] as const;
export type MouthShape = (typeof MOUTHS)[number];
export const mouthSvg = (shape: MouthShape): string => svgDoc(MOUTH_BOX, `<g transform="translate(90 0)">${mouth(shape)}</g>`);
export const emotionMouth = (emotion: Emotion): MouthShape => (EXPR[emotion].mouth as MouthShape | undefined) ?? 'smile';

export const LID_TOP = EYE_L[1] - 13;
export const blinkSvg = (): string => {
  const lid = ([cx, cy]: readonly [number, number]) => `<ellipse cx="${cx}" cy="${cy}" rx="12" ry="13" fill="${C.skin}"/>
    <path d="M${cx - 11} ${cy + 2} Q${cx} ${cy + 9} ${cx + 11} ${cy + 2}" fill="none" ${ol(3.4)}/>`;
  return svgDoc(HEAD_BOX, `<g transform="translate(90 0)">${lid(EYE_L)}${lid(EYE_R)}</g>`);
};

const LEFT_REST = () => tube('M146 268 Q100 330 148 384') + cuff(150, 382, 70) + hand(164, 392, 10);
const RIGHT_REST = () => tube('M274 268 Q320 330 272 384') + cuff(270, 382, -70) + hand(256, 392, 170);
const POSE_ARMS: Record<Pose, () => string> = {
  idle: () => LEFT_REST() + RIGHT_REST(),
  // Пальцы у бородки.
  think: () => LEFT_REST() + tube('M274 268 Q340 300 266 248') + cuff(272, 252, -40) + hand(252, 236, -150),
  // Тянется к доске.
  throw: () => LEFT_REST() + tube('M274 270 Q330 340 272 410') + cuff(274, 404, -50) + hand(262, 418, 160),
  took: () => RIGHT_REST() + tube('M146 268 Q96 300 120 222') + cuff(122, 230, 30) + hand(126, 210, -40),
  // Указательный палец вверх — «эврика!».
  victory: () => LEFT_REST() + tube('M274 266 Q340 210 318 132') + cuff(320, 144, -10) + hand(318, 116, -80, true) + spark(360, 72, 1) + spark(282, 50, 0.7),
};
export const armsSvg = (pose: Pose): string => svgDoc(FIGURE_BOX, POSE_ARMS[pose]());

export const NO_BLINK_EYES: ReadonlySet<string> = new Set(['happy', 'star', 'wide', 'closed']);
export const PALETTE = C;

export const KHARITON_ART: CharacterArt = {
  id: 'khariton',
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

// ---------- части марионетки (src/characters/khariton/puppet.ts) ----------
function eyeWhite(style: 'ball' | 'wide' | 'star' | 'happy' | 'closed'): string {
  switch (style) {
    case 'happy': return `<path d="M-10 3 Q0 -8 10 3" fill="none" ${ol(3.8)}/>`;
    case 'closed': return `<path d="M-10 1 Q0 7 10 1" fill="none" ${ol(3.8)}/>`;
    case 'wide': return `<ellipse cx="0" cy="0" rx="11.5" ry="13.5" fill="${C.white}" ${ol(2.8)}/>`;
    case 'star': return `<ellipse cx="0" cy="0" rx="11" ry="12.5" fill="${C.white}" ${ol(2.8)}/>`;
    default: return `<ellipse cx="0" cy="0" rx="10" ry="11.5" fill="${C.white}" ${ol(2.8)}/>`;
  }
}

function pupil(r: number, star: boolean): string {
  return `<circle r="${r}" fill="${C.pupil}"/>${star
    ? `<path d="M-1.5 -2.2 l1.2 -3 1.2 3 3 1.2 -3 1.2 -1.2 3 -1.2 -3 -3 -1.2 Z" fill="${C.white}"/>`
    : `<circle cx="-1.8" cy="-2.2" r="1.9" fill="${C.white}"/>`}`;
}

export const KHARITON_PIECES = {
  colors: C,
  eyeL: EYE_L,
  eyeR: EYE_R,
  /** За лицом: седые вихры и затылок, уши. */
  back: () => sideHair() + ears(),
  faceBase: () => faceBase('pk'),
  blush: () => blushSvg(1),
  /** Нос, морщины лба и у рта — под глазами и ртом. */
  faceDetails: () => forehead() + smileLines() + nose(),
  glasses,
  mouth,
  eyeWhite,
  pupil,
  cowlick,
  extras: (emotion: Emotion): string => (EXPR[emotion].extras ?? []).join(''),
  torso: () => body('pk'),
  hand: (): string => hand(0, 0, 0, false),
  fist: (): string => hand(0, 0, 0, true),
  cuff: (): string => cuff(0, 0, 0),
  sleeve: { width: 28, outline: 8, fill: C.tweed, line: C.outline },
};
