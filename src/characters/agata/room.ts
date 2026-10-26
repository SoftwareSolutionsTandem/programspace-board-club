// Комната Агаты — «Гостиная с сервантом» (docs/ART_STYLE.md §12): обои в мелкий цветочек, советский ковёр на стене
// за Агатой, сервант с хрусталём, фарфором и портретом Агаты с Матвеем, часы с маятником, торшер, батарея под окном,
// дощатый пол. На подоконнике — розы, за окном — морось.
// Живое: шторы, маятник, морось. Модуль строит SVG-строки и не зависит от DOM.
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
// Часы с маятником.
const CLOCK = { x: 878 };
const TEAPOT = { x: 1822 };

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

const ROSE_X = WIN.x + WIN.w - 130, ROSE_BASE = SILL_Y - 4;
// Область рисунка роз (единицы фона): горшок на подоконнике и бутоны над ним.
const ROSES = { x: ROSE_X - 12, y: ROSE_BASE - 176, w: 92, h: 180 };
function roses(): string {
  const px = ROSE_X, base = ROSE_BASE;
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
/** Масштаб предмета вокруг его опоры (x, y): чтобы высокие вещи помещались на полке. */
const scaled = (x: number, y: number, k: number, inner: string): string => `<g transform="translate(${x} ${y}) scale(${k}) translate(${-x} ${-y})">${inner}</g>`;
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
  // Фарфоровый молочник: ручка, тулово с носиком и ножка — одним цельным предметом.
  jug: (x: number, y: number) => `<g>
    <path d="M${x - 12} ${y - 36} C${x - 26} ${y - 36} ${x - 26} ${y - 14} ${x - 12} ${y - 14}" fill="none" stroke="#3B2418" stroke-width="7.6" stroke-linecap="round"/>
    <path d="M${x - 12} ${y - 36} C${x - 26} ${y - 36} ${x - 26} ${y - 14} ${x - 12} ${y - 14}" fill="none" stroke="#F7F1E4" stroke-width="3.6" stroke-linecap="round"/>
    <path d="M${x - 9} ${y} L${x - 8} ${y - 4} C${x - 18} ${y - 12} ${x - 18} ${y - 28} ${x - 10} ${y - 36} L${x - 11} ${y - 42} L${x + 6} ${y - 42} L${x + 15} ${y - 47} L${x + 11} ${y - 38} C${x + 18} ${y - 28} ${x + 18} ${y - 12} ${x + 8} ${y - 4} L${x + 9} ${y} Z" fill="#F7F1E4" ${ol(2)}/>
    <path d="M${x - 15} ${y - 18} Q${x} ${y - 13} ${x + 15} ${y - 18}" fill="none" stroke="#2F6FA8" stroke-width="2.4"/>
    <circle cx="${x + 1}" cy="${y - 26}" r="3.4" fill="#C5333B"/><path d="M${x - 3} ${y - 26} q4 -5 8 0" fill="#5B9A4E"/>
    <path d="M${x - 9} ${y - 33} q-3 8 0 16" stroke="#FFFFFF" stroke-width="2" fill="none" opacity="0.8" stroke-linecap="round"/></g>`,
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
  // Полка — 58 единиц высотой: графин и фужеры уменьшены, чтобы стоять внутри, не касаясь верха.
  const upperL = scaled(x + 46, mid - 2, 0.74, I.decanter(x + 46, mid - 2)) + scaled(x + 84, mid - 2, 0.88, I.flute(x + 84, mid - 2)) + I.goblet(x + 116, mid - 2) + scaled(x + 162, mid - 2, 0.92, I.vase(x + 162, mid - 2));
  const upperR = I.jug(x + 252, mid - 2) + I.dog(x + 300, mid - 2) + scaled(x + 338, mid - 2, 0.88, I.flute(x + 338, mid - 2)) + I.goblet(x + 374, mid - 2);
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
  const x = TEAPOT.x, t = SB.top;
  // Фарфоровый заварочный чайник на кружевной салфетке: носик, ручка, крышка с шишечкой.
  const lace = Array.from({ length: 9 }, (_, k) => `<circle cx="${x - 40 + k * 10}" cy="${t - 6}" r="4.5" fill="none" stroke="${CREAM}" stroke-width="2"/>`).join('');
  return `<g>
    <path d="M${x - 46} ${t - 8} Q${x} ${t - 20} ${x + 46} ${t - 8} Q${x} ${t - 2} ${x - 46} ${t - 8} Z" fill="${CREAM}" ${ol(2)}/>${lace}
    <path d="M${x + 26} ${t - 34} C${x + 40} ${t - 36} ${x + 46} ${t - 44} ${x + 52} ${t - 56} L${x + 60} ${t - 56} C${x + 56} ${t - 40} ${x + 48} ${t - 22} ${x + 30} ${t - 16} Z" fill="#F1E6D2" ${ol(3)}/>
    <path d="M${x + 51} ${t - 56} L${x + 61} ${t - 56}" ${ol(3.4)}/>
    <path d="M${x - 28} ${t - 42} C${x - 48} ${t - 42} ${x - 48} ${t - 18} ${x - 28} ${t - 18}" fill="none" stroke="#3B2418" stroke-width="9" stroke-linecap="round"/>
    <path d="M${x - 28} ${t - 42} C${x - 48} ${t - 42} ${x - 48} ${t - 18} ${x - 28} ${t - 18}" fill="none" stroke="#F1E6D2" stroke-width="4.4" stroke-linecap="round"/>
    <path d="M${x - 30} ${t - 10} C${x - 36} ${t - 46} ${x - 12} ${t - 60} ${x + 4} ${t - 60} C${x + 20} ${t - 60} ${x + 44} ${t - 46} ${x + 38} ${t - 10} Z" fill="#F1E6D2" ${ol(3.5)}/>
    <ellipse cx="${x + 4}" cy="${t - 60}" rx="16" ry="5" fill="#F1E6D2" ${ol(2.5)}/><circle cx="${x + 4}" cy="${t - 67}" r="4" fill="#2F6FA8" ${ol(2)}/>
    <path d="M${x - 20} ${t - 34} Q${x + 4} ${t - 24} ${x + 28} ${t - 34}" fill="none" stroke="#2F6FA8" stroke-width="3"/>
    <circle cx="${x + 4}" cy="${t - 26}" r="5" fill="#C5333B"/><path d="M${x - 1} ${t - 26} q5 -6 10 0" fill="#5B9A4E"/>
    <path d="M${x - 22} ${t - 46} q-4 12 -2 24" stroke="#FFFFFF" stroke-width="2.6" fill="none" opacity="0.7" stroke-linecap="round"/></g>`;
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

/** Восьмиконечная звёздочка. */
const star8 = (cx: number, cy: number, r: number, fill: string): string =>
  `<path d="${Array.from({ length: 16 }, (_, k) => { const a = (k * Math.PI) / 8, rr = k % 2 ? r * 0.45 : r; return `${k ? 'L' : 'M'}${(cx + Math.sin(a) * rr).toFixed(1)} ${(cy - Math.cos(a) * rr).toFixed(1)}`; }).join(' ')} Z" fill="${fill}" stroke="${RUG_RED_D}" stroke-width="1"/>`;

/** «Бараньи рога» — парный завиток, частый мотив советских ковров. */
const horns = (cx: number, cy: number, s: number, color: string): string =>
  `<path d="M${cx} ${cy + s} V${cy - s * 0.2} M${cx} ${cy - s * 0.2} C${cx - s * 0.2} ${cy - s} ${cx - s} ${cy - s} ${cx - s} ${cy - s * 0.3} C${cx - s} ${cy + s * 0.1} ${cx - s * 0.5} ${cy + s * 0.2} ${cx - s * 0.4} ${cy - s * 0.2} M${cx} ${cy - s * 0.2} C${cx + s * 0.2} ${cy - s} ${cx + s} ${cy - s} ${cx + s} ${cy - s * 0.3} C${cx + s} ${cy + s * 0.1} ${cx + s * 0.5} ${cy + s * 0.2} ${cx + s * 0.4} ${cy - s * 0.2}" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round"/>`;

/** Полоса «бегущей волны» вдоль прямоугольника (x, y, w, h). */
function waveBand(x: number, y: number, w: number, h: number, step: number, amp: number): string {
  const side = (x0: number, y0: number, dx: number, dy: number, len: number) => {
    const n = Math.max(2, Math.round(len / step));
    let d = `M${x0} ${y0}`;
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 0.5) / n, t2 = (i + 1) / n;
      const nx = -dy, ny = dx;
      d += ` Q${(x0 + dx * len * t0 + nx * amp * 0).toFixed(1)} ${(y0 + dy * len * t0).toFixed(1)} ${(x0 + dx * len * t1 + nx * amp).toFixed(1)} ${(y0 + dy * len * t1 + ny * amp).toFixed(1)} T${(x0 + dx * len * t2).toFixed(1)} ${(y0 + dy * len * t2).toFixed(1)}`;
    }
    return d;
  };
  return `<path d="${side(x, y, 1, 0, w)} ${side(x + w, y + h, -1, 0, w)} ${side(x, y + h, 0, -1, h)} ${side(x + w, y, 0, 1, h)}" fill="none" stroke="${RUG_RED}" stroke-width="2.2"/>`;
}

/** Зубчатая кромка: треугольники вдоль всех сторон (x, y, w, h), острием внутрь. */
function sawEdge(x: number, y: number, w: number, h: number, t: number, fill: string): string {
  let d = '';
  const nx = Math.round(w / (t * 1.6)), ny = Math.round(h / (t * 1.6));
  for (let i = 0; i < nx; i++) {
    const a = x + (w * i) / nx, b = x + (w * (i + 1)) / nx, m = (a + b) / 2;
    d += `M${a} ${y} L${m} ${y + t} L${b} ${y} Z M${a} ${y + h} L${m} ${y + h - t} L${b} ${y + h} Z `;
  }
  for (let j = 0; j < ny; j++) {
    const a = y + (h * j) / ny, b = y + (h * (j + 1)) / ny, m = (a + b) / 2;
    d += `M${x} ${a} L${x + t} ${m} L${x} ${b} Z M${x + w} ${a} L${x + w - t} ${m} L${x + w} ${b} Z `;
  }
  return `<path d="${d}" fill="${fill}"/>`;
}

function sovietRug(): string {
  const { x, y, w, h } = RUG;
  const cx = x + w / 2, cy = y + h / 2;
  const E = 9; // зубчатая кромка
  const B = 38; // бордюр
  const b0 = x + E, b1 = y + E, bw = w - 2 * E, bh = h - 2 * E;
  // Бордюр: ромбы-«гёли», между ними восьмиконечные звёздочки; по краям — тонкие охристые линии с точками.
  let border = '';
  const nx = 9, ny = 5;
  const topY = b1 + B / 2, botY = b1 + bh - B / 2, lX = b0 + B / 2, rX = b0 + bw - B / 2;
  for (let i = 0; i < nx; i++) {
    const gx = b0 + B + ((bw - 2 * B) * (i + 0.5)) / nx;
    border += gul(gx, topY, 14, 12) + gul(gx, botY, 14, 12);
    if (i < nx - 1) {
      const kx = b0 + B + ((bw - 2 * B) * (i + 1)) / nx;
      border += star8(kx, topY, 6, RUG_CREAM) + star8(kx, botY, 6, RUG_CREAM);
    }
  }
  for (let j = 0; j < ny; j++) {
    const gy = b1 + B + ((bh - 2 * B) * (j + 0.5)) / ny;
    border += gul(lX, gy, 12, 14) + gul(rX, gy, 12, 14);
    if (j < ny - 1) {
      const ky = b1 + B + ((bh - 2 * B) * (j + 1)) / ny;
      border += star8(lX, ky, 6, RUG_CREAM) + star8(rX, ky, 6, RUG_CREAM);
    }
  }
  border += [[lX, topY], [rX, topY], [lX, botY], [rX, botY]].map(([rx, ry]) => rosette(rx!, ry!, 17, RUG_OCHRE, RUG_RED)).join('');
  const dots = (x0: number, y0: number, ww: number, hh: number) => {
    let d = '';
    for (let i = 0; i <= Math.round(ww / 9); i++) d += `<circle cx="${x0 + (ww * i) / Math.round(ww / 9)}" cy="${y0}" r="1.3"/><circle cx="${x0 + (ww * i) / Math.round(ww / 9)}" cy="${y0 + hh}" r="1.3"/>`;
    for (let j = 1; j < Math.round(hh / 9); j++) d += `<circle cx="${x0}" cy="${y0 + (hh * j) / Math.round(hh / 9)}" r="1.3"/><circle cx="${x0 + ww}" cy="${y0 + (hh * j) / Math.round(hh / 9)}" r="1.3"/>`;
    return `<g fill="${RUG_CREAM}">${d}</g>`;
  };
  // Поле.
  const G = b0 + B, H = b1 + B, gw = bw - 2 * B, gh = bh - 2 * B; // внутренняя полоса
  const fx0 = G + 12, fy0 = H + 12, fw = gw - 24, fh = gh - 24;
  const corner = (sx: number, sy: number) => {
    const ox = sx > 0 ? fx0 : fx0 + fw, oy = sy > 0 ? fy0 : fy0 + fh;
    const comb = Array.from({ length: 5 }, (_, k) => `<path d="M${18 + k * 14} 30 l5 7 l5 -7" fill="${RUG_CREAM}"/>`).join('');
    return `<g transform="translate(${ox} ${oy}) scale(${sx} ${sy})">
      <path d="M0 0 H92 L92 14 L66 14 L66 30 L30 30 L30 66 L14 66 L14 92 L0 92 Z" fill="${RUG_GREEN}" stroke="${RUG_OCHRE}" stroke-width="2.4"/>
      <path d="M0 0 H52 L52 10 L36 10 L36 36 L10 36 L10 52 L0 52 Z" fill="${RUG_OCHRE}" stroke="${RUG_RED_D}" stroke-width="1.4"/>
      ${comb}<g transform="rotate(90) scale(1 -1)">${comb}</g>
      <circle cx="18" cy="18" r="7" fill="${RUG_CREAM}" stroke="${RUG_RED_D}" stroke-width="1.4"/><circle cx="18" cy="18" r="2.6" fill="${RUG_RED}"/>
      ${horns(76, 48, 9, RUG_OCHRE)}</g>`;
  };
  // Мелкий узор поля — симметрично относительно центра: ромбики, звёздочки, «рога», «ёлочки».
  let field = '';
  for (const [dx, dy, kind] of [[0.2, 0.32, 0], [0.34, 0.2, 1], [0.31, 0.42, 0], [0.43, 0.3, 1], [0.12, 0.44, 2], [0.42, 0.1, 2]] as const) {
    for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const px = cx + sx! * dx * fw, py = cy + sy! * dy * fh;
      field += kind === 0
        ? `<path d="M${px} ${py - 9} L${px + 7} ${py} L${px} ${py + 9} L${px - 7} ${py} Z" fill="${RUG_GREEN}" stroke="${RUG_OCHRE}" stroke-width="1.4"/><circle cx="${px}" cy="${py}" r="2" fill="${RUG_CREAM}"/>`
        : kind === 1 ? star8(px, py, 6.5, RUG_OCHRE) : horns(px, py, 7, RUG_CREAM);
    }
  }
  for (const sx of [1, -1]) {
    const px = cx + sx * fw * 0.455;
    field += `<path d="M${px} ${cy - 44} V${cy + 44} ${[-34, -20, -6, 8, 22, 36].map((d) => `M${px} ${cy + d} l${-sx * 10} -8 M${px} ${cy + d} l${sx * 10} -8`).join(' ')}" stroke="${RUG_OCHRE}" stroke-width="2.4" fill="none" stroke-linecap="round"/>` +
      `<circle cx="${px}" cy="${cy - 48}" r="3" fill="${RUG_CREAM}"/><circle cx="${px}" cy="${cy + 48}" r="3" fill="${RUG_CREAM}"/>`;
  }
  // Центральный медальон: зубчатый восьмиугольник с «крючками», вложенные ступенчатые рамки, ромб, звезда, розетка.
  const mA = 112, mB = fh * 0.34;
  const hooksRing = (() => {
    let d = '';
    for (const sy of [-1, 1]) for (let i = -3; i <= 3; i++) { const hx = cx + i * 26; d += `M${hx} ${cy + sy * mB} v${sy * 8} h${6} `; }
    for (const sx of [-1, 1]) for (let j = -1; j <= 1; j++) { const hy = cy + j * 26; d += `M${cx + sx * mA} ${hy} h${sx * 8} v${-6} `; }
    return `<path d="${d}" fill="none" stroke="${RUG_OCHRE}" stroke-width="3" stroke-linecap="square"/>`;
  })();
  const pend = (sy: number) => `<g transform="translate(${cx} ${cy}) scale(1 ${sy})">
    <path d="M-18 -${mB} H18 V-${mB + 14} H9 V-${mB + 26} H-9 V-${mB + 14} H-18 Z" fill="${RUG_GREEN}" stroke="${RUG_OCHRE}" stroke-width="2"/>
    <path d="M0 -${mB + 6} l6 -6 l-6 -6 l-6 6 Z" fill="${RUG_CREAM}"/><circle cx="0" cy="-${mB + 30}" r="3" fill="${RUG_OCHRE}"/></g>`;
  const star = Array.from({ length: 8 }, (_, k) => `<path d="M${cx} ${cy - 46} L${cx + 9} ${cy - 20} L${cx - 9} ${cy - 20} Z" fill="${RUG_OCHRE}" stroke="${RUG_RED_D}" stroke-width="1.2" transform="rotate(${k * 45} ${cx} ${cy})"/>`).join('');
  const beads = Array.from({ length: 16 }, (_, k) => { const a = (k * Math.PI) / 8; return `<circle cx="${cx + Math.sin(a) * 36}" cy="${cy - Math.cos(a) * 36}" r="2" fill="${RUG_CREAM}"/>`; }).join('');
  const medallion = pend(1) + pend(-1) + hooksRing +
    stepOct(cx, cy, mA, mB, 26, RUG_GREEN, RUG_OCHRE) +
    stepOct(cx, cy, mA - 16, mB - 14, 22, RUG_RED, RUG_OCHRE) +
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy]) => star8(cx + sx! * (mA - 40), cy + sy! * (mB - 26), 7, RUG_CREAM)).join('') +
    stepOct(cx, cy, mA - 42, mB - 34, 18, RUG_CREAM, RUG_RED_D) +
    `<path d="M${cx} ${cy - 58} L${cx + 62} ${cy} L${cx} ${cy + 58} L${cx - 62} ${cy} Z" fill="${RUG_GREEN}" stroke="${RUG_RED_D}" stroke-width="2"/>` +
    `<path d="M${cx} ${cy - 50} L${cx + 54} ${cy} L${cx} ${cy + 50} L${cx - 54} ${cy} Z" fill="none" stroke="${RUG_OCHRE}" stroke-width="1.6" stroke-dasharray="4 3"/>` +
    star + beads + rosette(cx, cy, 28, RUG_CREAM, RUG_RED) +
    [-1, 1].map((sx) => `<path d="M${cx + sx * 80} ${cy} l${sx * 10} -10 l${sx * 10} 10 l${-sx * 10} 10 Z" fill="${RUG_OCHRE}" stroke="${RUG_RED_D}" stroke-width="1.4"/><circle cx="${cx + sx * 90}" cy="${cy}" r="2.4" fill="${RUG_RED}"/>`).join('');
  // Бахрома: кисточки из трёх нитей, собранные узелком, и общая плетёная кромка.
  const tassels = Array.from({ length: 41 }, (_, k) => {
    const tx = x + 8 + ((w - 16) * k) / 40, ty = y + h;
    const threads = [-2.6, 0, 2.6].map((dx) => `M${tx} ${ty + 6} L${tx + dx} ${ty + 20}`).join(' ');
    return `<path d="${threads}" stroke="#3B2418" stroke-width="3.6" stroke-linecap="round"/><path d="${threads}" stroke="${RUG_CREAM}" stroke-width="1.8" stroke-linecap="round"/>` +
      `<path d="M${tx} ${ty} V${ty + 6}" stroke="${RUG_CREAM}" stroke-width="2.6"/><ellipse cx="${tx}" cy="${ty + 6}" rx="2.6" ry="2" fill="${RUG_OCHRE}" stroke="#3B2418" stroke-width="1"/>`;
  }).join('');
  const braid = `<path d="M${x + 2} ${y + h + 1.5} H${x + w - 2}" stroke="${RUG_RED_D}" stroke-width="4"/><path d="M${x + 2} ${y + h + 1.5} H${x + w - 2}" stroke="${RUG_CREAM}" stroke-width="2" stroke-dasharray="3 3"/>`;
  return `<g>
    <rect x="${x + 6}" y="${y + 8}" width="${w}" height="${h}" fill="#3B2418" opacity="0.18"/>
    ${tassels}
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${RUG_RED_D}" stroke="#3B2418" stroke-width="3.5"/>
    ${sawEdge(x + 2, y + 2, w - 4, h - 4, 6, RUG_CREAM)}
    <rect x="${b0}" y="${b1}" width="${bw}" height="${bh}" fill="${RUG_GREEN}" stroke="${RUG_CREAM}" stroke-width="2"/>
    ${dots(b0 + 4, b1 + 4, bw - 8, bh - 8)}${border}
    <rect x="${G}" y="${H}" width="${gw}" height="${gh}" fill="${RUG_CREAM}" stroke="${RUG_OCHRE}" stroke-width="3"/>
    ${waveBand(G + 6, H + 6, gw - 12, gh - 12, 14, 3)}
    <rect x="${fx0}" y="${fy0}" width="${fw}" height="${fh}" fill="${RUG_RED}" stroke="${RUG_RED_D}" stroke-width="2"/>
    <rect x="${fx0 + 4}" y="${fy0 + 4}" width="${fw - 8}" height="${fh - 8}" fill="none" stroke="${RUG_OCHRE}" stroke-width="1" stroke-dasharray="2 4"/>
    ${corner(1, 1)}${corner(-1, 1)}${corner(1, -1)}${corner(-1, -1)}
    ${field}${medallion}${braid}</g>`;
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
    // Розы на подоконнике — перед рамой: стоят в комнате, ближе к нам, чем стекло.
    { key: 'roses', box: ROSES, svg: propSvg(ROSES.w, ROSES.h, `<g transform="translate(${-ROSES.x} ${-ROSES.y})">${roses()}</g>`) },
    // Маятник часов: ±4°, период 2,4 с.
    {
      key: 'pendulum',
      box: { x: CLOCK.x - 10, y: 194, w: 20, h: 110 },
      pivot: { x: CLOCK.x, y: 198 },
      svg: propSvg(20, 110, '<path d="M10 4 V86" stroke="#C9A24A" stroke-width="3"/><circle cx="10" cy="4" r="3" fill="#C9A24A"/><circle cx="10" cy="94" r="10" fill="#E8AB30" stroke="#3B2418" stroke-width="2.5"/><circle cx="7" cy="91" r="3" fill="#FFF1C9"/>'),
      period: 2.4,
      motion: (t) => ({ rot: wave(t, 2.4, 0.07) }),
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
