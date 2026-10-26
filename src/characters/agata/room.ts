// Комната Агаты — «Гостиная с сервантом» (docs/ART_STYLE.md §12): обои в мелкий цветочек, советский ковёр на стене
// за Агатой, сервант с хрусталём, фарфором и портретом Агаты с Матвеем, часы с маятником, торшер, батарея под окном,
// дощатый пол. На подоконнике — бенгальская кошка и розы, за окном — морось.
// Живое: шторы, маятник, пар над чайником, морось, кошка (хвост, ухо, моргание). Модуль строит SVG-строки и не зависит от DOM.
import { cycle, hash01, hump, propSvg, wave, type RoomArt } from '../../render/ambient';
import { FLOOR_Y, floorDefs, floorSvg, frame, glow, glowDef, ol, roomDoc, scoreSlate } from '../../render/roomKit';

const WOOD = '#8C5A31', WOOD_D = '#6A4023', CREAM = '#F6EEDB', GOLD = '#C9A24A';
// Окно: стекло и рама (единицы фона); подоконник — под стеклом.
const WIN = { x: 500, y: 96, w: 270, h: 222 };
const SILL_Y = WIN.y + WIN.h + 8;
// Ковёр на стене за Агатой.
const RUG = { x: 945, y: 52, w: 520, h: 336 };
// Сервант: левый край, верх (под табло счёта).
const SB = { x: 1515, top: 236, w: 420 };
// Кошка лежит на подоконнике головой влево.
const CAT = { x: 538, y: SILL_Y - 2 };
// Часы с маятником.
const CLOCK = { x: 878 };
const TEAPOT = { x: 1828, spoutX: 1868, spoutY: 196 };

// ---------- окно ----------

function windowGlass(): string {
  const { x, y, w, h } = WIN;
  // Дома напротив в сумерках, тёплые окна; низкие облака.
  const houses = `<path d="M${x} ${y + h} V${y + 150} L${x + 40} ${y + 128} L${x + 80} ${y + 150} V${y + 118} H${x + 146} V${y + 160} L${x + 186} ${y + 136} L${x + 228} ${y + 160} V${y + 140} H${w + x} V${y + h} Z" fill="#3A4466"/>` +
    [[22, 160], [50, 166], [94, 132], [122, 132], [94, 168], [200, 172], [246, 156]].map(([dx, dy]) => `<rect x="${x + dx!}" y="${y + dy!}" width="12" height="14" rx="2" fill="#F5C76A" opacity="0.8"/>`).join('');
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#agSky)"/>${houses}
  <path d="M${x + 20} ${y + 40} C${x + 50} ${y + 22} ${x + 96} ${y + 30} ${x + 116} ${y + 46} C${x + 86} ${y + 52} ${x + 44} ${y + 54} ${x + 20} ${y + 40} Z" fill="#8C93B0" opacity="0.6"/>
  <path d="M${x + 150} ${y + 70} C${x + 180} ${y + 54} ${x + 230} ${y + 58} ${x + 252} ${y + 76} C${x + 220} ${y + 82} ${x + 180} ${y + 84} ${x + 150} ${y + 70} Z" fill="#8C93B0" opacity="0.5"/>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#C8D2E6" opacity="0.12"/>`;
}

/** Переплёт окна — рисуется и в фоне, и поверх мороси (капли — на наружном стекле, за переплётом). */
function windowFrame(ox: number, oy: number): string {
  const x = WIN.x - ox, y = WIN.y - oy, { w, h } = WIN;
  return `<path d="M${x + w / 2} ${y} V${y + h} M${x} ${y + h * 0.42} H${x + w}" stroke="${CREAM}" stroke-width="9"/>
  <path d="M${x + w / 2} ${y} V${y + h} M${x} ${y + h * 0.42} H${x + w}" fill="none" ${ol(2)}/>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="none" stroke="${CREAM}" stroke-width="12"/>
  <rect x="${x - 6}" y="${y - 6}" width="${w + 12}" height="${h + 12}" rx="6" fill="none" ${ol(4)}/>`;
}

const CURTAIN = { w: 84, h: 330 };
/** Штора висит свободно, без подхвата: складки сверху вниз, низ чуть волной. Локальные координаты w × h. */
function curtain(side: 1 | -1): string {
  const { w, h } = CURTAIN;
  const d = `M4 4 H${w - 4} C${w - 2} ${h * 0.4} ${w + 2} ${h * 0.7} ${w - 2} ${h - 10} Q${w * 0.75} ${h - 2} ${w / 2} ${h - 8} Q${w * 0.25} ${h - 2} 2 ${h - 10} C-2 ${h * 0.7} 2 ${h * 0.4} 4 4 Z`;
  const folds = [0.22, 0.42, 0.62, 0.8].map((f, k) => `<path d="M${w * f} 10 C${w * f + 3 * side} ${h * 0.35} ${w * f - 3 * side} ${h * 0.7} ${w * f + (k % 2 ? 2 : -2)} ${h - 12}" fill="none" stroke="#8E2632" stroke-width="${k % 2 ? 4 : 6}" opacity="0.5"/>`).join('');
  const lights = [0.32, 0.72].map((f) => `<path d="M${w * f} 12 C${w * f + 2} ${h * 0.4} ${w * f - 2} ${h * 0.7} ${w * f} ${h - 16}" fill="none" stroke="#D9535E" stroke-width="3" opacity="0.6"/>`).join('');
  return propSvg(w, h, `<path d="${d}" fill="#B8323F" ${ol(4)}/>${folds}${lights}
    <path d="M6 ${h - 22} Q${w * 0.25} ${h - 14} ${w / 2} ${h - 20} Q${w * 0.75} ${h - 14} ${w - 6} ${h - 22}" fill="none" stroke="${GOLD}" stroke-width="4" opacity="0.8"/>`);
}

function sillAndRadiator(): string {
  const { x, w } = WIN;
  const fins = Array.from({ length: 11 }, (_, k) => `<rect x="${x + 20 + k * 21}" y="${SILL_Y + 36}" width="17" height="62" rx="6" fill="#ECE7DC" ${ol(2.4)}/>`).join('');
  return `<rect x="${x - 26}" y="${SILL_Y - 4}" width="${w + 52}" height="18" rx="5" fill="${CREAM}" ${ol(3.5)}/>
  <path d="M${x - 20} ${SILL_Y + 14} H${x + w + 20}" stroke="#3B2418" stroke-opacity="0.25" stroke-width="5"/>
  <g>${fins}<path d="M${x + 18} ${SILL_Y + 48} H${x + 252} M${x + 18} ${SILL_Y + 86} H${x + 252}" stroke="#C9C3B6" stroke-width="3"/></g>`;
}

// ---------- розы на подоконнике ----------

/** Роза: бутон из завитых лепестков (центр x, y; радиус r). */
function rose(x: number, y: number, r: number): string {
  const petals = [0, 72, 144, 216, 288].map((a) => `<path d="M0 0 C${r * 0.9} ${-r * 0.2} ${r * 1.05} ${r * 0.7} ${r * 0.2} ${r * 0.95} C${-r * 0.2} ${r * 0.6} ${-r * 0.1} ${r * 0.2} 0 0 Z" fill="#C21F3A" ${ol(1.8)} transform="rotate(${a})"/>`).join('');
  return `<g transform="translate(${x} ${y})">${petals}
    <circle r="${r * 0.62}" fill="#D72E4A" ${ol(1.8)}/>
    <path d="M${-r * 0.45} ${r * 0.1} C${-r * 0.4} ${-r * 0.5} ${r * 0.45} ${-r * 0.5} ${r * 0.42} ${r * 0.05} C${r * 0.4} ${r * 0.4} ${-r * 0.1} ${r * 0.45} ${-r * 0.12} ${r * 0.05} C${-r * 0.12} ${-r * 0.2} ${r * 0.18} ${-r * 0.2} ${r * 0.16} ${r * 0.04}" fill="none" stroke="#8C1027" stroke-width="2" stroke-linecap="round"/>
    <path d="M${-r * 0.5} ${-r * 0.35} q${r * 0.2} ${-r * 0.25} ${r * 0.45} ${-r * 0.2}" fill="none" stroke="#F07A8C" stroke-width="2" stroke-linecap="round"/></g>`;
}
/** Резной лист розы с прожилкой. */
const roseLeaf = (x: number, y: number, rot: number, s = 1): string => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">
  <path d="M0 0 C4 -6 12 -8 20 -6 L17 -3 L22 -1 L17 1 L20 4 C12 7 4 5 0 0 Z" fill="#4F8C3E" ${ol(1.6)}/>
  <path d="M1 0 H17 M8 0 l3 -3 M8 0 l3 3 M13 0 l2 -2.5 M13 0 l2 2.5" stroke="#2F5A24" stroke-width="1.2" fill="none"/></g>`;
/** Стебель с шипами. */
const stem = (d: string, thorns: readonly (readonly [number, number, number])[]): string =>
  `<path d="${d}" fill="none" stroke="#3E7A34" stroke-width="4" stroke-linecap="round"/>` +
  thorns.map(([tx, ty, a]) => `<path d="M${tx} ${ty} l${4 * Math.cos(a)} ${4 * Math.sin(a)} l${2 * Math.cos(a + 1.8)} ${2 * Math.sin(a + 1.8)} Z" fill="#2F5A24"/>`).join('');

function roses(): string {
  const px = WIN.x + WIN.w - 92, base = SILL_Y - 4;
  return `<g>
    ${stem(`M${px + 26} ${base - 30} C${px + 22} ${base - 70} ${px + 10} ${base - 100} ${px + 6} ${base - 126}`, [[px + 20, base - 60, 3.4], [px + 12, base - 96, -0.3]])}
    ${stem(`M${px + 28} ${base - 30} C${px + 30} ${base - 80} ${px + 34} ${base - 110} ${px + 32} ${base - 148}`, [[px + 31, base - 74, 0.2], [px + 33, base - 120, 3.3]])}
    ${stem(`M${px + 30} ${base - 30} C${px + 40} ${base - 66} ${px + 52} ${base - 92} ${px + 56} ${base - 116}`, [[px + 44, base - 70, 0.1], [px + 52, base - 100, 3.6]])}
    ${roseLeaf(px + 20, base - 70, 200, 1.1)}${roseLeaf(px + 34, base - 96, -20, 1)}${roseLeaf(px + 46, base - 62, -30, 1.1)}${roseLeaf(px + 14, base - 106, 210, 0.9)}${roseLeaf(px + 52, base - 104, -60, 0.8)}
    ${rose(px + 6, base - 132, 13)}${rose(px + 32, base - 154, 15)}${rose(px + 57, base - 122, 12)}
    <path d="M${px + 4} ${base} L${px} ${base - 34} H${px + 58} L${px + 54} ${base} Z" fill="#C2774A" ${ol(3)}/>
    <rect x="${px - 4}" y="${base - 40}" width="66" height="10" rx="3" fill="#D08A5C" ${ol(2.6)}/>
    <path d="M${px + 8} ${base - 18} q21 6 42 0" fill="none" stroke="#F6EEDB" stroke-width="3" opacity="0.6"/></g>`;
}

// ---------- кошка ----------

const CAT_FUR = '#E8A24A', CAT_DARK = '#5A3216', CAT_ROSE = '#B8621E', CAT_BELLY = '#F7E3C0';
/** Бенгальская кошка: лежит «буханкой», голова слева. Без хвоста, уха и век — они живые (props). */
function catBody(): string {
  const { x, y } = CAT;
  // Розетки: тёмный контур с рыжей серединой — характерный окрас бенгала.
  const rosette = (cx: number, cy: number, r: number) => `<path d="M${cx - r} ${cy} C${cx - r} ${cy - r * 0.9} ${cx + r * 0.7} ${cy - r} ${cx + r} ${cy - r * 0.2} C${cx + r * 1.1} ${cy + r * 0.7} ${cx - r * 0.2} ${cy + r} ${cx - r} ${cy} Z" fill="${CAT_ROSE}" stroke="${CAT_DARK}" stroke-width="2.6"/>`;
  const spots = [[44, -30, 7], [64, -34, 6], [82, -28, 7], [100, -22, 6], [56, -16, 6], [76, -12, 7], [96, -8, 5], [112, -12, 5], [36, -14, 5]].map(([dx, dy, r]) => rosette(x + dx!, y + dy!, r!)).join('');
  return `<g>
    <ellipse cx="${x + 70}" cy="${y + 1}" rx="74" ry="7" fill="#3B2418" opacity="0.2"/>
    <path d="M${x + 6} ${y} C${x + 4} ${y - 34} ${x + 40} ${y - 48} ${x + 80} ${y - 46} C${x + 118} ${y - 44} ${x + 138} ${y - 26} ${x + 136} ${y} Z" fill="${CAT_FUR}" ${ol(3.4)}/>
    ${spots}
    <path d="M${x + 14} ${y} C${x + 24} ${y - 10} ${x + 50} ${y - 10} ${x + 62} ${y}" fill="${CAT_BELLY}" ${ol(2)}/>
    <ellipse cx="${x + 20}" cy="${y - 3}" rx="13" ry="6" fill="${CAT_FUR}" ${ol(2.6)}/><ellipse cx="${x + 44}" cy="${y - 3}" rx="13" ry="6" fill="${CAT_FUR}" ${ol(2.6)}/>
    <path d="M${x + 14} ${y - 3} v4 M${x + 20} ${y - 2} v4 M${x + 38} ${y - 3} v4 M${x + 44} ${y - 2} v4" stroke="${CAT_DARK}" stroke-width="1.6"/>
    <g>
      <path d="M${x + 20} ${y - 46} L${x + 14} ${y - 76} L${x + 34} ${y - 58} Z" fill="${CAT_FUR}" ${ol(2.8)}/><path d="M${x + 20} ${y - 52} L${x + 18} ${y - 68} L${x + 28} ${y - 58} Z" fill="#F2A7A0"/>
      <ellipse cx="${x + 30}" cy="${y - 38}" rx="27" ry="23" fill="${CAT_FUR}" ${ol(3.2)}/>
      <path d="M${x + 22} ${y - 56} l3 8 M${x + 30} ${y - 58} v9 M${x + 38} ${y - 56} l-3 8" stroke="${CAT_DARK}" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M${x + 6} ${y - 40} q6 2 9 -2 M${x + 54} ${y - 40} q-6 2 -9 -2 M${x + 8} ${y - 30} q6 1 8 -3 M${x + 52} ${y - 30} q-6 1 -8 -3" fill="none" stroke="${CAT_DARK}" stroke-width="2" stroke-linecap="round"/>
      <ellipse cx="${x + 30}" cy="${y - 25}" rx="12" ry="8" fill="${CAT_BELLY}"/>
      <ellipse cx="${x + 20}" cy="${y - 40}" rx="6" ry="5.5" fill="#8BC34A" ${ol(1.8)}/><ellipse cx="${x + 40}" cy="${y - 40}" rx="6" ry="5.5" fill="#8BC34A" ${ol(1.8)}/>
      <ellipse cx="${x + 20}" cy="${y - 40}" rx="1.8" ry="4.6" fill="#1E1408"/><ellipse cx="${x + 40}" cy="${y - 40}" rx="1.8" ry="4.6" fill="#1E1408"/>
      <circle cx="${x + 18.5}" cy="${y - 42}" r="1.4" fill="#FFFFFF"/><circle cx="${x + 38.5}" cy="${y - 42}" r="1.4" fill="#FFFFFF"/>
      <path d="M${x + 27} ${y - 30} h6 l-3 4 Z" fill="#E07A80" ${ol(1.4)}/>
      <path d="M${x + 30} ${y - 26} q-3 4 -7 2 M${x + 30} ${y - 26} q3 4 7 2" fill="none" stroke="${CAT_DARK}" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M${x + 18} ${y - 27} l-16 -3 M${x + 18} ${y - 24} l-16 2 M${x + 42} ${y - 27} l16 -3 M${x + 42} ${y - 24} l16 2" stroke="#FFF6E6" stroke-width="1.3"/>
    </g></g>`;
}
// Правое ухо — отдельно (подёргивается); опора — у основания уха.
const EAR = { x: CAT.x + 32, y: CAT.y - 78, w: 26, h: 26, px: CAT.x + 40, py: CAT.y - 56 };
const catEar = (): string => propSvg(EAR.w, EAR.h, `<path d="M2 22 L14 2 L22 24 Z" fill="${CAT_FUR}" stroke="#3B2418" stroke-width="2.8" stroke-linejoin="round"/><path d="M7 20 L14 8 L18 21 Z" fill="#F2A7A0"/><path d="M14 4 v-3" stroke="${CAT_DARK}" stroke-width="2" stroke-linecap="round"/>`);
// Веки: закрывают оба глаза на миг.
const LIDS = { x: CAT.x + 12, y: CAT.y - 47, w: 36, h: 14 };
const catLids = (): string => propSvg(LIDS.w, LIDS.h, `<ellipse cx="8" cy="7" rx="6.6" ry="6" fill="${CAT_FUR}" stroke="#3B2418" stroke-width="1.8"/><ellipse cx="28" cy="7" rx="6.6" ry="6" fill="${CAT_FUR}" stroke="#3B2418" stroke-width="1.8"/><path d="M3 8 q5 3 10 0 M23 8 q5 3 10 0" fill="none" stroke="#3B2418" stroke-width="1.8" stroke-linecap="round"/>`);
// Хвост свешивается с подоконника; опора — у основания.
const TAIL = { x: CAT.x + 126, y: CAT.y - 14, w: 46, h: 96, px: CAT.x + 132, py: CAT.y - 8 };
const catTail = (): string => propSvg(TAIL.w, TAIL.h, `<path d="M6 6 C26 14 36 40 30 64 C27 78 22 86 18 90" fill="none" stroke="#3B2418" stroke-width="17" stroke-linecap="round"/>
  <path d="M6 6 C26 14 36 40 30 64 C27 78 22 86 18 90" fill="none" stroke="${CAT_FUR}" stroke-width="11" stroke-linecap="round"/>
  <path d="M20 16 l8 -4 M30 34 l8 -2 M32 52 l7 1 M28 70 l6 3" stroke="${CAT_DARK}" stroke-width="4" stroke-linecap="round"/>
  <path d="M22 80 C21 85 19 88 18 90" fill="none" stroke="${CAT_DARK}" stroke-width="11" stroke-linecap="round"/>`);

// ---------- часы, сервант ----------

function clock(): string {
  const x = CLOCK.x - 40;
  return `<g>
    <path d="M${x} 150 Q${x} 108 ${x + 40} 104 Q${x + 80} 108 ${x + 80} 150 V330 Q${x + 40} 344 ${x} 330 Z" fill="${WOOD}" ${ol(4)}/>
    <circle cx="${x + 40}" cy="148" r="30" fill="${CREAM}" ${ol(3.5)}/>
    ${Array.from({ length: 12 }, (_, k) => { const a = (k * Math.PI) / 6; return `<circle cx="${x + 40 + Math.sin(a) * 23}" cy="${148 - Math.cos(a) * 23}" r="2" fill="#3B2418"/>`; }).join('')}
    <path d="M${x + 40} 148 L${x + 40} 128 M${x + 40} 148 L${x + 54} 154" ${ol(3)}/>
    <rect x="${x + 14}" y="190" width="52" height="126" rx="6" fill="#4A2E1A" ${ol(3)}/>
    <rect x="${x + 18}" y="194" width="44" height="118" rx="4" fill="#5C3A22"/>
    <path d="M${x + 20} 196 L${x + 32} 196 L${x + 20} 230 Z" fill="#FFFFFF" opacity="0.12"/></g>`;
}

/** Предметы на полках серванта — разной формы, высоты и цвета. Опора — на полке (y). */
const CRYSTAL = '#DCEAF2';
const shelfItems = {
  decanter: (x: number, y: number) => `<g><path d="M${x - 16} ${y} C${x - 24} ${y - 20} ${x - 20} ${y - 38} ${x - 6} ${y - 46} V${y - 60} H${x + 6} V${y - 46} C${x + 20} ${y - 38} ${x + 24} ${y - 20} ${x + 16} ${y} Z" fill="${CRYSTAL}" opacity="0.9" ${ol(2.2)}/>
    <path d="M${x - 12} ${y - 14} L${x - 4} ${y - 30} M${x - 2} ${y - 8} L${x + 8} ${y - 28} M${x + 8} ${y - 6} L${x + 14} ${y - 18}" stroke="#A9C3D4" stroke-width="1.6"/>
    <path d="M${x - 9} ${y - 22} q9 5 18 0" fill="none" stroke="#C78A2E" stroke-width="3" opacity="0.7"/>
    <ellipse cx="${x}" cy="${y - 64}" rx="7" ry="6" fill="${CRYSTAL}" ${ol(2)}/><path d="M${x - 10} ${y - 36} l5 -6" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round"/></g>`,
  flute: (x: number, y: number) => `<g><path d="M${x - 6} ${y - 58} L${x + 6} ${y - 58} L${x + 4} ${y - 26} L${x + 1.5} ${y - 22} V${y - 4} L${x + 8} ${y} H${x - 8} L${x - 1.5} ${y - 4} V${y - 22} L${x - 4} ${y - 26} Z" fill="${CRYSTAL}" opacity="0.85" ${ol(1.8)}/>
    <path d="M${x - 3} ${y - 54} v22" stroke="#FFFFFF" stroke-width="1.8"/><path d="M${x - 5} ${y - 40} h10" stroke="#E8AB30" stroke-width="1.4"/></g>`,
  goblet: (x: number, y: number) => `<g><path d="M${x - 14} ${y - 44} H${x + 14} C${x + 14} ${y - 26} ${x + 6} ${y - 20} ${x + 2} ${y - 18} V${y - 4} L${x + 10} ${y} H${x - 10} L${x - 2} ${y - 4} V${y - 18} C${x - 6} ${y - 20} ${x - 14} ${y - 26} ${x - 14} ${y - 44} Z" fill="#E3B8C8" opacity="0.85" ${ol(1.8)}/>
    <path d="M${x - 10} ${y - 38} l6 10 l6 -10 l6 10" fill="none" stroke="#B2788E" stroke-width="1.4"/><path d="M${x - 9} ${y - 40} v8" stroke="#FFFFFF" stroke-width="2"/></g>`,
  vase: (x: number, y: number) => `<g><path d="M${x - 10} ${y} L${x - 14} ${y - 10} C${x - 22} ${y - 30} ${x - 10} ${y - 44} ${x - 12} ${y - 56} H${x + 12} C${x + 10} ${y - 44} ${x + 22} ${y - 30} ${x + 14} ${y - 10} L${x + 10} ${y} Z" fill="#7FB3C9" opacity="0.85" ${ol(2)}/>
    <path d="M${x - 12} ${y - 30} l6 -6 l6 6 l6 -6 l6 6 M${x - 10} ${y - 18} l5 -5 l5 5 l5 -5 l5 5" fill="none" stroke="#D9EEF6" stroke-width="1.8"/></g>`,
  sugar: (x: number, y: number) => `<g><path d="M${x - 18} ${y - 22} C${x - 18} ${y - 4} ${x + 18} ${y - 4} ${x + 18} ${y - 22} Z" fill="#F7F1E4" ${ol(2)}/><ellipse cx="${x}" cy="${y - 22}" rx="18" ry="4" fill="#F7F1E4" ${ol(2)}/>
    <path d="M${x - 10} ${y - 30} Q${x} ${y - 38} ${x + 10} ${y - 30}" fill="#F7F1E4" ${ol(2)}/><circle cx="${x}" cy="${y - 36}" r="3.5" fill="${GOLD}" ${ol(1.4)}/>
    <path d="M${x - 14} ${y - 14} q14 6 28 0" fill="none" stroke="#2F6FA8" stroke-width="2.4"/><rect x="${x - 8}" y="${y - 4}" width="16" height="4" fill="#F7F1E4" ${ol(1.6)}/></g>`,
  dog: (x: number, y: number) => `<g><rect x="${x - 16}" y="${y - 6}" width="32" height="6" rx="2" fill="#F7F1E4" ${ol(1.6)}/>
    <path d="M${x - 12} ${y - 6} V${y - 20} C${x - 12} ${y - 30} ${x + 4} ${y - 32} ${x + 8} ${y - 24} L${x + 10} ${y - 6}" fill="#F7F1E4" ${ol(2)}/>
    <circle cx="${x + 8}" cy="${y - 32}" r="8" fill="#F7F1E4" ${ol(2)}/><path d="M${x + 4} ${y - 38} q-6 2 -5 10" fill="#C9A06A" ${ol(1.6)}/>
    <circle cx="${x + 11}" cy="${y - 33}" r="1.4" fill="#3B2418"/><circle cx="${x + 15}" cy="${y - 30}" r="1.6" fill="#3B2418"/><path d="M${x - 2} ${y - 22} q4 -4 8 0" fill="#C9A06A"/></g>`,
  cup: (x: number, y: number) => `<g><ellipse cx="${x}" cy="${y - 2}" rx="18" ry="4" fill="#F7F1E4" ${ol(1.8)}/>
    <path d="M${x - 12} ${y - 22} H${x + 12} L${x + 9} ${y - 5} H${x - 9} Z" fill="#F7F1E4" ${ol(2)}/><path d="M${x + 12} ${y - 18} c8 0 8 10 -1 10" fill="none" ${ol(2)}/>
    <path d="M${x - 11} ${y - 18} h22" stroke="${GOLD}" stroke-width="2"/><circle cx="${x}" cy="${y - 12}" r="3.4" fill="#C5333B"/>
    <path d="M${x - 3} ${y - 12} q3 -5 6 0" fill="#5B9A4E"/></g>`,
  plate: (x: number, y: number, r: number, rim: string, inner: string) => `<g><ellipse cx="${x}" cy="${y - r}" rx="${r}" ry="${r}" fill="#F7F1E4" ${ol(2)}/>
    <circle cx="${x}" cy="${y - r}" r="${r * 0.78}" fill="none" stroke="${rim}" stroke-width="${r * 0.12}"/>${inner}
    <path d="M${x - r * 0.25} ${y} L${x - r * 0.35} ${y + 2} H${x + r * 0.35} L${x + r * 0.25} ${y} Z" fill="${WOOD_D}"/></g>`,
};

/** Портрет пожилой пары: Агата (седой пучок, красные очки) и Матвей (кепка, усы). Опора — на полке. */
function couplePortrait(x: number, y: number): string {
  const w = 62, h = 50, top = y - h;
  return `<g>
    <path d="M${x + 10} ${y} L${x + 18} ${y - 8} M${x + w - 10} ${y} L${x + w - 18} ${y - 8}" ${ol(2)}/>
    <rect x="${x}" y="${top}" width="${w}" height="${h - 4}" rx="4" fill="${GOLD}" ${ol(2.4)}/>
    <rect x="${x + 5}" y="${top + 5}" width="${w - 10}" height="${h - 14}" rx="2" fill="#E9D7B4"/>
    <circle cx="${x + 20}" cy="${top + 14}" r="5" fill="#E6E3EE" ${ol(1.2)}/>
    <circle cx="${x + 20}" cy="${top + 22}" r="8" fill="#F2C6A8" ${ol(1.4)}/>
    <path d="M${x + 12} ${top + 19} q8 -8 16 0" fill="#E6E3EE"/>
    <circle cx="${x + 17}" cy="${top + 22}" r="2.6" fill="none" stroke="#C5333B" stroke-width="1.4"/><circle cx="${x + 23}" cy="${top + 22}" r="2.6" fill="none" stroke="#C5333B" stroke-width="1.4"/>
    <path d="M${x + 9} ${top + h - 9} C${x + 10} ${top + 32} ${x + 30} ${top + 32} ${x + 31} ${top + h - 9} Z" fill="#D59A2A" ${ol(1.2)}/>
    <circle cx="${x + 42}" cy="${top + 22}" r="8" fill="#EBC09E" ${ol(1.4)}/>
    <path d="M${x + 32} ${top + 18} Q${x + 42} ${top + 6} ${x + 52} ${top + 18} Z" fill="#4E6A8A" ${ol(1.2)}/><path d="M${x + 33} ${top + 18} h20" stroke="#3B4F6A" stroke-width="2"/>
    <path d="M${x + 37} ${top + 26} q5 3 10 0" fill="none" stroke="#E6E3EE" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M${x + 31} ${top + h - 9} C${x + 32} ${top + 32} ${x + 52} ${top + 32} ${x + 53} ${top + h - 9} Z" fill="#4E6A8A" ${ol(1.2)}/>
    <path d="M${x + 5} ${top + 5} l12 0 l-12 12 Z" fill="#FFFFFF" opacity="0.25"/></g>`;
}

function sideboard(): string {
  const { x, top, w } = SB;
  const glassTop = top + 18, mid = top + 82, glassBot = top + 146;
  const door = (dx: number) => `<rect x="${x + dx}" y="${glassTop}" width="190" height="${glassBot - glassTop}" rx="4" fill="#5D4A57" ${ol(3)}/>
    <rect x="${x + dx + 4}" y="${glassTop + 4}" width="182" height="${glassBot - glassTop - 8}" rx="2" fill="#7A6875"/>
    <path d="M${x + dx + 4} ${mid} H${x + dx + 186}" stroke="${WOOD_D}" stroke-width="5"/>`;
  const I = shelfItems;
  const upperL = I.decanter(x + 46, mid - 2) + I.flute(x + 84, mid - 2) + I.goblet(x + 116, mid - 2) + I.vase(x + 162, mid - 2);
  const upperR = I.sugar(x + 252, mid - 2) + I.dog(x + 300, mid - 2) + I.flute(x + 338, mid - 2) + I.goblet(x + 374, mid - 2);
  const lowerL = couplePortrait(x + 26, glassBot - 6) + I.cup(x + 120, glassBot - 6) +
    I.plate(x + 168, glassBot - 6, 22, '#2F6FA8', `<circle cx="${x + 168}" cy="${glassBot - 28}" r="6" fill="#2F6FA8" opacity="0.7"/>`);
  const lowerR = I.plate(x + 254, glassBot - 6, 26, GOLD, `<circle cx="${x + 254}" cy="${glassBot - 32}" r="9" fill="#C5333B"/><path d="M${x + 247} ${glassBot - 26} q7 -4 14 0" stroke="#5B9A4E" stroke-width="2.4" fill="none"/>`) +
    I.plate(x + 312, glassBot - 6, 20, '#5B9A4E', `<path d="M${x + 302} ${glassBot - 26} q10 -10 20 0" stroke="#5B9A4E" stroke-width="2" fill="none"/>`) + I.cup(x + 368, glassBot - 6);
  const glare = (dx: number) => `<path d="M${x + dx + 10} ${glassTop + 6} L${x + dx + 44} ${glassTop + 6} L${x + dx + 10} ${glassTop + 56} Z" fill="#FFFFFF" opacity="0.1"/>`;
  return `<g>
    <rect x="${x}" y="${top}" width="${w}" height="${FLOOR_Y - 8 - top}" rx="6" fill="${WOOD}" ${ol(5)}/>
    <rect x="${x - 10}" y="${top - 8}" width="${w + 20}" height="16" rx="6" fill="${WOOD_D}" ${ol(3.5)}/>
    ${door(16)}${door(214)}${upperL}${upperR}${lowerL}${lowerR}${glare(16)}${glare(214)}
    ${[16, 214].map((dx) => `<rect x="${x + dx}" y="${glassBot + 8}" width="190" height="${FLOOR_Y - 22 - glassBot - 8}" rx="4" fill="${WOOD_D}" opacity="0.55" ${ol(2.4)}/><circle cx="${x + dx + (dx === 16 ? 176 : 14)}" cy="${glassBot + 34}" r="4.5" fill="${GOLD}" ${ol(1.6)}/>`).join('')}
    <path d="M${x + 12} ${FLOOR_Y - 8} l-4 14 h16 l-2 -14 M${x + w - 12} ${FLOOR_Y - 8} l4 14 h-16 l2 -14" fill="${WOOD_D}" ${ol(2.6)}/></g>`;
}

function teapot(): string {
  const x = TEAPOT.x;
  // Фарфоровый чайник на кружевной салфетке; носик — на (TEAPOT.spoutX, TEAPOT.spoutY).
  const lace = Array.from({ length: 9 }, (_, k) => `<circle cx="${x - 40 + k * 10}" cy="${SB.top - 6}" r="4.5" fill="none" stroke="${CREAM}" stroke-width="2"/>`).join('');
  return `<g>
    <path d="M${x - 46} ${SB.top - 8} Q${x} ${SB.top - 20} ${x + 46} ${SB.top - 8} Q${x} ${SB.top - 2} ${x - 46} ${SB.top - 8} Z" fill="${CREAM}" ${ol(2)}/>${lace}
    <path d="M${x - 30} ${SB.top - 10} C${x - 36} ${SB.top - 46} ${x - 12} ${SB.top - 60} ${x + 4} ${SB.top - 60} C${x + 20} ${SB.top - 60} ${x + 44} ${SB.top - 46} ${x + 38} ${SB.top - 10} Z" fill="#F1E6D2" ${ol(3.5)}/>
    <path d="M${x + 34} ${SB.top - 30} C${x + 44} ${SB.top - 32} ${x + 44} ${SB.top - 40} ${TEAPOT.spoutX} ${TEAPOT.spoutY + 4}" fill="none" stroke="#F1E6D2" stroke-width="8" stroke-linecap="round"/>
    <path d="M${x + 34} ${SB.top - 30} C${x + 44} ${SB.top - 32} ${x + 44} ${SB.top - 40} ${TEAPOT.spoutX} ${TEAPOT.spoutY + 4}" fill="none" ${ol(2.6)}/>
    <path d="M${x - 28} ${SB.top - 42} C${x - 46} ${SB.top - 42} ${x - 46} ${SB.top - 18} ${x - 28} ${SB.top - 18}" fill="none" ${ol(3)}/>
    <ellipse cx="${x + 4}" cy="${SB.top - 60}" rx="14" ry="5" fill="#F1E6D2" ${ol(2.5)}/><circle cx="${x + 4}" cy="${SB.top - 67}" r="4" fill="#2F6FA8" ${ol(2)}/>
    <path d="M${x - 20} ${SB.top - 34} Q${x + 4} ${SB.top - 24} ${x + 28} ${SB.top - 34}" fill="none" stroke="#2F6FA8" stroke-width="3"/>
    <circle cx="${x + 4}" cy="${SB.top - 26}" r="5" fill="#C5333B"/></g>`;
}

// ---------- советский ковёр ----------

const RUG_RED = '#8E1F2A', RUG_RED_D = '#6E1520', RUG_GREEN = '#24503E', RUG_OCHRE = '#D49A35', RUG_CREAM = '#F1E2C2';

/** Ромб-«гёль» бордюра: центр (x, y), полуразмеры a × b. */
const gul = (x: number, y: number, a: number, b: number): string =>
  `<path d="M${x} ${y - b} L${x + a} ${y} L${x} ${y + b} L${x - a} ${y} Z" fill="${RUG_OCHRE}" stroke="${RUG_RED_D}" stroke-width="1.6"/>
  <path d="M${x} ${y - b * 0.55} L${x + a * 0.55} ${y} L${x} ${y + b * 0.55} L${x - a * 0.55} ${y} Z" fill="${RUG_CREAM}"/>
  <path d="M${x} ${y - b * 0.25} L${x + a * 0.25} ${y} L${x} ${y + b * 0.25} L${x - a * 0.25} ${y} Z" fill="${RUG_RED}"/>`;

/** Ступенчатый восьмиугольник медальона (центр, полуширина, полувысота, ступень). */
const stepOct = (cx: number, cy: number, a: number, b: number, s: number, fill: string, stroke = RUG_RED_D): string =>
  `<path d="M${cx - a + s} ${cy - b} H${cx + a - s} V${cy - b + s} H${cx + a} V${cy + b - s} H${cx + a - s} V${cy + b} H${cx - a + s} V${cy + b - s} H${cx - a} V${cy - b + s} H${cx - a + s} Z" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;

/** Восьмилепестковая розетка. */
const rosette = (cx: number, cy: number, r: number, petal: string, core: string): string =>
  Array.from({ length: 8 }, (_, k) => `<ellipse cx="${cx}" cy="${cy - r * 0.6}" rx="${r * 0.22}" ry="${r * 0.42}" fill="${petal}" stroke="${RUG_RED_D}" stroke-width="1.2" transform="rotate(${k * 45} ${cx} ${cy})"/>`).join('') +
  `<circle cx="${cx}" cy="${cy}" r="${r * 0.3}" fill="${core}" stroke="${RUG_RED_D}" stroke-width="1.4"/><circle cx="${cx}" cy="${cy}" r="${r * 0.12}" fill="${RUG_CREAM}"/>`;

function sovietRug(): string {
  const { x, y, w, h } = RUG;
  const cx = x + w / 2, cy = y + h / 2;
  const B = 40; // ширина бордюра
  // Бордюр: зелёная полоса с ромбами-«гёлями» и мелкими крестиками между ними, по всем сторонам симметрично.
  let border = '';
  const nx = 10, ny = 6;
  for (let i = 0; i < nx; i++) {
    const gx = x + B + 6 + ((w - 2 * B - 12) * (i + 0.5)) / nx;
    border += gul(gx, y + B / 2 + 2, 15, 13) + gul(gx, y + h - B / 2 - 2, 15, 13);
    if (i < nx - 1) {
      const kx = x + B + 6 + ((w - 2 * B - 12) * (i + 1)) / nx;
      border += [y + B / 2 + 2, y + h - B / 2 - 2].map((ky) => `<path d="M${kx - 5} ${ky} H${kx + 5} M${kx} ${ky - 5} V${ky + 5}" stroke="${RUG_CREAM}" stroke-width="2.4"/>`).join('');
    }
  }
  for (let j = 0; j < ny; j++) {
    const gy = y + B + 4 + ((h - 2 * B - 8) * (j + 0.5)) / ny;
    border += gul(x + B / 2 + 2, gy, 13, 15) + gul(x + w - B / 2 - 2, gy, 13, 15);
  }
  // Угловые розетки бордюра.
  border += [[x + B / 2 + 2, y + B / 2 + 2], [x + w - B / 2 - 2, y + B / 2 + 2], [x + B / 2 + 2, y + h - B / 2 - 2], [x + w - B / 2 - 2, y + h - B / 2 - 2]].map(([rx, ry]) => rosette(rx!, ry!, 18, RUG_OCHRE, RUG_RED)).join('');
  const fx0 = x + B + 10, fy0 = y + B + 10, fw = w - 2 * B - 20, fh = h - 2 * B - 20;
  // Угловые четверти медальона (зелёные с охрой) — зеркально в четырёх углах поля.
  const corner = (sx: number, sy: number) => {
    const ox = sx > 0 ? fx0 : fx0 + fw, oy = sy > 0 ? fy0 : fy0 + fh;
    return `<g transform="translate(${ox} ${oy}) scale(${sx} ${sy})">
      <path d="M0 0 H86 L86 14 L60 14 L60 30 L30 30 L30 60 L14 60 L14 86 L0 86 Z" fill="${RUG_GREEN}" stroke="${RUG_OCHRE}" stroke-width="2.4"/>
      <path d="M0 0 H50 L50 10 L34 10 L34 34 L10 34 L10 50 L0 50 Z" fill="${RUG_OCHRE}" stroke="${RUG_RED_D}" stroke-width="1.4"/>
      <circle cx="18" cy="18" r="7" fill="${RUG_CREAM}" stroke="${RUG_RED_D}" stroke-width="1.4"/></g>`;
  };
  // Мелкий узор поля: ромбики и «ёлочки» симметрично относительно центра.
  let field = '';
  for (const [dx, dy] of [[0.18, 0.3], [0.32, 0.18], [0.3, 0.42], [0.42, 0.32]]) {
    for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const px = cx + sx! * dx! * fw, py = cy + sy! * dy! * fh;
      field += `<path d="M${px} ${py - 9} L${px + 7} ${py} L${px} ${py + 9} L${px - 7} ${py} Z" fill="${RUG_GREEN}" stroke="${RUG_OCHRE}" stroke-width="1.4"/><circle cx="${px}" cy="${py}" r="2" fill="${RUG_CREAM}"/>`;
    }
  }
  for (const sx of [1, -1]) {
    const px = cx + sx * fw * 0.44;
    field += `<path d="M${px} ${cy - 40} V${cy + 40} ${[-30, -15, 0, 15, 30].map((d) => `M${px} ${cy + d} l${-sx * 10} -8 M${px} ${cy + d} l${sx * 10} -8`).join(' ')}" stroke="${RUG_OCHRE}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
  }
  // Центральный медальон: ступенчатые восьмиугольники, звезда, розетка; подвески сверху и снизу.
  const pend = (sy: number) => `<g transform="translate(${cx} ${cy}) scale(1 ${sy})">
    <path d="M-16 -${fh * 0.33} H16 V-${fh * 0.33 + 14} H8 V-${fh * 0.33 + 24} H-8 V-${fh * 0.33 + 14} H-16 Z" fill="${RUG_GREEN}" stroke="${RUG_OCHRE}" stroke-width="2"/>
    <path d="M0 -${fh * 0.33 + 4} l6 -6 l-6 -6 l-6 6 Z" fill="${RUG_CREAM}"/></g>`;
  const star = Array.from({ length: 8 }, (_, k) => `<path d="M${cx} ${cy - 46} L${cx + 9} ${cy - 20} L${cx - 9} ${cy - 20} Z" fill="${RUG_OCHRE}" stroke="${RUG_RED_D}" stroke-width="1.2" transform="rotate(${k * 45} ${cx} ${cy})"/>`).join('');
  const medallion = pend(1) + pend(-1) +
    stepOct(cx, cy, 118, fh * 0.33, 26, RUG_GREEN, RUG_OCHRE) +
    stepOct(cx, cy, 100, fh * 0.33 - 14, 22, RUG_RED, RUG_OCHRE) +
    stepOct(cx, cy, 74, fh * 0.33 - 34, 18, RUG_CREAM, RUG_RED_D) +
    `<path d="M${cx} ${cy - 60} L${cx + 64} ${cy} L${cx} ${cy + 60} L${cx - 64} ${cy} Z" fill="${RUG_GREEN}" stroke="${RUG_RED_D}" stroke-width="2"/>` +
    star + rosette(cx, cy, 30, RUG_CREAM, RUG_RED) +
    [[-1, 0], [1, 0]].map(([sx]) => `<path d="M${cx + sx! * 82} ${cy} l${sx! * 10} -10 l${sx! * 10} 10 l${-sx! * 10} 10 Z" fill="${RUG_OCHRE}" stroke="${RUG_RED_D}" stroke-width="1.4"/>`).join('');
  // Бахрома по нижнему краю: кисточки с узелками.
  const tassels = Array.from({ length: 49 }, (_, k) => {
    const tx = x + 10 + ((w - 20) * k) / 48;
    return `<path d="M${tx} ${y + h} V${y + h + 18}" stroke="#3B2418" stroke-width="5.4" stroke-linecap="round"/><path d="M${tx} ${y + h} V${y + h + 18}" stroke="${RUG_CREAM}" stroke-width="3" stroke-linecap="round"/><circle cx="${tx}" cy="${y + h + 5}" r="2.6" fill="${RUG_RED}" stroke="#3B2418" stroke-width="1.2"/>`;
  }).join('');
  return `<g>
    <rect x="${x + 6}" y="${y + 8}" width="${w}" height="${h}" fill="#3B2418" opacity="0.18"/>
    ${tassels}
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${RUG_GREEN}" stroke="#3B2418" stroke-width="3.5"/>
    <rect x="${x + 5}" y="${y + 5}" width="${w - 10}" height="${h - 10}" fill="none" stroke="${RUG_CREAM}" stroke-width="2.4"/>
    ${border}
    <rect x="${x + B}" y="${y + B}" width="${w - 2 * B}" height="${h - 2 * B}" fill="${RUG_OCHRE}" stroke="${RUG_RED_D}" stroke-width="2"/>
    <rect x="${x + B + 5}" y="${y + B + 5}" width="${w - 2 * B - 10}" height="${h - 2 * B - 10}" fill="${RUG_CREAM}"/>
    <rect x="${fx0}" y="${fy0}" width="${fw}" height="${fh}" fill="${RUG_RED}" stroke="${RUG_RED_D}" stroke-width="2"/>
    ${corner(1, 1)}${corner(-1, 1)}${corner(1, -1)}${corner(-1, -1)}
    ${field}${medallion}</g>`;
}

// ---------- прочее ----------

function floorLamp(x: number): string {
  return `<g><path d="M${x} 230 V${FLOOR_Y}" ${ol(5)}/><path d="M${x} 230 V${FLOOR_Y}" stroke="#C9A24A" stroke-width="3"/>
    <ellipse cx="${x}" cy="${FLOOR_Y + 2}" rx="34" ry="8" fill="#5A3A22" ${ol(3)}/>
    <path d="M${x - 70} 232 L${x - 44} 150 L${x + 44} 150 L${x + 70} 232 Z" fill="#F2D49B" ${ol(4)}/>
    <path d="M${x - 70} 232 Q${x} 246 ${x + 70} 232" fill="none" stroke="#C5333B" stroke-width="6"/></g>`;
}

const photoFace = (bg: string, coat: string) => `<rect width="100" height="100" fill="${bg}"/><circle cx="50" cy="40" r="17" fill="#E9C6A8"/><path d="M20 100 C22 70 78 70 80 100 Z" fill="${coat}"/>`;

function background(): string {
  const defs = `
    <pattern id="agPaper" width="70" height="70" patternUnits="userSpaceOnUse">
      <rect width="70" height="70" fill="#F1D9C6"/>
      <circle cx="17" cy="17" r="5" fill="#E2A7A2" opacity="0.7"/><circle cx="52" cy="52" r="5" fill="#E2A7A2" opacity="0.7"/>
      <path d="M12 24 q5 -4 10 0 M47 59 q5 -4 10 0" stroke="#9FB48C" stroke-width="2.4" fill="none" opacity="0.7"/>
    </pattern>
    <linearGradient id="agShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5B3A2A" stop-opacity="0.18"/><stop offset="0.5" stop-color="#5B3A2A" stop-opacity="0"/></linearGradient>
    <linearGradient id="agSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4E5A82"/><stop offset="1" stop-color="#9C8EA4"/></linearGradient>
    ${glowDef('agWarm', '#FFE2A8', 0.5)}${floorDefs}`;
  const { x, y, w, h } = WIN;
  return roomDoc(defs, `
  <rect width="2400" height="${FLOOR_Y}" fill="url(#agPaper)"/>
  <rect width="2400" height="${FLOOR_Y}" fill="url(#agShade)"/>
  ${floorSvg()}
  ${glow('agWarm', 300, 260, 340, 260)}${glow('agWarm', 1200, 200, 520, 300)}
  ${floorLamp(300)}
  ${frame(110, 120, 120, 150, WOOD, photoFace('#C9B79A', '#5A6A8A'))}
  ${frame(160, 300, 90, 80, '#C9A24A', photoFace('#B9C4A8', '#8E2632'))}
  <g><rect x="${x - 8}" y="${y - 8}" width="${w + 16}" height="${h + 16}" rx="8" fill="${CREAM}" ${ol(4)}/>${windowGlass()}${windowFrame(0, 0)}</g>
  ${sillAndRadiator()}
  ${catBody()}${roses()}
  ${clock()}
  ${sovietRug()}
  ${scoreSlate(WOOD)}
  ${sideboard()}${teapot()}
  ${frame(1990, 120, 130, 160, WOOD, photoFace('#D4C2A0', '#3E6E5A'))}
  ${frame(2150, 150, 110, 100, '#C9A24A', '<rect width="100" height="100" fill="#AFC6D8"/><path d="M0 80 L30 50 L55 72 L75 56 L100 80 V100 H0 Z" fill="#6E9A62"/><circle cx="76" cy="26" r="9" fill="#F4C542"/>')}
  ${frame(2150, 270, 110, 90, WOOD, photoFace('#E3CFB0', '#C5333B'))}
  <g><path d="M2310 ${FLOOR_Y - 34} C2280 360 2260 290 2300 230 M2310 ${FLOOR_Y - 34} C2330 350 2360 290 2340 220" fill="none" stroke="#3E6E3A" stroke-width="6"/>
    ${[[2290, 260], [2350, 250], [2272, 320], [2360, 320], [2300, 360], [2340, 380]].map(([lx, ly]) => `<ellipse cx="${lx}" cy="${ly}" rx="26" ry="14" fill="#5B9A4E" ${ol(2.5)} transform="rotate(${lx! > 2310 ? 30 : -30} ${lx} ${ly})"/>`).join('')}
    <path d="M2272 ${FLOOR_Y + 6} L2280 ${FLOOR_Y - 36} L2348 ${FLOOR_Y - 36} L2356 ${FLOOR_Y + 6} Z" fill="#C2774A" ${ol(3)}/></g>
  `);
}

// Морось: мелкие капли по всему стеклу (без полос), появляются и тают, чуть сползают.
const DRIZZLE = 46;

export const AGATA_ROOM: RoomArt = {
  id: 'agata',
  name: 'Гостиная с сервантом',
  backgroundSvg: background,
  props: [
    {
      key: 'drizzle',
      box: { x: WIN.x + 4, y: WIN.y + 4, w: 4, h: 6 },
      svg: propSvg(4, 6, '<ellipse cx="2" cy="3.2" rx="1.6" ry="2.4" fill="#E4ECF6"/><circle cx="1.5" cy="2.6" r="0.6" fill="#FFFFFF"/>'),
      count: DRIZZLE,
      particle: true,
      period: 6,
      reach: WIN.w,
      motion: (t, i) => {
        // Период копии — целая доля общего (6 с): цикл слоя замыкается.
        const per = 6 / (1 + (i % 3));
        const u = cycle(t, per, hash01(i, 1));
        // Новое место на каждом круге — морось «сеется» по всему стеклу.
        const laps = 1 + (i % 3);
        const lap = Math.floor(t / per + hash01(i, 1));
        const j = i * 7 + (((lap % laps) + laps) % laps);
        return { dx: 6 + hash01(j, 2) * (WIN.w - 20), dy: 4 + hash01(j, 3) * (WIN.h - 26) + u * 10, alpha: hump(u) * (0.35 + 0.35 * hash01(j, 4)) };
      },
    },
    // Переплёт поверх мороси.
    { key: 'mullion', box: { x: WIN.x - 8, y: WIN.y - 8, w: WIN.w + 16, h: WIN.h + 16 }, svg: propSvg(WIN.w + 16, WIN.h + 16, windowFrame(WIN.x - 8, WIN.y - 8)) },
    // Кошка: хвост, свисающий с подоконника, покачивается и подёргивает кончиком.
    {
      key: 'catTail',
      box: { x: TAIL.x, y: TAIL.y, w: TAIL.w, h: TAIL.h },
      pivot: { x: TAIL.px, y: TAIL.py },
      svg: catTail(),
      period: 3.6,
      motion: (t) => ({ rot: wave(t, 3.6, 0.09) + wave(t, 1.8, 0.03, 0.6) }),
    },
    // Ухо иногда вздрагивает.
    {
      key: 'catEar',
      box: { x: EAR.x, y: EAR.y, w: EAR.w, h: EAR.h },
      pivot: { x: EAR.px, y: EAR.py },
      svg: catEar(),
      period: 5.3,
      motion: (t) => {
        const u = cycle(t, 5.3, 0.3);
        return { rot: u < 0.1 ? -0.22 * Math.sin((Math.PI * u) / 0.1) : 0 };
      },
    },
    // Моргание: веки на миг закрывают глаза.
    {
      key: 'catLids',
      box: { x: LIDS.x, y: LIDS.y, w: LIDS.w, h: LIDS.h },
      svg: catLids(),
      period: 4.9,
      motion: (t) => {
        const u = cycle(t, 4.9, 0.5);
        return { alpha: u < 0.05 ? Math.sin((Math.PI * u) / 0.05) : 0 };
      },
    },
    // Маятник часов: ±4°, период 2,4 с.
    {
      key: 'pendulum',
      box: { x: CLOCK.x - 10, y: 194, w: 20, h: 110 },
      pivot: { x: CLOCK.x, y: 198 },
      svg: propSvg(20, 110, '<path d="M10 4 V86" stroke="#C9A24A" stroke-width="3"/><circle cx="10" cy="4" r="3" fill="#C9A24A"/><circle cx="10" cy="94" r="10" fill="#E8AB30" stroke="#3B2418" stroke-width="2.5"/><circle cx="7" cy="91" r="3" fill="#FFF1C9"/>'),
      period: 2.4,
      motion: (t) => ({ rot: wave(t, 2.4, 0.07) }),
    },
    // Пар над носиком чайника.
    {
      key: 'steam',
      box: { x: TEAPOT.spoutX - 13, y: TEAPOT.spoutY - 22, w: 26, h: 26 },
      pivot: { x: TEAPOT.spoutX, y: TEAPOT.spoutY },
      svg: propSvg(26, 26, '<circle cx="13" cy="13" r="10" fill="#FFFFFF" opacity="0.55"/>'),
      count: 3,
      particle: true,
      period: 4.3,
      reach: 80,
      motion: (t, i) => {
        const u = cycle(t, 4.3, i / 3);
        return { dy: -u * 66, dx: 6 + wave(u, 1, 6, i), sx: 0.6 + u * 0.9, sy: 0.6 + u * 0.9, alpha: hump(u) * 0.75 };
      },
    },
    // Шторы висят свободно и едва колышутся, у каждой свой период.
    {
      key: 'curtainL',
      box: { x: WIN.x - 44, y: WIN.y - 22, w: CURTAIN.w, h: CURTAIN.h },
      pivot: { x: WIN.x - 2, y: WIN.y - 20 },
      svg: curtain(1),
      period: 7.3,
      motion: (t) => ({ rot: wave(t, 7.3, 0.012), sx: 1 + wave(t, 7.3, 0.012, 1.2) }),
    },
    {
      key: 'curtainR',
      box: { x: WIN.x + WIN.w - 40, y: WIN.y - 22, w: CURTAIN.w, h: CURTAIN.h },
      pivot: { x: WIN.x + WIN.w + 2, y: WIN.y - 20 },
      svg: curtain(-1),
      period: 8.9,
      motion: (t) => ({ rot: wave(t, 8.9, -0.01, 0.8), sx: 1 + wave(t, 8.9, 0.01, 2) }),
    },
    // Карниз — поверх верхнего края штор.
    { key: 'rod', box: { x: WIN.x - 70, y: WIN.y - 34, w: WIN.w + 140, h: 20 }, svg: propSvg(WIN.w + 140, 20, `<rect x="6" y="4" width="${WIN.w + 128}" height="12" rx="6" fill="${WOOD}" ${ol(3)}/><circle cx="8" cy="10" r="7" fill="#C9A24A" ${ol(2.5)}/><circle cx="${WIN.w + 132}" cy="10" r="7" fill="#C9A24A" ${ol(2.5)}/>`) },
  ],
};
