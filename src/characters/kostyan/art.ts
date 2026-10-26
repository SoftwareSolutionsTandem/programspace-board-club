// Векторная графика Костяна (docs/CHARACTERS.md): шашист, парень 18–22 лет — смекалистый, азартный, любит
// соревноваться. Тёмный чуб набок, короткие виски, густые брови, живые глаза, веснушки; оранжевое худи
// с завязками, наушники на шее, нашивка-корона дамки на груди. Никаких «блатных» атрибутов.
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
  outline: '#3B2418', skin: '#F2C29B', skinSh: '#DB9F78', blush: '#EC8A78', freckle: '#C98262',
  hair: '#4A2E22', hairSh: '#2F1C15', hairHi: '#7A5040',
  hoodie: '#E8743B', hoodieSh: '#C2552A', hoodieHi: '#F59A63', string: '#FFF3E4',
  phones: '#3A3F4A', phonesHi: '#5B6270', phonesRing: '#2F9C8F', patch: '#2F7A72', crown: '#F4C542',
  band: '#2F9C8F', shirt: '#F3EFE3',
  white: '#FFFDF8', pupil: '#2A1A12', iris: '#6B4A2E', mouth: '#6B2230', tongue: '#E26A6E', teeth: '#FFFDF8',
  drop: '#9ED3F0', spark: '#F4C542', vein: '#D8323F',
};
const ol = (w = 4): string => `stroke="${C.outline}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

// ---------- голова ----------
const EYE_L: readonly [number, number] = [98, 132];
const EYE_R: readonly [number, number] = [142, 132];

function eye([cx, cy]: readonly [number, number], side: number, st: string, look: readonly [number, number]): string {
  const [lx, ly] = look;
  const inner = cx - side * 12, outer = cx + side * 12;
  const lid = (iy: number, oy: number): string => {
    const top = cy - 17;
    const mid = cy + Math.min(iy, oy) - 1;
    return `<path d="M${inner} ${cy + iy} Q${cx} ${mid} ${outer} ${cy + oy} L${outer} ${top} L${inner} ${top} Z" fill="${C.skin}"/>
    <path d="M${inner} ${cy + iy} Q${cx} ${mid} ${outer} ${cy + oy}" fill="none" ${ol(3.2)}/>`;
  };
  const ball = (rx: number, ry: number, pr: number, star = false): string => `
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${C.white}" ${ol(3)}/>
    <circle cx="${cx + lx}" cy="${cy + ly}" r="${pr}" fill="${C.pupil}"/>
    ${star
      ? `<path d="M${cx + lx - 1.5} ${cy + ly - 2.2} l1.2 -3 1.2 3 3 1.2 -3 1.2 -1.2 3 -1.2 -3 -3 -1.2 Z" fill="${C.white}"/>`
      : `<circle cx="${cx + lx - 2}" cy="${cy + ly - 2.4}" r="2.2" fill="${C.white}"/>`}`;
  switch (st) {
    case 'happy': return `<path d="M${cx - 11} ${cy + 3} Q${cx} ${cy - 9} ${cx + 11} ${cy + 3}" fill="none" ${ol(4)}/>`;
    case 'closed': return `<path d="M${cx - 11} ${cy + 1} Q${cx} ${cy + 8} ${cx + 11} ${cy + 1}" fill="none" ${ol(4)}/>`;
    case 'wide': return ball(12.5, 14.5, 4.8);
    case 'star': return ball(12, 13.5, 6.4, true);
    case 'sly': return ball(11, 12.5, 6) + lid(-2, 3);
    case 'annoyed': return ball(11, 12.5, 5.8) + lid(-1, -4);
    case 'sad': return ball(11, 12.5, 5.8) + lid(-8, 0);
    default: return ball(11, 12.5, 6) + lid(-10, -10);
  }
}

/** Брови густые и прямые: азарт и досада — самые подвижные. */
function brow([cx, cy0]: readonly [number, number], side: number, st: string): string {
  const cy = cy0 - 22;
  const inner = cx - side * 13, outer = cx + side * 16;
  const [iy, oy, my] = ({
    neutral: [0, 1, -3],
    happy: [-2, 2, -7],
    raised: [-10, -6, -15],
    annoyed: [9, -6, 2],
    sad: [-8, 6, -3],
    slyUp: [-9, -8, -14],
    slyDown: [6, 2, 1],
    frown: [8, -2, 2],
  } as Record<string, [number, number, number]>)[st] ?? [0, 1, -3];
  const d = `M${outer} ${cy + oy} Q${cx} ${cy + my} ${inner} ${cy + iy}`;
  return `<path d="${d}" fill="none" stroke="${C.outline}" stroke-width="13" stroke-linecap="round"/>
  <path d="${d}" fill="none" stroke="${C.hair}" stroke-width="8.5" stroke-linecap="round"/>`;
}

export function mouthShape(st: string): string {
  switch (st) {
    case 'laugh':
      return `<path d="M101 178 Q120 174 139 178 Q137 206 120 206 Q103 206 101 178 Z" fill="${C.mouth}" ${ol(3.2)}/>
      <path d="M104 179 Q120 175 136 179 L135 184 Q120 187 105 184 Z" fill="${C.teeth}"/>
      <ellipse cx="120" cy="198" rx="10" ry="5" fill="${C.tongue}"/>`;
    case 'grin':
      return `<path d="M99 177 Q120 184 141 177 Q136 198 120 198 Q104 198 99 177 Z" fill="${C.mouth}" ${ol(3.2)}/>
      <path d="M102 178 Q120 185 138 178 L136 185 Q120 190 104 185 Z" fill="${C.teeth}"/>`;
    // Фирменная ухмылка — уголок вверх.
    case 'smirk':
      return `<path d="M104 186 Q122 191 138 178" fill="none" ${ol(3.6)}/><path d="M136 175 Q142 177 140 182" fill="none" ${ol(2.8)}/>`;
    case 'o':
      return `<ellipse cx="120" cy="188" rx="8.5" ry="11" fill="${C.mouth}" ${ol(3.2)}/>`;
    case 'wavy':
      return `<path d="M104 188 Q109 183 114 187 Q120 191 126 186 Q131 182 136 187" fill="none" ${ol(3.6)}/>`;
    case 'frown':
      return `<path d="M106 194 Q120 180 134 194" fill="none" ${ol(3.8)}/>`;
    case 'pursed':
      return `<path d="M110 186 Q116 183 122 186 Q128 189 132 185" fill="none" ${ol(3.4)}/>`;
    case 'vA': return `<path d="M107 185 Q120 187 133 185" fill="none" ${ol(4)}/>`;
    case 'vB':
      return `<path d="M104 181 Q120 179 136 181 Q133 192 120 192 Q107 192 104 181 Z" fill="${C.mouth}" ${ol(3)}/>
      <path d="M106 182 Q120 180 134 182 L133 185.5 Q120 187.5 107 185.5 Z" fill="${C.teeth}"/>`;
    case 'vC':
      return `<path d="M103 180 Q120 177 137 180 Q135 199 120 199 Q105 199 103 180 Z" fill="${C.mouth}" ${ol(3)}/>
      <path d="M105 181 Q120 178 135 181 L134 184.5 Q120 186.5 106 184.5 Z" fill="${C.teeth}"/>`;
    case 'vD': return mouthShape('laugh');
    case 'vE': return `<ellipse cx="120" cy="189" rx="10" ry="11.5" fill="${C.mouth}" ${ol(3)}/><ellipse cx="120" cy="196" rx="6" ry="3" fill="${C.tongue}"/>`;
    case 'vF': return `<ellipse cx="120" cy="188" rx="5.5" ry="6" fill="${C.mouth}" ${ol(3)}/>`;
    // Открытая улыбка, чуть набок.
    default:
      return `<path d="M103 181 Q121 196 138 180" fill="none" ${ol(3.6)}/><path d="M136 177 Q140 180 138 184" fill="none" ${ol(2.4)}/>`;
  }
}
export const mouth = (st: string): string => mouthShape(st);

const drop = (x: number, y: number, k = 1): string => `<path d="M0 -13 C7 -3 9 4 0 9 C-9 4 -7 -3 0 -13 Z" transform="translate(${x} ${y}) scale(${k})" fill="${C.drop}" ${ol(2.4)}/><path d="M-2.5 -2 Q-3 2 0 4" transform="translate(${x} ${y}) scale(${k})" fill="none" stroke="${C.white}" stroke-width="2" stroke-linecap="round"/>`;
const spark = (x: number, y: number, k = 1): string => `<path d="M0 -12 C1.5 -3 3 -1.5 12 0 C3 1.5 1.5 3 0 12 C-1.5 3 -3 1.5 -12 0 C-3 -1.5 -1.5 -3 0 -12 Z" transform="translate(${x} ${y}) scale(${k})" fill="${C.spark}" ${ol(2)}/>`;
/** «Венка» досады — мультяшный знак, как в комиксах. */
const vein = (x: number, y: number): string => `<g transform="translate(${x} ${y})" fill="none" stroke="${C.vein}" stroke-width="4" stroke-linecap="round">
  <path d="M-10 -3 Q-4 -4 -3 -10 M3 -10 Q4 -4 10 -3 M10 3 Q4 4 3 10 M-3 10 Q-4 4 -10 3"/></g>`;
/** Штрихи скорости — азарт. */
const zoom = (x: number, y: number): string => `<path d="M${x} ${y} l18 -6 M${x + 2} ${y + 12} l20 0 M${x} ${y + 24} l18 6" ${ol(3)}/>`;

const FACE = 'M68 112 C64 52 176 52 172 112 L172 150 C172 194 150 220 120 220 C90 220 68 194 68 150 Z';

function ears(): string {
  const one = (x: number, side: number) => `<path d="M${x} 118 C${x + side * 20} 110 ${x + side * 24} 152 ${x + side * 3} 160" fill="${C.skin}" ${ol(3.4)}/>
  <path d="M${x + side * 3} 128 C${x + side * 12} 128 ${x + side * 12} 146 ${x + side * 3} 150" fill="none" ${ol(2)} opacity="0.6"/>`;
  return one(70, -1) + one(170, 1);
}

/** Короткие виски и затылок (за лицом). */
function backHair(): string {
  return `<path d="M64 118 C56 60 84 30 120 30 C156 30 184 60 176 118 C172 100 168 86 160 78 L80 78 C72 86 68 100 64 118 Z" fill="${C.hair}" ${ol(3.2)}/>
  <path d="M70 104 Q72 92 78 84 M170 104 Q168 92 162 84" fill="none" stroke="${C.hairSh}" stroke-width="2.4" stroke-linecap="round"/>`;
}

/** Чуб набок — передняя деталь головы, пружинит при резких движениях. */
function fringe(): string {
  return `<path d="M72 96 C70 60 96 34 128 34 C160 34 178 58 174 92 C164 76 150 70 136 72 C142 80 142 90 136 98 C128 84 112 76 96 80 C100 86 100 94 94 100 C88 92 80 92 72 96 Z" fill="${C.hair}" ${ol(3.4)}/>
  <path d="M96 54 Q118 44 146 50 M108 68 Q128 58 152 62" fill="none" stroke="${C.hairHi}" stroke-width="3" stroke-linecap="round" opacity="0.9"/>
  <path d="M136 72 Q130 64 120 62 M96 80 Q90 74 84 74" fill="none" stroke="${C.hairSh}" stroke-width="2.4" stroke-linecap="round"/>`;
}

function faceBase(id: string): string {
  return `<clipPath id="${id}-face"><path d="${FACE}"/></clipPath>
  <path d="${FACE}" fill="${C.skinSh}"/>
  <g clip-path="url(#${id}-face)">
    <ellipse cx="113" cy="124" rx="62" ry="98" fill="${C.skin}"/>
  </g>
  <path d="${FACE}" fill="none" ${ol()}/>`;
}
const blushSvg = (opacity: number): string => `<ellipse cx="82" cy="160" rx="11" ry="7" fill="${C.blush}" opacity="${opacity}"/>
  <ellipse cx="158" cy="160" rx="11" ry="7" fill="${C.blush}" opacity="${opacity}"/>`;
/** Нос-кнопка. */
const nose = (): string => `<path d="M114 150 C110 158 112 166 120 166 C128 166 130 158 126 150" fill="${C.skinSh}" ${ol(3)}/>
  <ellipse cx="117" cy="157" rx="3" ry="2.2" fill="${C.white}" opacity="0.65"/>`;
/** Веснушки на щеках и переносице. */
const freckles = (): string => {
  const pts = [[90, 150], [96, 156], [86, 158], [150, 150], [144, 156], [154, 158], [112, 146], [128, 146]];
  return pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.8" fill="${C.freckle}" opacity="0.8"/>`).join('');
};
const chin = (): string => `<path d="M112 212 Q120 215 128 212" fill="none" ${ol(2)} opacity="0.35"/>`;

export function head(e: Expr, id = 'c', withMouth = true): string {
  const look = e.look ?? [0, 1];
  return `<g>
  ${backHair()}
  ${ears()}
  ${faceBase(id)}
  ${blushSvg(e.blush ?? 0.35)}
  ${freckles()}${chin()}
  ${eye(EYE_L, -1, e.eyes, look)}
  ${eye(EYE_R, 1, e.eyes, look)}
  ${nose()}
  ${withMouth ? mouth(e.mouth) : ''}
  ${brow(EYE_L, -1, e.browL ?? e.brows ?? 'neutral')}
  ${brow(EYE_R, 1, e.browR ?? e.brows ?? 'neutral')}
  ${fringe()}
  ${(e.extras ?? []).join('')}
  </g>`;
}

export const EXPR: Record<Emotion, Expr> = {
  warm: { eyes: 'open', brows: 'neutral', mouth: 'smile' },
  sly: { eyes: 'sly', look: [4, 1], browL: 'slyDown', browR: 'slyUp', mouth: 'smirk' },
  laugh: { eyes: 'happy', brows: 'happy', mouth: 'laugh', blush: 0.7, extras: [drop(56, 140, 0.55)] },
  azart: { eyes: 'star', brows: 'raised', mouth: 'grin', blush: 0.55, extras: [spark(210, 52, 0.85), zoom(196, 120)] },
  surprise: { eyes: 'wide', brows: 'raised', mouth: 'o' },
  think: { eyes: 'open', look: [4, -4], browL: 'frown', browR: 'slyUp', mouth: 'pursed' },
  annoyed: { eyes: 'annoyed', brows: 'annoyed', mouth: 'wavy', extras: [vein(176, 64)] },
  sad: { eyes: 'sad', look: [-1, 4], brows: 'sad', mouth: 'frown', blush: 0.2, extras: [drop(170, 96, 0.7)] },
};

// ---------- тело ----------
// Широкие округлые плечи, оранжевое худи; капюшон лежит за шеей, наушники — на шее.
// Плечи худи начинаются от шеи и плавно спускаются к рукавам.
const HOODIE = 'M184 244 C158 246 126 256 116 290 C110 310 110 330 110 342 L108 540 L312 540 L310 342 C310 330 310 310 304 290 C294 256 262 246 236 244 C230 262 190 262 184 244 Z';

function tube(d: string, w = 32, fill = C.hoodie): string {
  return `<path d="${d}" fill="none" stroke="${C.outline}" stroke-width="${w + 8}" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="${d}" fill="none" stroke="${fill}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

const hand = (x: number, y: number, rot = 0, fist = false, mirror = false): string => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(-1 ${mirror ? -1 : 1})">
  <ellipse rx="17" ry="14" fill="${C.skin}" ${ol(3.4)}/>
  ${fist
    ? `<path d="M-10 -6 q4 -4 8 0 M-2 -6 q4 -4 8 0 M6 -6 q3 -3 6 1" fill="none" ${ol(2.2)}/>`
    : `<path d="M-12 -3 q4 -3 8 0 M-3 -4 q4 -3 8 0 M6 -3 q3 -2 6 1" fill="none" ${ol(2)} opacity="0.5"/>`}
  <ellipse cx="-15" cy="-4" rx="6" ry="8.5" fill="${C.skin}" ${ol(2.8)}/>
  </g>`;
/** Манжета худи в рубчик. */
const cuff = (x: number, y: number, rot = 0): string => `<g transform="rotate(${rot} ${x} ${y})"><ellipse cx="${x}" cy="${y}" rx="17" ry="8" fill="${C.hoodieSh}" ${ol(3)}/>
  <path d="M${x - 9} ${y - 5} v10 M${x - 3} ${y - 6} v12 M${x + 3} ${y - 6} v12 M${x + 9} ${y - 5} v10" stroke="${C.hoodie}" stroke-width="2"/></g>`;

/** Дуга наушников — за шеей: рисуется до шеи, поэтому видна только по бокам от неё, как у надетых на шею. */
const headphonesBand = (): string => {
  const d = 'M182 262 C172 236 186 218 210 218 C234 218 248 236 238 262';
  return `<path d="${d}" fill="none" stroke="${C.outline}" stroke-width="12" stroke-linecap="round"/>
  <path d="${d}" fill="none" stroke="${C.phones}" stroke-width="7" stroke-linecap="round"/>
  <path d="M180 248 C178 238 184 228 192 224" fill="none" stroke="${C.phonesHi}" stroke-width="2.2" stroke-linecap="round"/>`;
};

/** Чашки наушников лежат на воротнике по сторонам шеи, чуть развёрнуты наружу и прижаты к ней. */
const headphonesCups = (): string => {
  const cup = (x: number, rot: number, hiDx: number) => `<g transform="translate(${x} 262) rotate(${rot})">
  <ellipse rx="13" ry="16" fill="${C.phones}" ${ol(3.4)}/>
  <ellipse cx="${rot < 0 ? 2 : -2}" rx="7" ry="10" fill="${C.phonesRing}" ${ol(2.4)}/>
  <ellipse cx="${hiDx}" cy="-7" rx="2.4" ry="4.4" fill="${C.phonesHi}"/>
  </g>`;
  return cup(184, -28, -6) + cup(236, 28, 6);
};

/** Нашивка: корона дамки. */
const patch = (x: number, y: number): string => `<g transform="translate(${x} ${y}) rotate(-6)">
  <circle r="17" fill="${C.patch}" ${ol(3)}/>
  <circle r="12.5" fill="none" stroke="${C.string}" stroke-width="1.6" stroke-dasharray="3 2.4"/>
  <path d="M-9 5 L-11 -6 L-4 -1 L0 -9 L4 -1 L11 -6 L9 5 Z" fill="${C.crown}" ${ol(2)}/>
  </g>`;

function body(id: string): string {
  return `
  <path d="M162 258 C156 228 180 210 210 210 C240 210 264 228 258 258 C248 248 228 244 210 244 C192 244 172 248 162 258 Z" fill="${C.hoodieSh}" ${ol(3.4)}/>
  <path d="M174 246 C178 228 194 220 210 220 C226 220 242 228 246 246" fill="none" stroke="${C.outline}" stroke-width="2.4" opacity="0.5"/>
  ${headphonesBand()}
  <path d="M194 210 L192 256 L228 256 L226 210 Z" fill="${C.skinSh}" ${ol(3.6)}/>
  <clipPath id="${id}-hoodie"><path d="${HOODIE}"/></clipPath>
  <path d="${HOODIE}" fill="${C.hoodieSh}"/>
  <g clip-path="url(#${id}-hoodie)">
    <ellipse cx="196" cy="380" rx="108" ry="190" fill="${C.hoodie}"/>
    <path d="M150 300 C150 280 170 270 182 272" fill="none" stroke="${C.hoodieHi}" stroke-width="6" stroke-linecap="round" opacity="0.7"/>
    <path d="M150 420 L270 420 L262 470 L158 470 Z" fill="${C.hoodieSh}" opacity="0.55"/>
    <path d="M150 420 L270 420" fill="none" stroke="${C.outline}" stroke-width="2.6" opacity="0.6"/>
  </g>
  <path d="${HOODIE}" fill="none" ${ol()}/>
  <path d="M180 246 C186 266 234 266 240 246" fill="none" stroke="${C.outline}" stroke-width="13" stroke-linecap="round"/>
  <path d="M180 246 C186 266 234 266 240 246" fill="none" stroke="${C.hoodieSh}" stroke-width="7" stroke-linecap="round"/>
  <path d="M186 252 l2 4 M196 257 l1 4 M210 259 v4 M224 257 l-1 4 M234 252 l-2 4" stroke="${C.hoodie}" stroke-width="1.6"/>
  <path d="M196 262 L192 316 M224 262 L228 316" fill="none" stroke="${C.outline}" stroke-width="5.5" stroke-linecap="round"/>
  <path d="M196 262 L192 316 M224 262 L228 316" fill="none" stroke="${C.string}" stroke-width="3" stroke-linecap="round"/>
  <rect x="188" y="314" width="8" height="10" rx="2" fill="${C.phones}" ${ol(1.8)}/><rect x="224" y="314" width="8" height="10" rx="2" fill="${C.phones}" ${ol(1.8)}/>
  ${headphonesCups()}
  ${patch(256, 330)}
  <path d="M140 300 Q132 340 134 380 M280 300 Q288 340 286 380" fill="none" stroke="${C.hoodieSh}" stroke-width="3.4" stroke-linecap="round"/>`;
}

// ---------- сидящая фигура: слои рига ----------
export const FIGURE_BOX = { x: 0, y: -30, w: 430, h: 470 } as const;
export const HEAD_BOX = { x: 80, y: -30, w: 260, h: 270 } as const;
export const MOUTH_BOX = { x: 170, y: 140, w: 80, h: 76 } as const;
export const HEAD_PIVOT = { x: 210, y: 230 } as const;

const svgDoc = (box: { x: number; y: number; w: number; h: number }, inner: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.x} ${box.y} ${box.w} ${box.h}" width="${box.w}" height="${box.h}">${inner}</svg>`;

export const bodySvg = (): string => svgDoc(FIGURE_BOX, body('cb'));
export const headSvg = (emotion: Emotion): string => svgDoc(HEAD_BOX, `<g transform="translate(90 0)">${head(EXPR[emotion], 'ch' + emotion, false)}</g>`);
export const portraitSvg = (emotion: Emotion = 'warm'): string => svgDoc(HEAD_BOX, `<g transform="translate(90 0)">${head(EXPR[emotion], 'cp' + emotion, true)}</g>`);

export const MOUTHS = ['smile', 'smirk', 'laugh', 'grin', 'o', 'pursed', 'wavy', 'frown', 'vA', 'vB', 'vC', 'vD', 'vE', 'vF'] as const;
export type MouthShape = (typeof MOUTHS)[number];
export const mouthSvg = (shape: MouthShape): string => svgDoc(MOUTH_BOX, `<g transform="translate(90 0)">${mouth(shape)}</g>`);
export const emotionMouth = (emotion: Emotion): MouthShape => (EXPR[emotion].mouth as MouthShape | undefined) ?? 'smile';

export const LID_TOP = EYE_L[1] - 14;
export const blinkSvg = (): string => {
  const lid = ([cx, cy]: readonly [number, number]) => `<ellipse cx="${cx}" cy="${cy}" rx="13" ry="14.5" fill="${C.skin}"/>
    <path d="M${cx - 12} ${cy + 2} Q${cx} ${cy + 9} ${cx + 12} ${cy + 2}" fill="none" ${ol(3.4)}/>`;
  return svgDoc(HEAD_BOX, `<g transform="translate(90 0)">${lid(EYE_L)}${lid(EYE_R)}</g>`);
};

const LEFT_REST = () => tube('M142 270 Q96 332 146 386') + cuff(148, 384, 70) + hand(162, 394, 10);
const RIGHT_REST = () => tube('M278 270 Q324 332 274 386') + cuff(272, 384, -70) + hand(258, 394, 170, false, true);
const POSE_ARMS: Record<Pose, () => string> = {
  idle: () => LEFT_REST() + RIGHT_REST(),
  // Кулак под подбородком.
  think: () => LEFT_REST() + tube('M278 268 Q336 300 262 236') + cuff(268, 242, -40) + hand(248, 222, -150, true, true),
  throw: () => LEFT_REST() + tube('M278 270 Q334 340 276 410') + cuff(278, 404, -50) + hand(266, 418, 160, false, true),
  took: () => RIGHT_REST() + tube('M142 268 Q92 300 116 220') + cuff(118, 228, 30) + hand(122, 208, -40, true),
  // Оба кулака вверх.
  victory: () => tube('M142 266 Q80 210 102 130') + cuff(100, 142, 10) + hand(102, 114, -100, true) + tube('M278 266 Q340 210 318 130') + cuff(320, 142, -10) + hand(318, 114, -80, true, true) + spark(360, 70, 1) + spark(60, 70, 0.8),
};
export const armsSvg = (pose: Pose): string => svgDoc(FIGURE_BOX, POSE_ARMS[pose]());

export const NO_BLINK_EYES: ReadonlySet<string> = new Set(['happy', 'star', 'wide', 'closed']);
export const PALETTE = C;

export const KOSTYAN_ART: CharacterArt = {
  id: 'kostyan',
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

// ---------- части марионетки (src/characters/kostyan/puppet.ts) ----------
function eyeWhite(style: 'ball' | 'wide' | 'star' | 'happy' | 'closed'): string {
  switch (style) {
    case 'happy': return `<path d="M-11 3 Q0 -9 11 3" fill="none" ${ol(4)}/>`;
    case 'closed': return `<path d="M-11 1 Q0 8 11 1" fill="none" ${ol(4)}/>`;
    case 'wide': return `<ellipse cx="0" cy="0" rx="12.5" ry="14.5" fill="${C.white}" ${ol(3)}/>`;
    case 'star': return `<ellipse cx="0" cy="0" rx="12" ry="13.5" fill="${C.white}" ${ol(3)}/>`;
    default: return `<ellipse cx="0" cy="0" rx="11" ry="12.5" fill="${C.white}" ${ol(3)}/>`;
  }
}

function pupil(r: number, star: boolean): string {
  return `<circle r="${r}" fill="${C.pupil}"/>${star
    ? `<path d="M-1.5 -2.2 l1.2 -3 1.2 3 3 1.2 -3 1.2 -1.2 3 -1.2 -3 -3 -1.2 Z" fill="${C.white}"/>`
    : `<circle cx="-2" cy="-2.4" r="2.2" fill="${C.white}"/>`}`;
}

export const KOSTYAN_PIECES = {
  colors: C,
  eyeL: EYE_L,
  eyeR: EYE_R,
  back: () => backHair() + ears(),
  faceBase: () => faceBase('pc'),
  blush: () => blushSvg(1),
  faceDetails: () => freckles() + chin(),
  nose,
  mouth,
  eyeWhite,
  pupil,
  fringe,
  extras: (emotion: Emotion): string => (EXPR[emotion].extras ?? []).join(''),
  torso: () => body('pc'),
  hand: (): string => hand(0, 0, 0, false),
  fist: (): string => hand(0, 0, 0, true),
  cuff: (): string => cuff(0, 0, 0),
  sleeve: { width: 32, outline: 8, fill: C.hoodie, line: C.outline },
};
