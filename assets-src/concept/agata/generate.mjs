// Генератор концепта Бабушки Агаты: персонаж собирается из заменяемых частей
// (голова, глаза, брови, рот, руки, реквизит) — прообраз будущего рига.
import { writeFileSync, mkdirSync } from 'node:fs';

const OUT = new URL('./out/', import.meta.url);
mkdirSync(OUT, { recursive: true });

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
let C = BASE;
const ol = (w = 4) => `stroke="${C.outline}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

// ---------- масти и карты ----------
const SUIT = {
  h: 'M0 9 C-15 -2 -12 -14 -5.5 -14 C-2.5 -14 0 -11.5 0 -9 C0 -11.5 2.5 -14 5.5 -14 C12 -14 15 -2 0 9 Z',
  d: 'M0 -13 L9.5 0 L0 13 L-9.5 0 Z',
  s: 'M0 -13 C12 -3 15 5 7 7 C3.5 7.5 1.5 5.5 0 3.5 C-1.5 5.5 -3.5 7.5 -7 7 C-15 5 -12 -3 0 -13 Z M-4.5 13 L0 3 L4.5 13 Z',
  c: 'M0 -12.5 a5.6 5.6 0 1 1 -0.01 0 Z M-6.5 -2 a5.6 5.6 0 1 1 -0.01 0 Z M6.5 -2 a5.6 5.6 0 1 1 -0.01 0 Z M-4 13 L0 2 L4 13 Z',
};
const suitColor = (s) => (s === 'h' || s === 'd' ? C.red : C.black);
const suit = (s, x, y, k = 1) => `<path d="${SUIT[s]}" transform="translate(${x} ${y}) scale(${k})" fill="${suitColor(s)}"/>`;

function card(x, y, rot, rank, s, k = 1, extra = '') {
  if (rank === 'back') return cardBack(x, y, rot, k);
  const col = suitColor(s);
  return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${k})">${extra}
  <rect x="-23" y="-33" width="46" height="66" rx="6" fill="${C.card}" ${ol(2.5)}/>
  <text x="-17" y="-16" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="14" fill="${col}">${rank}</text>
  ${suit(s, -12.5, -6, 0.42)}
  ${suit(s, 0, 8, 0.95)}
  </g>`;
}
function cardBack(x, y, rot, k = 1) {
  return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${k})">
  <rect x="-23" y="-33" width="46" height="66" rx="6" fill="${C.back}" ${ol(2.5)}/>
  <rect x="-17" y="-27" width="34" height="54" rx="3" fill="none" stroke="${C.backPat}" stroke-width="1.6"/>
  <path d="M0 -21 L11 0 L0 21 L-11 0 Z" fill="none" stroke="${C.backPat}" stroke-width="1.6"/>
  ${suit('h', 0, 0.5, 0.42).replace(C.red, C.backPat)}
  </g>`;
}

// ---------- голова ----------
// Локальные координаты головы: 240×230, лицо по центру x=120.
const EYE_L = [90, 140], EYE_R = [150, 140];

function eye([cx, cy], side, st, look) {
  const [lx, ly] = look;
  const innerX = cx - side * 16, outerX = cx + side * 16;
  const lid = (iy, oy) => {
    const top = cy - 24;
    const mid = cy + Math.min(iy, oy) - 2;
    return `<path d="M${innerX} ${cy + iy} Q${cx} ${mid} ${outerX} ${cy + oy} L${outerX} ${top} L${innerX} ${top} Z" fill="${C.skin}"/>
    <path d="M${innerX} ${cy + iy} Q${cx} ${mid} ${outerX} ${cy + oy}" fill="none" ${ol(3.4)}/>`;
  };
  const ball = (rx, ry, pr, star = false) => `
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

function brow([cx, cy0], side, st) {
  const cy = cy0 - 40;
  const innerX = cx - side * 15, outerX = cx + side * 15;
  const p = {
    neutral: [2, 2, -6],
    happy: [0, 1, -10],
    raised: [-9, -9, -19],
    annoyed: [7, -5, -2],
    sad: [-7, 5, -5],
    slyUp: [-7, -9, -17],
    slyDown: [4, 0, -3],
  }[st] ?? [2, 2, -6];
  const [iy, oy, my] = p;
  return `<path d="M${outerX} ${cy + oy} Q${cx} ${cy + my} ${innerX} ${cy + iy}" fill="none" stroke="${C.hairSh}" stroke-width="6.5" stroke-linecap="round"/>
  <path d="M${outerX} ${cy + oy} Q${cx} ${cy + my} ${innerX} ${cy + iy}" fill="none" stroke="${C.outline}" stroke-width="1.6" stroke-linecap="round" opacity="0.55"/>`;
}

function mouth(st) {
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

const drop = (x, y, k = 1) => `<path d="M0 -13 C7 -3 9 4 0 9 C-9 4 -7 -3 0 -13 Z" transform="translate(${x} ${y}) scale(${k})" fill="${C.drop}" ${ol(2.4)}/><path d="M-2.5 -2 Q-3 2 0 4" transform="translate(${x} ${y}) scale(${k})" fill="none" stroke="${C.white}" stroke-width="2" stroke-linecap="round"/>`;
const spark = (x, y, k = 1) => `<path d="M0 -12 C1.5 -3 3 -1.5 12 0 C3 1.5 1.5 3 0 12 C-1.5 3 -3 1.5 -12 0 C-3 -1.5 -1.5 -3 0 -12 Z" transform="translate(${x} ${y}) scale(${k})" fill="${C.spark}" ${ol(2)}/>`;

function hairBack() {
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
function earrings() {
  const one = (x) => `<path d="M${x} 188 Q${x + 3} 196 ${x - 3} 204 M${x} 188 Q${x + 6} 196 ${x + 7} 203" fill="none" stroke="${C.leaf}" stroke-width="2.2" stroke-linecap="round"/>
  <circle cx="${x - 4}" cy="207" r="5.5" fill="${C.red}" ${ol(2.2)}/><circle cx="${x + 8}" cy="206" r="5.5" fill="${C.red}" ${ol(2.2)}/>
  <circle cx="${x - 5.5}" cy="205" r="1.6" fill="${C.white}"/><circle cx="${x + 6.5}" cy="204" r="1.6" fill="${C.white}"/>`;
  return one(42) + one(194);
}
const FACE = 'M44 138 C44 50 196 50 196 138 C196 194 162 224 120 224 C78 224 44 194 44 138 Z';
const BANGS = 'M36 142 C26 60 70 20 120 20 C170 20 214 60 204 142 C198 122 190 108 180 102 C176 86 160 80 148 86 C140 74 124 72 116 82 C106 72 88 74 82 86 C70 80 56 88 58 102 C48 108 40 122 36 142 Z';

function head(e, id = 'h') {
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
  ${mouth(e.mouth)}
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
  ${brow(EYE_L, -1, e.browL ?? e.brows)}
  ${brow(EYE_R, 1, e.browR ?? e.brows)}
  <path d="${BANGS}" fill="${C.hair}" ${ol()}/>
  <path d="M70 52 Q96 32 128 34" fill="none" stroke="${C.hairHi}" stroke-width="5" stroke-linecap="round"/>
  <path d="M60 78 Q66 64 80 60 M96 60 Q106 50 120 52 M140 56 Q156 52 166 62 M174 72 Q184 80 188 94" fill="none" stroke="${C.hairSh}" stroke-width="3" stroke-linecap="round"/>
  ${(e.extras ?? []).join('')}
  </g>`;
}

const EXPR = {
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

function tube(d, w = 30, fill = C.dress) {
  return `<path d="${d}" fill="none" stroke="${C.outline}" stroke-width="${w + 8}" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="${d}" fill="none" stroke="${fill}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
}
const hand = (x, y, r = 18, rot = 0) => `<g transform="translate(${x} ${y}) rotate(${rot})">
  <circle r="${r}" fill="${C.skin}" ${ol(3.6)}/>
  <path d="M${-r * 0.5} ${-r * 0.2} q${r * 0.5} ${-r * 0.35} ${r * 0.95} 0" fill="none" ${ol(2.4)} opacity="0.55"/>
  <ellipse cx="${-r * 0.85}" cy="${-r * 0.35}" rx="${r * 0.38}" ry="${r * 0.5}" fill="${C.skin}" ${ol(3)}/>
  </g>`;
const cuff = (x, y, rot = 0) => `<ellipse cx="${x}" cy="${y}" rx="17" ry="8" transform="rotate(${rot} ${x} ${y})" fill="${C.shawl}" ${ol(3)}/>`;

function shawlDecor() {
  let s = '';
  const edge = (x0, y0, x1, y1) => {
    for (let t = 0.12; t < 0.95; t += 0.135) {
      const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
      s += `<path d="M${x} ${y - 7} l6 7 -6 7 -6 -7 Z" fill="${C.shawlPat}" ${ol(1.6)}/>`;
    }
  };
  edge(128, 262, 210, 374);
  edge(292, 262, 210, 374);
  let f = '';
  const fr = (x0, y0, x1, y1, dir) => {
    for (let t = 0.04; t < 0.98; t += 0.06) {
      const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
      f += `M${x} ${y} l${dir * 4} 11 `;
    }
  };
  fr(116, 268, 210, 396, -1);
  fr(304, 268, 210, 396, 1);
  return `<path d="${f}" stroke="${C.shawlSh}" stroke-width="3.2" stroke-linecap="round"/>` + s;
}

function body(id) {
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

// позы: какие руки и реквизит, и что рисуется поверх головы
const POSES = () => ({
  clasp: {
    under: '',
    arms: tube('M132 256 Q104 332 176 370') + tube('M288 256 Q316 332 244 370') +
      cuff(170, 366, 60) + cuff(250, 366, -60) + hand(196, 376, 19, 20) + hand(226, 374, 19, 160),
  },
  fan: {
    under: '',
    arms: tube('M132 256 Q96 318 150 338') + cuff(146, 336, 70) +
      card(128, 300, -32, '7', 'c') + card(144, 292, -14, '9', 'h') + card(162, 290, 4, 'Q', 's') + card(180, 294, 22, '6', 'd') + card(194, 304, 40, 'A', 'h') +
      hand(150, 340, 19, 10),
    over: tube('M288 256 Q338 290 286 232', 30) + cuff(296, 246, -20) + hand(276, 214, 18, -150),
  },
  slap: {
    under: tube('M288 252 Q358 210 352 120') + cuff(354, 140, 0),
    arms: tube('M132 256 Q86 300 124 344') + cuff(120, 336, 60) + hand(128, 348, 19, 30) +
      `<path d="M376 70 Q392 92 384 118 M392 60 Q414 92 402 128" fill="none" stroke="${C.outline}" stroke-width="3.5" stroke-linecap="round" opacity="0.7"/>` +
      card(350, 82, 16, '9', 'h', 1.15) + hand(352, 112, 19, -30),
  },
  victory: {
    under: tube('M132 252 Q74 190 96 108') + tube('M288 252 Q346 190 324 108') + cuff(96, 128, 10) + cuff(324, 128, -10),
    arms: hand(96, 100, 20, 160) + hand(324, 100, 20, 20) + spark(60, 60, 1.1) + spark(362, 52, 0.9) + spark(396, 150, 0.6) + spark(28, 168, 0.7),
  },
  took: {
    under: '',
    arms: card(178, 330, -28, '8', 's') + card(214, 324, 8, 'K', 'h') + card(244, 336, 34, '6', 'c') + card(196, 352, -6, 'J', 'd') + card(228, 356, 18, '7', 's') +
      tube('M132 256 Q104 350 180 368') + tube('M288 256 Q316 350 240 368') +
      cuff(172, 366, 70) + cuff(248, 366, -70) + hand(188, 372, 19, 30) + hand(232, 372, 19, 150),
  },
});

function figure(exprKey, poseKey, id) {
  const p = POSES()[poseKey];
  return `<g>${p.under ?? ''}${body(id)}${p.arms}<g transform="translate(90 0)">${head(EXPR[exprKey], id + 'h')}</g>${p.over ?? ''}</g>`;
}

const svg = (vb, inner, w, h) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${w}" height="${h}">${inner}</svg>\n`;
const files = {};

// листы
files['agata-full.svg'] = svg('0 -30 430 600', figure('warm', 'clasp', 'f'), 430, 600);
for (const k of Object.keys(EXPR)) files[`agata-face-${k}.svg`] = svg('-10 -24 260 262', head(EXPR[k], 'e' + k), 260, 262);
const POSE_EXPR = { fan: 'think', slap: 'azart', victory: 'laugh', took: 'annoyed' };
for (const [p, e] of Object.entries(POSE_EXPR)) files[`agata-pose-${p}.svg`] = svg('0 -30 430 600', figure(e, p, 'p' + p), 430, 600);
for (const v of ['vA', 'vB', 'vC', 'vD', 'vE', 'vF']) files[`agata-mouth-${v}.svg`] = svg('60 146 120 90', head({ eyes: 'open', brows: 'neutral', mouth: v }, 'm' + v), 200, 192);

// силуэт: все цвета → один тёмный
C = Object.fromEntries(Object.keys(BASE).map((k) => [k, BASE.outline]));
files['agata-silhouette.svg'] = svg('0 -30 430 600', figure('warm', 'clasp', 's'), 430, 600);
files['agata-silhouette-slap.svg'] = svg('0 -30 430 600', figure('azart', 'slap', 's2'), 430, 600);
C = BASE;

// сцена за столом (телефон 390×844): Агата подкидывает, игрок отбивается
function scene() {
  const hand6 = [['6', 'h'], ['8', 'c'], ['J', 'h'], ['Q', 'd'], ['K', 's'], ['A', 'c']];
  let ph = '';
  hand6.forEach(([r, s], i) => {
    const t = i - 2.5;
    const lift = i === 2 ? -26 : 0;
    ph += card(195 + t * 50, 760 + Math.abs(t) * 7 + lift, t * 6, r, s, 1.42,
      i === 2 ? `<rect x="-27" y="-37" width="54" height="74" rx="9" fill="none" stroke="${C.spark}" stroke-width="4"/>` : '');
  });
  return `
  <defs>
    <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F3DDB8"/><stop offset="1" stop-color="#E8C796"/></linearGradient>
    <radialGradient id="lamp" cx="0.5" cy="0.1" r="0.7"><stop offset="0" stop-color="#FFF1C9" stop-opacity="0.9"/><stop offset="1" stop-color="#FFF1C9" stop-opacity="0"/></radialGradient>
    <linearGradient id="cloth" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2F7A72"/><stop offset="1" stop-color="#215A55"/></linearGradient>
  </defs>
  <rect width="390" height="844" fill="url(#wall)"/>
  <path d="M0 0 H390 V96 Q195 120 0 96 Z" fill="#E3BE8A" opacity="0.5"/>
  <g opacity="0.55">
    <rect x="22" y="128" width="96" height="118" rx="10" fill="#BFE0E8" ${ol(4)}/>
    <path d="M70 128 V246 M22 187 H118" ${ol(4)}/>
    <rect x="276" y="150" width="96" height="10" rx="3" fill="#A86B3C" ${ol(3)}/>
    <rect x="284" y="112" width="22" height="38" rx="3" fill="#C5333B" ${ol(3)}/><rect x="308" y="120" width="28" height="30" rx="3" fill="#E8AB30" ${ol(3)}/><rect x="338" y="104" width="18" height="46" rx="3" fill="#2F7A72" ${ol(3)}/>
  </g>
  <path d="M195 0 V46" ${ol(3)}/><path d="M160 76 Q195 36 230 76 Z" fill="#C5333B" ${ol(3.5)}/>
  <ellipse cx="195" cy="250" rx="230" ry="260" fill="url(#lamp)"/>
  <rect y="330" width="390" height="514" fill="#A86B3C"/>
  <g transform="translate(23 34) scale(0.8)">${figure('azart', 'slap', 'sc')}</g>
  <path d="M-10 372 Q195 330 400 372 V860 H-10 Z" fill="url(#cloth)" ${ol(5)}/>
  <path d="M10 392 Q195 354 380 392" fill="none" stroke="#5FA79C" stroke-width="3" stroke-dasharray="2 9" stroke-linecap="round"/>
  <g>
    ${card(92, 500, 90, 'Q', 'h', 1.3)}
    ${cardBack(50, 494, 0, 1.3)}${cardBack(53, 491, 0, 1.3)}${cardBack(56, 488, 0, 1.3)}
    ${card(214, 498, -8, '9', 'c', 1.45)}
    ${card(232, 512, 10, 'J', 'c', 1.45)}
  </g>
  ${ph}`;
}
files['scene-table.svg'] = svg('0 0 390 844', scene(), 390, 844);


// ---------- сцена «компьютер»: Агата напротив игрока через стол ----------
function desktopScene() {
  const FX = 434, FY = 40, FK = 0.98; // положение фигуры Агаты в кадре
  const fig = (inner) => `<g transform="translate(${FX} ${FY}) scale(${FK})">${inner}</g>`;
  const sky = `<linearGradient id="dsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3E4C7A"/><stop offset="0.65" stop-color="#C77F7A"/><stop offset="1" stop-color="#F0B26E"/></linearGradient>`;
  const defs = `<defs>
    <linearGradient id="dwall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F3DDB8"/><stop offset="1" stop-color="#E6C08C"/></linearGradient>
    <radialGradient id="dglow" cx="0.5" cy="0.3" r="0.6"><stop offset="0" stop-color="#FFF1C9" stop-opacity="0.5"/><stop offset="1" stop-color="#FFF1C9" stop-opacity="0"/></radialGradient>
    <radialGradient id="dpool" cx="0.5" cy="0.35" r="0.6"><stop offset="0" stop-color="#3E9488"/><stop offset="1" stop-color="#1E5450"/></radialGradient>
    ${sky}
  </defs>`;

  // стена, панели, окно с занавесками
  const wall = `<rect width="1280" height="720" fill="url(#dwall)"/>
  <rect y="300" width="1280" height="130" fill="#B97E4B"/>
  <path d="M0 300 H1280" ${ol(4)}/>
  ${[40, 250, 460, 820, 1030].map((x) => `<rect x="${x}" y="318" width="190" height="80" rx="6" fill="none" stroke="#8C5A31" stroke-width="3"/>`).join('')}
  <g>
    <rect x="70" y="70" width="230" height="200" rx="8" fill="url(#dsky)" ${ol(5)}/>
    <path d="M70 232 L110 214 L110 196 L140 196 L140 220 L182 204 L182 186 L214 186 L214 210 L252 196 L300 214 L300 270 L70 270 Z" fill="#2B3354" opacity="0.85"/>
    <circle cx="246" cy="104" r="12" fill="#FFF3D1" opacity="0.9"/>
    <path d="M185 70 V270 M70 170 H300" stroke="#8C5A31" stroke-width="7"/><path d="M185 70 V270 M70 170 H300" ${ol(2)} opacity="0.5"/>
    <rect x="70" y="70" width="230" height="200" rx="8" fill="none" ${ol(5)}/>
    <path d="M52 56 C64 120 86 200 74 276 L108 276 C104 210 94 120 96 56 Z" fill="#B8323F" ${ol(4)}/>
    <path d="M318 56 C306 120 284 200 296 276 L262 276 C266 210 276 120 274 56 Z" fill="#B8323F" ${ol(4)}/>
    <rect x="40" y="48" width="290" height="14" rx="7" fill="#8C5A31" ${ol(3.5)}/>
  </g>`;

  // правая стена: полка с коробками игр, растение, грифельная доска со счётом
  const right = `<g>
    <rect x="1010" y="60" width="200" height="108" rx="10" fill="#2E4038" ${ol(5)}/>
    <rect x="1018" y="68" width="184" height="92" rx="6" fill="none" stroke="#8C5A31" stroke-width="5"/>
    <rect x="1000" y="236" width="250" height="14" rx="4" fill="#8C5A31" ${ol(3.5)}/>
    <rect x="1014" y="182" width="34" height="54" rx="4" fill="#C5333B" ${ol(3)}/>
    <rect x="1050" y="196" width="56" height="40" rx="4" fill="#E8AB30" ${ol(3)}/>
    <rect x="1108" y="174" width="26" height="62" rx="4" fill="#2F7A72" ${ol(3)}/>
    <path d="M1060 210 h36 M1060 220 h24" stroke="#3B2418" stroke-width="2.5" stroke-linecap="round" opacity="0.5"/>
    <path d="M1150 236 L1156 204 L1206 204 L1212 236 Z" fill="#C2774A" ${ol(3)}/>
    <path d="M1181 204 C1170 170 1150 160 1140 166 C1156 176 1166 188 1176 204 M1181 204 C1186 166 1206 150 1220 154 C1206 168 1196 184 1186 204 M1181 204 C1180 176 1182 150 1192 138 C1194 160 1190 182 1184 204" fill="#5B9A4E" ${ol(2.6)}/>
  </g>`;

  // светильники над столом
  const lamp = (x) => `<path d="M${x} 0 V44" ${ol(3)}/><path d="M${x - 44} 84 Q${x} 30 ${x + 44} 84 Z" fill="#C5333B" ${ol(4)}/><ellipse cx="${x}" cy="86" rx="16" ry="6" fill="#FFF1C9"/>`;
  const glow = `<ellipse cx="350" cy="230" rx="300" ry="240" fill="url(#dglow)"/><ellipse cx="930" cy="230" rx="300" ry="240" fill="url(#dglow)"/>`;

  // спинка стула за Агатой
  const chair = fig(`<path d="M24 340 C24 196 396 196 396 340 L370 340 C370 236 50 236 50 340 Z" fill="#8C5A31" ${ol(4)}/>`);

  // Агата: тело и голова (руки рисуются поверх стола)
  const agataBack = fig(`${body('dk')}<g transform="translate(90 0)">${head(EXPR.sly, 'dkh')}</g>`);

  // стол в перспективе: дальний край, сукно, пятно света
  const table = `
  <path d="M226 415 L1054 415 L1420 760 L-140 760 Z" fill="#A86B3C" ${ol(5)}/>
  <path d="M238 423 L1042 423" stroke="#C88D58" stroke-width="3"/>
  <path d="M276 429 L1004 429 L1330 760 L-50 760 Z" fill="url(#dpool)" ${ol(4)}/>
  <path d="M290 441 L990 441" stroke="#5FA79C" stroke-width="3" stroke-dasharray="2 10" stroke-linecap="round"/>`;

  // предметы на столе (карты на столе чуть сжаты по вертикали — лежат)
  const flat = (inner, x, y) => `<g transform="translate(${x} ${y}) scale(1 0.86) translate(${-x} ${-y})">${inner}</g>`;
  const deck = flat(card(366, 506, 90, 'Q', 'h', 1.55) + cardBack(312, 500, -4, 1.55) + cardBack(315, 496, -4, 1.55) + cardBack(318, 492, -4, 1.55), 335, 500);
  const pair = flat(card(560, 522, -8, '9', 'c', 1.7) + card(588, 538, 9, 'J', 'c', 1.7), 575, 527);
  const discard = flat(cardBack(1016, 540, 16, 1.55) + cardBack(1010, 534, 6, 1.55) + cardBack(1022, 528, 28, 1.55), 1016, 535);
  const teacup = `<g transform="translate(920 446)">
    <ellipse cx="0" cy="10" rx="44" ry="11" fill="#FFFDF6" ${ol(3.5)}/>
    <path d="M-26 -22 L26 -22 Q24 8 0 10 Q-24 8 -26 -22 Z" fill="#FFFDF6" ${ol(3.5)}/>
    <path d="M24 -14 q16 0 14 10 q-2 8 -16 6" fill="none" ${ol(3.5)}/>
    <ellipse cx="0" cy="-22" rx="26" ry="6" fill="#8C4F2A" ${ol(3)}/>
    <path d="M-16 -4 h32" stroke="#C5333B" stroke-width="4"/>
    <path d="M-8 -36 q-8 -12 2 -22 M8 -38 q-8 -12 2 -22" fill="none" stroke="#FFFDF6" stroke-width="3" stroke-linecap="round" opacity="0.85"/>
  </g>`;

  // руки Агаты: веер своих карт (рубашкой к игроку) и подкидывание девятки червей
  const arms = fig(
    tube('M132 256 Q96 318 150 338') + cuff(146, 334, 70) +
    cardBack(116, 302, -34) + cardBack(132, 292, -17) + cardBack(150, 288, 0) + cardBack(168, 292, 17) + cardBack(184, 302, 34) +
    hand(150, 342, 19, 10) +
    tube('M288 256 Q356 318 334 400') + cuff(336, 384, 12) +
    `<path d="M380 404 Q396 424 388 446 M394 396 Q414 426 404 456" fill="none" stroke="${C.outline}" stroke-width="3.5" stroke-linecap="round" opacity="0.6"/>` +
    card(326, 466, 18, '9', 'h', 1.35) + hand(336, 408, 19, -70),
  );

  // рука игрока на переднем плане
  const handCards = [['6', 'h'], ['8', 'c'], ['J', 'h'], ['Q', 'd'], ['K', 's'], ['A', 'c']];
  let ph = '';
  handCards.forEach(([r, s], i) => {
    const t = i - 2.5;
    const lift = i === 2 ? -40 : 0;
    ph += card(640 + t * 96, 690 + Math.abs(t) * 12 + lift, t * 5, r, s, 2.1,
      i === 2 ? `<rect x="-27" y="-37" width="54" height="74" rx="9" fill="none" stroke="${C.spark}" stroke-width="3.5"/>` : '');
  });

  return defs + wall + right + glow + lamp(350) + lamp(930) + chair + agataBack + table + deck + pair + discard + teacup + arms + ph;
}
files['scene-desktop.svg'] = svg('0 0 1280 720', desktopScene(), 1280, 720);

for (const [name, body] of Object.entries(files)) writeFileSync(new URL(name, OUT), body);
console.log(Object.keys(files).length, 'files');
