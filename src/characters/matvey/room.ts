// Комната Деда Матвея — «Веранда на даче» (docs/ART_STYLE.md §12): стены из сосновой вагонки, большое окно в сад,
// полка с ламповым радио, щит с инструментами, вешалка с соломенной шляпой, грифельная доска для счёта.
// Живое: ветка яблони за окном, дым из трубы соседнего дома, пылинки в солнечном луче, лампа-индикатор радио.
// Модуль строит SVG-строки и не зависит от DOM.
import { cycle, hash01, hump, propSvg, wave, type RoomArt } from '../../render/ambient';
import { FLOOR_Y, floorDefs, floorSvg, frame, glow, glowDef, ol, roomDoc, scoreSlate } from '../../render/roomKit';

const PINE = '#D9A86A', PINE_D = '#B9824A', WOOD = '#8C5A31', WOOD_D = '#6A4023', SASH = '#EFE6D0';
// Окно стоит на стене над полом: низ подоконника — на 80 единиц выше плинтуса.
const WIN = { x: 520, y: 92, w: 430, h: 238 };
const SILL_Y = WIN.y + WIN.h + 8;
// Труба соседского дома (откуда идёт дым).
const CHIMNEY = { x: WIN.x + 196, y: WIN.y + WIN.h - 70 - 92 };
// Приёмник на тумбочке под табло счёта: верх корпуса ниже табло, ноты уходят влево вверх, мимо табло.
const RADIO = { x: 1462, y: 266, w: 196, h: 82 };
const CAB = { x: 1446, top: RADIO.y + RADIO.h, w: 296 };

const LEAF = '#4F8C3E', LEAF_L = '#6CAA54', LEAF_D = '#2F5A24', BARK = '#6E4A2C';

/** Лист яблони: заострённый, с центральной жилкой и боковыми прожилками. Начало черешка — (x, y). */
function leaf(x: number, y: number, rot: number, len = 26, fill = LEAF): string {
  const w = len * 0.42;
  const veins = [0.3, 0.5, 0.7].map((f) => `M${len * f} 0 L${len * (f + 0.14)} ${-w * 0.55} M${len * f} 0 L${len * (f + 0.14)} ${w * 0.55}`).join(' ');
  return `<g transform="translate(${x} ${y}) rotate(${rot})">
    <path d="M0 0 C${len * 0.25} ${-w} ${len * 0.7} ${-w * 1.05} ${len} 0 C${len * 0.7} ${w * 1.05} ${len * 0.25} ${w} 0 0 Z" fill="${fill}" stroke="#3B2418" stroke-width="2" stroke-linejoin="round"/>
    <path d="M1 0 H${len * 0.92} ${veins}" stroke="${LEAF_D}" stroke-width="1.3" fill="none" stroke-linecap="round"/>
    <path d="M${len * 0.2} ${-w * 0.35} Q${len * 0.45} ${-w * 0.75} ${len * 0.7} ${-w * 0.4}" stroke="#9CCB7A" stroke-width="1.4" fill="none" opacity="0.7"/></g>`;
}

/** Яблоко: две «щёчки» и ямка у плодоножки, румянец, тень, блик, плодоножка с листиком. */
function apple(x: number, y: number, r: number, leafy = true): string {
  return `<g transform="translate(${x} ${y})">
    <path d="M0 ${-r * 0.62} C${r * 0.35} ${-r * 1.02} ${r * 1.08} ${-r * 0.85} ${r * 1.02} ${-r * 0.05} C${r * 0.98} ${r * 0.72} ${r * 0.45} ${r * 1.05} 0 ${r * 0.88} C${-r * 0.45} ${r * 1.05} ${-r * 0.98} ${r * 0.72} ${-r * 1.02} ${-r * 0.05} C${-r * 1.08} ${-r * 0.85} ${-r * 0.35} ${-r * 1.02} 0 ${-r * 0.62} Z" fill="#D63A30" stroke="#3B2418" stroke-width="${Math.max(1.6, r * 0.16)}" stroke-linejoin="round"/>
    <path d="M${r * 0.15} ${r * 0.8} C${r * 0.7} ${r * 0.7} ${r * 0.95} ${r * 0.2} ${r * 0.9} ${-r * 0.3} C${r * 0.7} ${r * 0.3} ${r * 0.4} ${r * 0.6} ${r * 0.15} ${r * 0.8} Z" fill="#A8261F" opacity="0.7"/>
    <ellipse cx="${-r * 0.35}" cy="${r * 0.1}" rx="${r * 0.38}" ry="${r * 0.5}" fill="#F2884E" opacity="0.55"/>
    <ellipse cx="${-r * 0.45}" cy="${-r * 0.35}" rx="${r * 0.16}" ry="${r * 0.24}" fill="#FFFFFF" opacity="0.75" transform="rotate(-25 ${-r * 0.45} ${-r * 0.35})"/>
    <path d="M0 ${-r * 0.6} Q${r * 0.05} ${-r * 0.95} ${r * 0.22} ${-r * 1.2}" stroke="#5A3A22" stroke-width="${Math.max(1.6, r * 0.14)}" fill="none" stroke-linecap="round"/>
    ${leafy ? `<path d="M${r * 0.12} ${-r * 0.95} C${r * 0.4} ${-r * 1.4} ${r * 0.9} ${-r * 1.3} ${r * 1.05} ${-r * 1.1} C${r * 0.75} ${-r * 0.88} ${r * 0.4} ${-r * 0.85} ${r * 0.12} ${-r * 0.95} Z" fill="${LEAF_L}" stroke="#3B2418" stroke-width="1.4"/>` : ''}</g>`;
}

/** Яблоня в саду: ствол с развилкой и ветками, крона из нескольких «облаков» листвы с прорисовкой, яблоки. */
function appleTree(cx: number, ground: number): string {
  const top = ground - 210;
  const trunk = `<path d="M${cx - 9} ${ground} C${cx - 8} ${ground - 50} ${cx - 12} ${ground - 80} ${cx - 4} ${ground - 110} L${cx + 8} ${ground - 110} C${cx + 10} ${ground - 80} ${cx + 8} ${ground - 50} ${cx + 11} ${ground} Z" fill="${BARK}" ${ol(2.6)}/>
    <path d="M${cx - 2} ${ground - 105} C${cx - 20} ${ground - 130} ${cx - 40} ${ground - 140} ${cx - 56} ${ground - 160} M${cx + 4} ${ground - 108} C${cx + 18} ${ground - 136} ${cx + 38} ${ground - 146} ${cx + 52} ${ground - 170} M${cx + 2} ${ground - 110} V${ground - 175}" stroke="${BARK}" stroke-width="7" fill="none" stroke-linecap="round"/>
    <path d="M${cx - 2} ${ground - 30} q3 -8 0 -16 M${cx + 4} ${ground - 70} q-3 -8 0 -14" stroke="#4A3018" stroke-width="1.6" fill="none"/>`;
  const blobs = [[-46, 70, 44], [42, 66, 46], [0, 40, 52], [-70, 110, 32], [72, 108, 34], [-24, 96, 40], [28, 100, 40]] as const;
  const crown = blobs.map(([dx, dy, r], k) => `<circle cx="${cx + dx}" cy="${top + dy}" r="${r}" fill="${k % 2 ? '#5E9A4A' : '#6CAA54'}" ${ol(3)}/>`).join('');
  // Прорисовка листвы: короткие «листовые» штрихи по кроне.
  const tufts = Array.from({ length: 26 }, (_, k) => {
    const a = k * 2.39, rr = 18 + (k * 37) % 70;
    const tx = cx + Math.cos(a) * rr * 1.05, ty = top + 76 + Math.sin(a) * rr * 0.62;
    return `<path d="M${tx - 6} ${ty + 3} q6 -9 12 0" fill="none" stroke="${LEAF_D}" stroke-width="2" stroke-linecap="round" opacity="0.7"/>`;
  }).join('');
  const lights = [[-30, 30], [20, 22], [-60, 80], [50, 60]].map(([dx, dy]) => `<path d="M${cx + dx! - 8} ${top + dy!} q8 -8 16 0" fill="none" stroke="#A7D27E" stroke-width="2.4" stroke-linecap="round"/>`).join('');
  const apples = [[-40, 64], [26, 50], [60, 94], [-66, 112], [-6, 104], [36, 122], [-28, 128]].map(([dx, dy], k) => apple(cx + dx!, top + dy!, 7 + (k % 3), false)).join('');
  return `<g><ellipse cx="${cx}" cy="${ground + 2}" rx="70" ry="8" fill="#4E7A3A" opacity="0.5"/>${trunk}${crown}${tufts}${lights}${apples}</g>`;
}

/** Соседский домик: обшивка, черепичная крыша, труба, окна со ставнями, дверь с крыльцом, слуховое окно. */
function house(x0: number, ground: number): string {
  const L = x0, R = x0 + 112, eave = ground - 50, apex = ground - 96;
  const siding = Array.from({ length: 5 }, (_, k) => `<path d="M${L + 2} ${ground - 8 - k * 9} H${R - 2}" stroke="#C9B48A" stroke-width="1.4"/>`).join('');
  const roofRows = Array.from({ length: 4 }, (_, k) => {
    const yy = eave - 2 - k * 11, half = ((yy - apex) / (eave - apex)) * 66;
    const n = Math.max(2, Math.round(half / 7));
    let d = `M${x0 + 56 - half} ${yy}`;
    for (let i = 0; i < n * 2; i++) d += ` q${half / n / 2} 5 ${half / n} 0`;
    return `<path d="${d}" fill="none" stroke="#8E3328" stroke-width="1.6"/>`;
  }).join('');
  const win = (wx: number, wy: number) => `<rect x="${wx - 9}" y="${wy}" width="7" height="20" fill="#4E8A5A" ${ol(1.6)}/><rect x="${wx + 18}" y="${wy}" width="7" height="20" fill="#4E8A5A" ${ol(1.6)}/>
    <rect x="${wx - 1}" y="${wy}" width="18" height="20" fill="#9ED0E8" ${ol(1.8)}/><path d="M${wx + 8} ${wy} V${wy + 20} M${wx - 1} ${wy + 10} H${wx + 17}" stroke="#F3EBDD" stroke-width="1.8"/>
    <rect x="${wx - 3}" y="${wy + 20}" width="22" height="3" fill="#F3EBDD" ${ol(1)}/>`;
  return `<g>
    <rect x="${CHIMNEY.x - 7}" y="${CHIMNEY.y + 2}" width="14" height="24" fill="#9C4A3A" ${ol(2.2)}/><rect x="${CHIMNEY.x - 9}" y="${CHIMNEY.y}" width="18" height="5" fill="#7A3A2E" ${ol(1.6)}/>
    <rect x="${L}" y="${eave}" width="${R - L}" height="${ground - eave}" fill="#E7D3A8" ${ol(2.6)}/>${siding}
    <path d="M${L - 10} ${eave + 2} L${x0 + 56} ${apex} L${R + 10} ${eave + 2} Z" fill="#B8463A" ${ol(2.6)}/>${roofRows}
    <circle cx="${x0 + 56}" cy="${eave - 18}" r="6" fill="#9ED0E8" ${ol(1.6)}/><path d="M${x0 + 50} ${eave - 18} h12 M${x0 + 56} ${eave - 24} v12" stroke="#F3EBDD" stroke-width="1.4"/>
    ${win(L + 16, eave + 10)}${win(R - 32, eave + 10)}
    <rect x="${x0 + 46}" y="${ground - 30}" width="20" height="30" fill="#8C5A31" ${ol(2)}/><circle cx="${x0 + 62}" cy="${ground - 15}" r="1.6" fill="#E8AB30"/>
    <path d="M${x0 + 48} ${ground - 26} h16 M${x0 + 48} ${ground - 18} h16" stroke="#6A4023" stroke-width="1.2"/>
    <rect x="${x0 + 40}" y="${ground - 2}" width="32" height="5" fill="#C9B48A" ${ol(1.6)}/>
    <path d="M${x0 + 40} ${ground - 34} h32 l-4 -6 h-24 Z" fill="#8E3328" ${ol(1.4)}/></g>`;
}

function garden(): string {
  const { x, y, w, h } = WIN;
  const b = y + h;
  // Всё за окном обрезано по стеклу: дальше — небо, холмы, домик; ближе — яблоня; ещё ближе — забор.
  return `<clipPath id="mvGlass"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath><g clip-path="url(#mvGlass)">
  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#mvSky)"/>
  <path d="M${x + 220} ${y + 44} C${x + 240} ${y + 22} ${x + 280} ${y + 22} ${x + 294} ${y + 38} C${x + 310} ${y + 28} ${x + 340} ${y + 34} ${x + 342} ${y + 52} Z" fill="#FFFFFF" opacity="0.85"/>
  <path d="M${x + 60} ${y + 70} C${x + 74} ${y + 56} ${x + 100} ${y + 56} ${x + 110} ${y + 68} C${x + 120} ${y + 62} ${x + 140} ${y + 64} ${x + 140} ${y + 76} Z" fill="#FFFFFF" opacity="0.7"/>
  <path d="M${x} ${b - 84} C${x + 120} ${b - 110} ${x + 280} ${b - 100} ${x + w} ${b - 120} V${b} H${x} Z" fill="#9CC27A"/>
  ${house(x + 110, b - 70)}
  <path d="M${x} ${b - 46} C${x + 140} ${b - 68} ${x + 300} ${b - 56} ${x + w} ${b - 70} V${b} H${x} Z" fill="#79A85C"/>
  ${appleTree(x + 330, b - 36)}
  ${Array.from({ length: 10 }, (_, k) => `<path d="M${x + 14 + k * 44} ${b - 8} V${b - 42} L${x + 22 + k * 44} ${b - 50} L${x + 30 + k * 44} ${b - 42} V${b - 8}" fill="#F3EBDD" ${ol(2)}/>`).join('')}
  <path d="M${x} ${b - 32} H${x + w}" stroke="#F3EBDD" stroke-width="5"/><path d="M${x} ${b - 18} H${x + w}" stroke="#F3EBDD" stroke-width="4"/>
  </g>`;
}

/** Переплёт: три створки и фрамуга. ox, oy — сдвиг начала координат (для текстуры поверх живого). */
function sash(ox: number, oy: number): string {
  const x = WIN.x - ox, y = WIN.y - oy, { w, h } = WIN;
  const bars = `M${x + w / 3} ${y} V${y + h} M${x + (2 * w) / 3} ${y} V${y + h} M${x} ${y + 80} H${x + w}`;
  return `<path d="${bars}" stroke="${SASH}" stroke-width="10"/><path d="${bars}" fill="none" ${ol(2)}/>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${SASH}" stroke-width="14"/>
  <rect x="${x - 7}" y="${y - 7}" width="${w + 14}" height="${h + 14}" rx="4" fill="none" ${ol(4)}/>`;
}

const BRANCH = { w: 280, h: 150 };
function branch(): string {
  // Ветка яблони свисает из верхнего левого угла стекла (локальные координаты 280 × 150): листья с прожилками, яблоки.
  const leaves: readonly (readonly [number, number, number, number])[] = [
    [40, 12, -30, 24], [56, 18, 50, 26], [84, 24, -40, 28], [98, 34, 60, 26], [126, 40, -20, 30], [140, 52, 80, 26], [166, 60, -35, 28],
    [182, 74, 40, 30], [206, 86, -10, 28], [224, 100, 70, 26], [236, 110, -40, 24], [112, 44, 120, 24], [74, 30, 140, 22], [196, 82, 130, 24], [150, 56, 160, 22],
  ];
  return propSvg(BRANCH.w, BRANCH.h, `<path d="M0 6 C60 14 120 30 170 58 C200 74 226 96 248 120 M120 32 C112 52 104 70 92 84 M180 66 C176 84 170 96 160 106" fill="none" stroke="${BARK}" stroke-width="7" stroke-linecap="round"/>
    <path d="M0 6 C60 14 120 30 170 58" fill="none" stroke="#8A6040" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
    ${leaves.map(([lx, ly, r, l], k) => leaf(lx, ly, r, l, k % 3 === 0 ? LEAF_L : LEAF)).join('')}
    ${apple(92, 98, 12)}${apple(160, 120, 13)}${apple(250, 132, 10, false)}`);
}

/** Красный тюльпан: бокал из трёх лепестков с заострёнными кончиками. */
function tulip(x: number, y: number, rot = 0): string {
  return `<g transform="translate(${x} ${y}) rotate(${rot})">
    <path d="M-12 -4 C-14 -18 -10 -28 -6 -32 L-2 -22 L2 -34 L6 -22 L10 -32 C14 -28 16 -18 12 -4 C8 4 -8 4 -12 -4 Z" fill="#D9263A" stroke="#3B2418" stroke-width="2" stroke-linejoin="round"/>
    <path d="M-6 -30 C-8 -18 -6 -6 0 2 M6 -30 C8 -18 6 -6 0 2" fill="none" stroke="#9E1428" stroke-width="1.6"/>
    <path d="M-8 -20 q2 -6 4 -8" stroke="#FF7A86" stroke-width="2" fill="none" stroke-linecap="round"/></g>`;
}
const TULIP_X = WIN.x + 40, TULIP_BASE = SILL_Y - 4;
// Область рисунка тюльпанов: банка на подоконнике и цветы над ней.
const TULIPS = { x: TULIP_X - 16, y: TULIP_BASE - 132, w: 92, h: 136 };
function tulips(): string {
  const jx = TULIP_X, base = TULIP_BASE;
  const stems = [[-16, -96, -10], [2, -118, 2], [18, -100, 12]] as const;
  return `<g>
    ${stems.map(([dx, dy]) => `<path d="M${jx + 22 + dx / 3} ${base - 20} Q${jx + 22 + dx} ${base + dy / 2} ${jx + 22 + dx} ${base + dy + 4}" fill="none" stroke="#3E7A34" stroke-width="4.5" stroke-linecap="round"/>`).join('')}
    <path d="M${jx + 16} ${base - 22} C${jx - 6} ${base - 50} ${jx - 4} ${base - 80} ${jx + 2} ${base - 92} C${jx + 8} ${base - 70} ${jx + 18} ${base - 46} ${jx + 18} ${base - 22} Z" fill="${LEAF_L}" ${ol(2)}/>
    <path d="M${jx + 28} ${base - 22} C${jx + 50} ${base - 46} ${jx + 54} ${base - 70} ${jx + 50} ${base - 86} C${jx + 40} ${base - 64} ${jx + 30} ${base - 46} ${jx + 26} ${base - 22} Z" fill="${LEAF}" ${ol(2)}/>
    <path d="M${jx + 4} ${base - 86} Q${jx + 10} ${base - 56} ${jx + 17} ${base - 26} M${jx + 48} ${base - 80} Q${jx + 38} ${base - 52} ${jx + 28} ${base - 26}" stroke="${LEAF_D}" stroke-width="1.4" fill="none"/>
    ${stems.map(([dx, dy, r]) => tulip(jx + 22 + dx, base + dy + 6, r)).join('')}
    <path d="M${jx + 4} ${base} V${base - 34} Q${jx + 4} ${base - 40} ${jx + 10} ${base - 40} H${jx + 34} Q${jx + 40} ${base - 40} ${jx + 40} ${base - 34} V${base} Z" fill="#CFE6EC" opacity="0.75" ${ol(2.6)}/>
    <path d="M${jx + 6} ${base - 16} H${jx + 38}" stroke="#9FC6D4" stroke-width="2"/><path d="M${jx + 10} ${base - 34} V${base - 6}" stroke="#FFFFFF" stroke-width="2.4" opacity="0.8"/>
    <rect x="${jx + 2}" y="${base - 44}" width="40" height="6" rx="2" fill="#B8C9CF" ${ol(2)}/></g>`;
}

function radioCabinet(): string {
  const { x, y, w, h } = RADIO;
  const c = CAB;
  return `<g>
    <rect x="${c.x}" y="${c.top}" width="${c.w}" height="${FLOOR_Y - 6 - c.top}" rx="4" fill="${WOOD}" ${ol(3.5)}/>
    <rect x="${c.x - 6}" y="${c.top - 4}" width="${c.w + 12}" height="12" rx="4" fill="${WOOD_D}" ${ol(3)}/>
    <rect x="${c.x + 14}" y="${c.top + 18}" width="${c.w - 28}" height="${FLOOR_Y - 34 - c.top - 18}" rx="3" fill="none" ${ol(2.4)}/>
    <circle cx="${c.x + c.w - 30}" cy="${c.top + 40}" r="4.5" fill="#C9A24A" ${ol(1.6)}/>
    <path d="M${c.x + 10} ${FLOOR_Y - 6} v12 M${c.x + c.w - 10} ${FLOOR_Y - 6} v12" ${ol(6)}/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="#7A4A2A" ${ol(4)}/>
    <rect x="${x + 12}" y="${y + 10}" width="86" height="${h - 20}" rx="8" fill="#C8B48A" ${ol(2.5)}/>
    ${Array.from({ length: 6 }, (_, k) => `<path d="M${x + 18} ${y + 18 + k * 10} H${x + 92}" stroke="#9C8762" stroke-width="3"/>`).join('')}
    <rect x="${x + 108}" y="${y + 12}" width="78" height="20" rx="4" fill="#F2E0B0" ${ol(2.5)}/>
    <path d="M${x + 114} ${y + 28} V${y + 18} M${x + 126} ${y + 28} V${y + 22} M${x + 138} ${y + 28} V${y + 18} M${x + 150} ${y + 28} V${y + 22} M${x + 162} ${y + 28} V${y + 18} M${x + 174} ${y + 28} V${y + 22}" stroke="#7A4A2A" stroke-width="1.6"/>
    <path d="M${x + 146} ${y + 14} V${y + 30}" stroke="#C5333B" stroke-width="2.4"/>
    <circle cx="${x + 124}" cy="${y + 58}" r="11" fill="#4A2E1A" ${ol(2.5)}/><circle cx="${x + 170}" cy="${y + 58}" r="11" fill="#4A2E1A" ${ol(2.5)}/>
    <path d="M${x + 124} ${y + 50} v6 M${x + 170} ${y + 50} v6" stroke="#C8B48A" stroke-width="2"/>
    <circle cx="${x + 147}" cy="${y + 46}" r="6" fill="#2F4A2A" ${ol(1.6)}/>
    <path d="M${x + w - 8} ${y + 4} L${x + w + 100} ${y - 20}" ${ol(3)}/><circle cx="${x + w + 100}" cy="${y - 20}" r="3" fill="#C9CED6" ${ol(1.4)}/>
    <path d="M${c.x + c.w - 50} ${c.top - 4} V${c.top - 36} C${c.x + c.w - 50} ${c.top - 46} ${c.x + c.w - 18} ${c.top - 46} ${c.x + c.w - 18} ${c.top - 36} V${c.top - 4} Z" fill="#E6C470" ${ol(3)}/><path d="M${c.x + c.w - 50} ${c.top - 32} H${c.x + c.w - 18}" stroke="#C5333B" stroke-width="5"/></g>`;
}

function tools(): string {
  const x = 1756, y = 108;
  // Пила: полотно-трапеция; зубья — одинаковые треугольники вдоль рабочей кромки, от ручки до самого кончика.
  const A = { x: x + 30, y: y + 46 }, Bt = { x: x + 54, y: y + 198 };
  const len = Math.hypot(Bt.x - A.x, Bt.y - A.y), ux = (Bt.x - A.x) / len, uy = (Bt.y - A.y) / len;
  const nx = -uy, ny = ux; // наружу, к зубьям
  const N = 17;
  let teeth = '';
  for (let k = 0; k < N; k++) {
    const tm = (len * (k + 0.35)) / N, t1 = (len * (k + 1)) / N;
    teeth += ` L${(A.x + ux * tm + nx * 5.5).toFixed(1)} ${(A.y + uy * tm + ny * 5.5).toFixed(1)} L${(A.x + ux * t1).toFixed(1)} ${(A.y + uy * t1).toFixed(1)}`;
  }
  return `<g>
    <rect x="${x}" y="${y}" width="250" height="230" rx="6" fill="#C9935A" ${ol(4)}/>
    ${Array.from({ length: 8 }, (_, r) => Array.from({ length: 9 }, (_, c) => `<circle cx="${x + 18 + c * 27}" cy="${y + 16 + r * 28}" r="2" fill="#7A5233"/>`).join('')).join('')}
    <path d="M${x + 64} ${y + 46} L${A.x} ${A.y}${teeth} L${x + 68} ${y + 192} Z" fill="#C9CED6" stroke="#3B2418" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M${x + 44} ${y + 60} L${x + 58} ${y + 176}" stroke="#E8ECF0" stroke-width="3" stroke-linecap="round"/>
    <path d="M${x + 22} ${y + 14} H${x + 74} Q${x + 80} ${y + 14} ${x + 80} ${y + 22} V${y + 40} Q${x + 80} ${y + 48} ${x + 72} ${y + 48} H${x + 24} Q${x + 16} ${y + 48} ${x + 16} ${y + 40} V${y + 22} Q${x + 16} ${y + 14} ${x + 22} ${y + 14} Z M${x + 30} ${y + 24} H${x + 66} V${y + 38} H${x + 30} Z" fill="#B8463A" fill-rule="evenodd" ${ol(3)}/>
    <path d="M${x + 112} ${y + 44} V${y + 196}" stroke="#3B2418" stroke-width="20" stroke-linecap="round"/><path d="M${x + 112} ${y + 44} V${y + 196}" stroke="#A0703C" stroke-width="15" stroke-linecap="round"/>
    <path d="M${x + 108} ${y + 60} V${y + 186}" stroke="#C8925A" stroke-width="3" stroke-linecap="round"/>
    <path d="M${x + 106} ${y + 170} h12 M${x + 106} ${y + 178} h12 M${x + 106} ${y + 186} h12" stroke="#7A5233" stroke-width="2"/>
    <path d="M${x + 84} ${y + 24} H${x + 140} L${x + 146} ${y + 32} V${y + 44} H${x + 84} Q${x + 76} ${y + 40} ${x + 78} ${y + 32} Z" fill="#5A6470" ${ol(3)}/>
    <path d="M${x + 162} ${y + 40} L${x + 172} ${y + 120} L${x + 156} ${y + 190} M${x + 182} ${y + 40} L${x + 172} ${y + 120} L${x + 188} ${y + 190}" fill="none" stroke="#5A6470" stroke-width="6" stroke-linecap="round"/>
    <circle cx="${x + 172}" cy="${y + 120}" r="5" fill="#C9CED6" ${ol(2)}/>
    <path d="M${x + 220} ${y + 36} C${x + 206} ${y + 36} ${x + 206} ${y + 60} ${x + 220} ${y + 60} V${y + 200}" fill="none" stroke="#7E8894" stroke-width="9" stroke-linecap="round"/></g>`;
}

function hooks(): string {
  return `<g>
    <rect x="80" y="130" width="300" height="20" rx="5" fill="${WOOD}" ${ol(3.5)}/>
    ${[120, 230, 340].map((hx) => `<path d="M${hx} 150 V172 Q${hx} 182 ${hx + 10} 178" fill="none" ${ol(4)}/>`).join('')}
    <path d="M120 176 C80 200 76 300 90 380 L160 380 C170 300 160 200 120 176 Z" fill="#4E6A8A" ${ol(4)}/>
    <path d="M120 176 L110 240 M120 176 L134 240" ${ol(2.5)}/>
    <ellipse cx="236" cy="200" rx="70" ry="16" fill="#E8CF85" ${ol(3.5)}/><path d="M200 196 C204 160 268 160 272 196 Z" fill="#E8CF85" ${ol(3.5)}/>
    <path d="M202 192 Q236 202 270 192" fill="none" stroke="#C5333B" stroke-width="6"/>
    <path d="M330 180 C320 220 322 260 340 300 C356 260 360 220 350 180 Z" fill="#C24A3A" ${ol(3)}/></g>
  ${frame(410, 150, 84, 96, '#E8E1D0', '<rect width="100" height="100" fill="#F7F3EA"/><rect x="0" y="0" width="100" height="22" fill="#C5333B"/>' + [0, 1, 2, 3].map((r) => [0, 1, 2, 3, 4].map((c) => `<rect x="${8 + c * 18}" y="${30 + r * 17}" width="12" height="10" fill="#B9AFA0"/>`).join('')).join(''), 6)}
  <g><path d="M250 ${FLOOR_Y - 60} L268 ${FLOOR_Y + 14} L380 ${FLOOR_Y + 14} L398 ${FLOOR_Y - 60} Z" fill="#B98A50" ${ol(3.5)}/><path d="M256 ${FLOOR_Y - 34} H392 M262 ${FLOOR_Y - 10} H386" stroke="#8C6234" stroke-width="3"/>
    ${[[282, -66], [312, -72], [342, -66], [370, -72], [298, -86], [354, -86]].map(([ax, ay]) => apple(ax!, FLOOR_Y + ay!, 15, false)).join('')}</g>`;
}

function background(): string {
  const defs = `
    <pattern id="mvPlank" width="64" height="900" patternUnits="userSpaceOnUse">
      <rect width="64" height="900" fill="${PINE}"/><path d="M0 0 V900" stroke="${PINE_D}" stroke-width="4"/>
      <path d="M20 120 q6 10 0 20 M40 420 q-6 10 0 20 M28 700 q6 10 0 20" stroke="${PINE_D}" stroke-width="2.4" fill="none"/>
      <ellipse cx="44" cy="280" rx="5" ry="8" fill="${PINE_D}" opacity="0.7"/>
    </pattern>
    <linearGradient id="mvSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8EC6E8"/><stop offset="1" stop-color="#D8EEF2"/></linearGradient>
    <linearGradient id="mvBeam" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF4C8" stop-opacity="0.42"/><stop offset="1" stop-color="#FFF4C8" stop-opacity="0"/></linearGradient>
    ${glowDef('mvSun', '#FFF1C9', 0.45)}${floorDefs}`;
  const { x, y, w, h } = WIN;
  return roomDoc(defs, `
  <rect width="2400" height="${FLOOR_Y}" fill="url(#mvPlank)"/>
  <rect y="0" width="2400" height="40" fill="${WOOD}"/><path d="M0 40 H2400" ${ol(4)}/>
  ${floorSvg(WOOD_D)}
  ${glow('mvSun', x + w / 2, y + h / 2, 420, 300)}
  <g>${garden()}${sash(0, 0)}</g>
  <rect x="${x - 24}" y="${SILL_Y - 4}" width="${w + 48}" height="18" rx="5" fill="${SASH}" ${ol(3.5)}/>
  <path d="M${x - 18} ${SILL_Y + 14} H${x + w + 18}" stroke="#3B2418" stroke-opacity="0.25" stroke-width="5"/>
  <path d="M${x + 60} ${y + 20} L${x + w - 20} ${y + 20} L${x + w + 220} 470 L${x + 300} 470 Z" fill="url(#mvBeam)"/>
  ${hooks()}
  ${scoreSlate('#C2955A', '#2E3B36')}
  ${radioCabinet()}${tools()}
  <g><rect x="2140" y="150" width="190" height="16" rx="4" fill="${WOOD}" ${ol(3)}/>
    ${[2156, 2200, 2244, 2288].map((jx, k) => `<rect x="${jx}" y="${96 + (k % 2) * 8}" width="34" height="${54 - (k % 2) * 8}" rx="6" fill="${['#E2603E', '#9CC27A', '#E6C470', '#C24A3A'][k]}" opacity="0.85" ${ol(2.5)}/><rect x="${jx + 2}" y="${90 + (k % 2) * 8}" width="30" height="10" rx="3" fill="#F3EBDD" ${ol(2)}/>`).join('')}
    <rect x="2140" y="300" width="190" height="16" rx="4" fill="${WOOD}" ${ol(3)}/>
    <path d="M2160 300 C2160 250 2220 240 2236 270 C2250 240 2310 250 2310 300 Z" fill="#5E9A4A" ${ol(3)}/></g>
  `);
}

// Нота: «восьмая» или «две восьмые»; кремовая заливка с тёмным контуром видна и на корпусе, и на вагонке.
const NOTE = { w: 26, h: 32 };
const noteSvg = (): string => propSvg(NOTE.w, NOTE.h, `<path d="M9 24 V5 L22 2 V20" fill="none" stroke="#3B2418" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M9 24 V5 L22 2 V20" fill="none" stroke="#FFF1C9" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
  <ellipse cx="6" cy="25" rx="5" ry="4" fill="#FFF1C9" stroke="#3B2418" stroke-width="2" transform="rotate(-20 6 25)"/>
  <ellipse cx="19" cy="21" rx="5" ry="4" fill="#FFF1C9" stroke="#3B2418" stroke-width="2" transform="rotate(-20 19 21)"/>`);

export const MATVEY_ROOM: RoomArt = {
  id: 'matvey',
  name: 'Веранда на даче',
  backgroundSvg: background,
  props: [
    // Дым из трубы соседнего дома: три клуба поднимаются, расплываются и тают.
    {
      key: 'smoke',
      box: { x: CHIMNEY.x - 12, y: CHIMNEY.y - 26, w: 24, h: 24 },
      svg: propSvg(24, 24, '<circle cx="12" cy="12" r="10" fill="#E8EEF2" opacity="0.8"/>'),
      count: 3,
      particle: true,
      clip: WIN,
      period: 6.4,
      reach: 110,
      motion: (t, i) => {
        const u = cycle(t, 6.4, i / 3);
        return { dy: -u * 96, dx: u * 34 + wave(u, 1, 5, i), sx: 0.5 + u * 1.3, sy: 0.5 + u * 1.1, alpha: hump(u) * 0.7 };
      },
    },
    // Ветка яблони за стеклом: качается от ветерка.
    {
      key: 'branch',
      box: { x: WIN.x + 4, y: WIN.y + 4, w: BRANCH.w, h: BRANCH.h },
      pivot: { x: WIN.x + 4, y: WIN.y + 8 },
      svg: branch(),
      clip: WIN,
      period: 5.9,
      motion: (t) => ({ rot: wave(t, 5.9, 0.03) + wave(t, 5.9 / 2, 0.008, 1) }),
    },
    { key: 'sash', box: { x: WIN.x - 12, y: WIN.y - 12, w: WIN.w + 24, h: WIN.h + 24 }, svg: propSvg(WIN.w + 24, WIN.h + 24, sash(WIN.x - 12, WIN.y - 12)) },
    // Тюльпаны на подоконнике — перед рамой.
    { key: 'tulips', box: TULIPS, svg: propSvg(TULIPS.w, TULIPS.h, `<g transform="translate(${-TULIPS.x} ${-TULIPS.y})">${tulips()}</g>`) },
    // Пылинки в солнечном луче: медленно плывут вниз-вправо, мерцают.
    {
      key: 'mote',
      box: { x: WIN.x + 120, y: WIN.y + 60, w: 6, h: 6 },
      svg: propSvg(6, 6, '<circle cx="3" cy="3" r="2.4" fill="#FFF8DC"/>'),
      count: 12,
      particle: true,
      period: 22,
      reach: 380,
      motion: (t, i) => {
        const per = 22 / (1 + (i % 2));
        const u = cycle(t, per, hash01(i, 3));
        const lane = hash01(i, 4);
        return { dx: lane * 180 + u * 160 + wave(t, 5.5, 6, i), dy: lane * 60 + u * 230 + wave(t, 4.4, 5, i * 2), alpha: hump(u) * (0.45 + 0.4 * hash01(i, 5)) };
      },
    },
    // Индикатор работы приёмника: светящаяся шкала мягко пульсирует.
    {
      key: 'radioGlow',
      box: { x: RADIO.x + 104, y: RADIO.y + 8, w: 86, h: 28 },
      svg: propSvg(86, 28, '<rect x="2" y="2" width="82" height="24" rx="7" fill="#FFD86A" opacity="0.55"/><rect x="6" y="6" width="74" height="16" rx="4" fill="#FFF3B0" opacity="0.6"/>'),
      period: 3.3,
      motion: (t) => ({ alpha: 0.5 + wave(t, 3.3, 0.35) }),
    },
    // Ноты из динамика: по три сразу, поднимаются влево вверх лёгкой волной и тают (мимо табло счёта).
    {
      key: 'note',
      box: { x: RADIO.x - 24, y: RADIO.y - NOTE.h + 6, w: NOTE.w, h: NOTE.h },
      svg: noteSvg(),
      count: 3,
      particle: true,
      period: 5.2,
      reach: 170,
      motion: (t, i) => {
        const u = cycle(t, 5.2, i / 3);
        return { dx: -u * 62 + wave(u, 0.5, 7, i * 2), dy: -u * 140, rot: wave(u, 0.5, 0.18, i), sx: 0.75 + 0.25 * hump(u), sy: 0.75 + 0.25 * hump(u), alpha: Math.min(1, u * 6) * (1 - u) };
      },
    },
  ],
};
