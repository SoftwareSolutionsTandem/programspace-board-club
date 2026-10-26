// Комната Харитона — «Кабинет профессора» (docs/ART_STYLE.md §12): тёмно-зелёные обои в полоску, деревянные панели,
// книжные шкафы, бюро с лампой под зелёным абажуром, настольным глобусом и латунным прибором, барометр, дощатый пол.
// За окном — ночь. Живое: глобус медленно вращается, звёзды мерцают, пыль в луче лампы, огонёк прибора.
// Модуль строит SVG-строки и не зависит от DOM.
import { cycle, hash01, hump, propSvg, wave, type AmbientPose, type RoomArt } from '../../render/ambient';
import { FLOOR_Y, floorDefs, floorSvg, glow, glowDef, ol, roomDoc, scoreSlate } from '../../render/roomKit';

const WOOD = '#6A4023', WOOD_L = '#8C5A31', BRASS = '#C9A24A', BRASS_D = '#9C7A30';
// Ночное окно — между книжным шкафом и Харитоном.
const WIN = { x: 724, y: 96, w: 196, h: 226 };
// Настольный глобус на бюро.
const DESK_Y = 380;
// Шар поднят на точёной стойке: низ меридиана — на 30 единиц выше столешницы.
const GLOBE = { x: 1646, y: DESK_Y - 98, r: 46 };
// Лампа: абажур и конус света вниз, на бюро.
const LAMP = { x: 1836, shadeY: 236, deskY: DESK_Y };
// Латунный прибор с красным огоньком — строго по центру корпуса, под шкалой.
const GAUGE = { x: 1500, w: 74, top: DESK_Y - 62, bottom: DESK_Y - 12 };
const GAUGE_LAMP = { x: GAUGE.x + GAUGE.w / 2, y: GAUGE.bottom - 11 };

const BOOK = ['#7A2E2E', '#2F5A4A', '#2E3F6A', '#8C6A2E', '#5A3A5A', '#3E5A2E', '#9A4A2A'];
const LEAN = (10 * Math.PI) / 180;

/** Ряд книг на полке (низ — y). Некоторые книги наклонены и опираются на соседнюю справа. */
function shelfRow(x: number, y: number, w: number, seed: number): string {
  let out = '';
  let bx = x + 8;
  let k = 0;
  while (bx < x + w - 40) {
    const bw = 16 + Math.round(hash01(k, seed) * 12);
    const bh = 66 + Math.round(hash01(k, seed + 1) * 22);
    const lean = hash01(k, seed + 2) > 0.86;
    const c = BOOK[Math.floor(hash01(k, seed + 3) * BOOK.length)]!;
    // Корешок и полоски — одной группой: наклоняются вместе вокруг нижнего правого угла.
    const book = `<rect x="${bx}" y="${y - bh}" width="${bw}" height="${bh}" rx="2" fill="${c}" ${ol(2.4)}/>` +
      `<path d="M${bx + 3} ${y - bh + 12} H${bx + bw - 3} M${bx + 3} ${y - 14} H${bx + bw - 3}" stroke="${BRASS}" stroke-width="2"/>`;
    if (lean) {
      const ox = bh * Math.sin(LEAN);
      out += `<g transform="rotate(${(LEAN * 180) / Math.PI} ${bx + bw} ${y})">${book}</g>`;
      // Следующая книга — вплотную к верхнему краю наклонённой.
      bx += bw + ox + 1;
    } else {
      out += book;
      bx += bw + 2;
    }
    k++;
  }
  return out;
}

/** Книжный шкаф на полу: полки, книги, цоколь. */
function bookcase(x: number, w: number, seed: number): string {
  const rows = [140, 250, 360];
  return `<g><rect x="${x}" y="30" width="${w}" height="${FLOOR_Y + 8 - 30}" fill="${WOOD}" ${ol(5)}/>
    <rect x="${x + 14}" y="44" width="${w - 28}" height="${FLOOR_Y - 30 - 44}" fill="#3A2414"/>
    ${rows.map((ry, i) => shelfRow(x + 14, ry, w - 28, seed + i * 7) + `<rect x="${x + 10}" y="${ry}" width="${w - 20}" height="14" fill="${WOOD_L}" ${ol(3)}/>`).join('')}
    <rect x="${x + 6}" y="${FLOOR_Y - 30}" width="${w - 12}" height="34" fill="${WOOD_L}" ${ol(3)}/>
    <rect x="${x - 8}" y="22" width="${w + 16}" height="22" rx="4" fill="${WOOD_L}" ${ol(3.5)}/></g>`;
}

function nightWindow(): string {
  const { x, y, w, h } = WIN;
  return `<rect x="${x - 10}" y="${y - 10}" width="${w + 20}" height="${h + 20}" rx="8" fill="${WOOD_L}" ${ol(4)}/>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#khSky)"/>
  <circle cx="${x + 146}" cy="${y + 50}" r="20" fill="#F4EBC8"/><circle cx="${x + 156}" cy="${y + 44}" r="17" fill="#2A3558"/>
  <path d="M${x} ${y + h} V${y + 170} H${x + 36} V${y + 150} H${x + 62} V${y + 176} H${x + 98} V${y + 140} L${x + 116} ${y + 120} L${x + 134} ${y + 140} V${y + 180} H${x + 170} V${y + 160} H${x + w} V${y + h} Z" fill="#1B2238"/>
  ${[[46, 170], [110, 156], [180, 182]].map(([dx, dy]) => `<rect x="${x + dx!}" y="${y + dy!}" width="8" height="10" fill="#E8C46A" opacity="0.8"/>`).join('')}`;
}

function windowFrame(ox: number, oy: number): string {
  const x = WIN.x - ox, y = WIN.y - oy, { w, h } = WIN;
  return `<path d="M${x + w / 2} ${y} V${y + h} M${x} ${y + h * 0.45} H${x + w}" stroke="${WOOD_L}" stroke-width="9"/>
  <path d="M${x + w / 2} ${y} V${y + h} M${x} ${y + h * 0.45} H${x + w}" fill="none" ${ol(2)}/>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" ${ol(4)}/>`;
}

// ---------- глобус ----------

const GLOBE_PERIOD = 40;
const STRIPS = 24;
const STRIP_W = (2 * Math.PI * GLOBE.r) / STRIPS;
const MAP_W = STRIP_W * STRIPS, MAP_H = 2 * GLOBE.r;

// Материки (долгота, широта в градусах), грубые контуры в узнаваемых очертаниях.
const LAND: readonly (readonly (readonly [number, number])[])[] = [
  // Северная Америка
  [[-168, 66], [-160, 70], [-140, 70], [-120, 74], [-95, 72], [-80, 68], [-62, 60], [-56, 50], [-66, 45], [-70, 42], [-76, 35], [-81, 30], [-80, 25], [-82, 28], [-90, 30], [-97, 26], [-97, 20], [-92, 18], [-87, 21], [-88, 15], [-83, 10], [-78, 8], [-86, 13], [-92, 15], [-105, 20], [-110, 24], [-115, 30], [-118, 34], [-124, 40], [-124, 48], [-130, 55], [-140, 60], [-150, 60], [-160, 58], [-165, 62]],
  // Гренландия
  [[-52, 60], [-42, 60], [-22, 70], [-20, 80], [-40, 83], [-60, 80], [-58, 70]],
  // Южная Америка
  [[-79, 9], [-75, 11], [-62, 10], [-50, 0], [-35, -6], [-38, -14], [-40, -22], [-48, -28], [-58, -38], [-65, -42], [-68, -50], [-70, -55], [-74, -50], [-73, -40], [-71, -30], [-70, -18], [-76, -14], [-81, -5], [-80, 0]],
  // Евразия
  [[-10, 36], [-9, 43], [-2, 44], [-4, 48], [2, 51], [8, 54], [8, 57], [5, 62], [14, 68], [25, 71], [40, 68], [55, 70], [70, 73], [90, 76], [110, 74], [130, 72], [150, 70], [170, 69], [180, 66], [170, 60], [160, 55], [140, 52], [135, 45], [128, 38], [122, 31], [120, 23], [110, 20], [108, 12], [104, 9], [100, 14], [98, 8], [100, 4], [103, 2], [98, 15], [94, 17], [90, 22], [85, 20], [80, 13], [77, 8], [72, 20], [66, 25], [58, 24], [56, 27], [50, 30], [48, 28], [54, 22], [58, 18], [52, 15], [44, 12], [42, 16], [38, 22], [34, 28], [35, 32], [36, 36], [28, 36], [26, 40], [22, 38], [20, 40], [16, 38], [18, 40], [14, 42], [12, 44], [8, 44], [3, 42], [0, 38], [-5, 36]],
  // Африка
  [[-17, 21], [-16, 12], [-12, 7], [-5, 5], [8, 4], [10, 0], [12, -6], [13, -12], [12, -18], [15, -27], [20, -35], [26, -34], [32, -28], [35, -22], [40, -15], [40, -10], [40, -3], [46, 2], [51, 11], [44, 11], [38, 17], [34, 26], [32, 31], [25, 32], [20, 31], [11, 33], [10, 37], [0, 36], [-6, 35], [-10, 30], [-14, 26]],
  // Великобритания, Мадагаскар, Япония, Борнео, Суматра, Новая Зеландия
  [[-6, 50], [2, 51], [0, 54], [-3, 58], [-6, 57], [-5, 54]],
  [[44, -25], [48, -26], [50, -15], [49, -12], [44, -17]],
  [[130, 32], [135, 34], [140, 36], [142, 40], [141, 44], [139, 40], [135, 35]],
  [[110, 0], [117, 7], [119, 1], [116, -4], [110, -2]],
  [[95, 5], [106, -6], [102, -4]],
  [[172, -35], [178, -38], [174, -41], [168, -46], [167, -44]],
  // Австралия
  [[114, -22], [114, -34], [118, -35], [130, -32], [138, -35], [146, -39], [150, -37], [153, -30], [153, -25], [146, -19], [142, -11], [136, -12], [130, -12], [122, -17]],
  // Антарктида
  [[-180, -78], [-150, -75], [-120, -73], [-90, -72], [-60, -64], [-40, -72], [0, -70], [40, -68], [80, -66], [120, -66], [160, -70], [180, -78], [180, -90], [-180, -90]],
];

/** Карта мира в равновеликой цилиндрической проекции (y ∝ sin широты) — так полосы встают на диск без искажений по вертикали. */
function worldMap(): string {
  const px = (lon: number) => ((lon + 180) / 360) * MAP_W;
  const py = (lat: number) => GLOBE.r - GLOBE.r * Math.sin((lat * Math.PI) / 180);
  const lands = LAND.map((poly) => `<path d="M${poly.map(([lo, la]) => `${px(lo).toFixed(1)} ${py(la).toFixed(1)}`).join(' L')} Z" fill="#8DBA62" stroke="#3B5A2A" stroke-width="1.3" stroke-linejoin="round"/>`).join('');
  const grid = [-60, -30, 0, 30, 60].map((la) => `<path d="M0 ${py(la)} H${MAP_W}" stroke="#BFD9EC" stroke-width="0.8" opacity="${la === 0 ? 0.7 : 0.35}"/>`).join('') +
    Array.from({ length: 12 }, (_, k) => `<path d="M${(k * MAP_W) / 12} 0 V${MAP_H}" stroke="#BFD9EC" stroke-width="0.8" opacity="0.3"/>`).join('');
  return propSvg(MAP_W, MAP_H, `<rect width="${MAP_W}" height="${MAP_H}" fill="#3F7DA8"/>${grid}${lands}`);
}

/** Полоса i карты на диске: долгота середины полосы поворачивается вместе с глобусом. */
function strip(t: number, i: number): AmbientPose {
  const phi = ((i + 0.5) / STRIPS) * 2 * Math.PI - Math.PI + (2 * Math.PI * t) / GLOBE_PERIOD;
  const c = Math.cos(phi);
  // Обратная сторона глобуса не видна; полосы чуть шире, чтобы между ними не было щелей.
  return { dx: GLOBE.r * Math.sin(phi), sx: Math.max(0.001, c) * 1.06, alpha: c > 0.02 ? 1 : 0 };
}

function globeStand(): string {
  const { x, y, r } = GLOBE;
  const top = y + r + 10, foot = DESK_Y - 12;
  const mid = (top + foot) / 2;
  // Точёная деревянная стойка: круглое основание, балясина с утолщением, латунная муфта под осью меридиана.
  return `<g>
    <ellipse cx="${x}" cy="${foot}" rx="34" ry="8" fill="${WOOD}" ${ol(3)}/>
    <path d="M${x - 30} ${foot - 2} Q${x} ${foot - 14} ${x + 30} ${foot - 2}" fill="${WOOD_L}" ${ol(2.4)}/>
    <path d="M${x - 6} ${foot - 9} C${x - 14} ${mid + 6} ${x - 14} ${mid - 6} ${x - 5} ${top + 4} L${x + 5} ${top + 4} C${x + 14} ${mid - 6} ${x + 14} ${mid + 6} ${x + 6} ${foot - 9} Z" fill="${WOOD_L}" ${ol(2.4)}/>
    <path d="M${x - 11} ${mid} H${x + 11}" stroke="${WOOD}" stroke-width="2"/>
    <rect x="${x - 7}" y="${top - 2}" width="14" height="7" rx="2" fill="${BRASS}" ${ol(1.8)}/>
    <circle cx="${x}" cy="${y}" r="${r}" fill="#3F7DA8" ${ol(4)}/></g>`;
}

/** Латунный меридиан, тень и блик поверх карты (локальные координаты, центр — (r + 14, r + 14)). */
function globeOverlay(): string {
  const { r } = GLOBE;
  const c = r + 14;
  return propSvg(2 * c, 2 * c, `
    <path d="M${c + r * 0.15} ${c - r} A${r} ${r} 0 0 1 ${c + r * 0.15} ${c + r} A${r * 0.7} ${r} 0 0 0 ${c + r * 0.15} ${c - r} Z" fill="#0E1E36" opacity="0.32"/>
    <ellipse cx="${c - r * 0.4}" cy="${c - r * 0.4}" rx="${r * 0.24}" ry="${r * 0.16}" fill="#FFFFFF" opacity="0.28"/>
    <circle cx="${c}" cy="${c}" r="${r}" fill="none" ${ol(4)}/>
    <path d="M${c} ${c - r - 10} A${r + 10} ${r + 10} 0 0 1 ${c} ${c + r + 10}" fill="none" stroke="${BRASS}" stroke-width="7"/>
    <path d="M${c} ${c - r - 10} A${r + 10} ${r + 10} 0 0 1 ${c} ${c + r + 10}" fill="none" ${ol(2)}/>
    <circle cx="${c}" cy="${c - r - 8}" r="4" fill="${BRASS}" ${ol(2)}/><circle cx="${c}" cy="${c + r + 8}" r="4" fill="${BRASS}" ${ol(2)}/>`);
}

// ---------- бюро ----------

function bureau(): string {
  const x = 1468, w = 452, top = DESK_Y;
  const g = GAUGE;
  return `<g>
    <rect x="${x}" y="${top}" width="${w}" height="${FLOOR_Y - 6 - top}" fill="${WOOD}" ${ol(5)}/>
    <rect x="${x - 12}" y="${top - 12}" width="${w + 24}" height="18" rx="5" fill="${WOOD_L}" ${ol(3.5)}/>
    ${[0, 1].map((k) => `<rect x="${x + 20 + k * 216}" y="${top + 14}" width="196" height="34" rx="4" fill="none" ${ol(3)}/><circle cx="${x + 118 + k * 216}" cy="${top + 31}" r="5" fill="${BRASS}" ${ol(2)}/>`).join('')}
    <path d="M${x + 8} ${FLOOR_Y - 6} v14 M${x + w - 8} ${FLOOR_Y - 6} v14" ${ol(7)}/>
    <path d="M${LAMP.x} ${top - 12} V${LAMP.shadeY + 26}" stroke="${BRASS}" stroke-width="7"/><path d="M${LAMP.x} ${top - 12} V${LAMP.shadeY + 26}" fill="none" ${ol(2)}/>
    <ellipse cx="${LAMP.x}" cy="${top - 12}" rx="34" ry="8" fill="${BRASS}" ${ol(3)}/>
    <path d="M${LAMP.x - 64} ${LAMP.shadeY + 30} Q${LAMP.x - 60} ${LAMP.shadeY} ${LAMP.x} ${LAMP.shadeY - 2} Q${LAMP.x + 60} ${LAMP.shadeY} ${LAMP.x + 64} ${LAMP.shadeY + 30} Z" fill="#2E7A4A" ${ol(4)}/>
    <path d="M${LAMP.x - 40} ${LAMP.shadeY + 10} Q${LAMP.x - 20} ${LAMP.shadeY + 4} ${LAMP.x} ${LAMP.shadeY + 4}" fill="none" stroke="#7FC79A" stroke-width="4" stroke-linecap="round"/>
    <path d="M${LAMP.x - 60} ${LAMP.shadeY + 32} L${LAMP.x - 110} ${top - 12} L${LAMP.x + 110} ${top - 12} L${LAMP.x + 60} ${LAMP.shadeY + 32} Z" fill="url(#khBeam)"/>
    <g><rect x="${g.x}" y="${g.top}" width="${g.w}" height="${g.bottom - g.top}" rx="6" fill="${BRASS_D}" ${ol(3)}/>
      <rect x="${g.x + 10}" y="${g.top + 7}" width="${g.w - 20}" height="20" rx="9" fill="#F2E7C8" ${ol(2)}/>
      <path d="M${g.x + g.w / 2} ${g.top + 25} L${g.x + g.w / 2 + 10} ${g.top + 11}" ${ol(2)}/>
      <circle cx="${GAUGE_LAMP.x}" cy="${GAUGE_LAMP.y}" r="7" fill="#5A1A1A" ${ol(2)}/>
      <circle cx="${g.x + 9}" cy="${g.bottom - 9}" r="3" fill="${BRASS}" ${ol(1.4)}/><circle cx="${g.x + g.w - 9}" cy="${g.bottom - 9}" r="3" fill="${BRASS}" ${ol(1.4)}/></g>
    <g><rect x="1712" y="${top - 36}" width="72" height="24" rx="3" fill="#7A2E2E" ${ol(2.5)}/><rect x="1718" y="${top - 56}" width="62" height="20" rx="3" fill="#2E3F6A" ${ol(2.5)}/></g></g>`;
}

function barometer(): string {
  const x = 1836, y = 160;
  return `<g><circle cx="${x}" cy="${y}" r="40" fill="${WOOD_L}" ${ol(4)}/><circle cx="${x}" cy="${y}" r="30" fill="#F2E7C8" ${ol(2.5)}/>
    ${[-60, -30, 0, 30, 60].map((a) => { const r = (a * Math.PI) / 180; return `<path d="M${x + Math.sin(r) * 22} ${y - Math.cos(r) * 22} L${x + Math.sin(r) * 28} ${y - Math.cos(r) * 28}" ${ol(2)}/>`; }).join('')}
    <path d="M${x} ${y} L${x + 12} ${y - 20}" ${ol(3)}/><circle cx="${x}" cy="${y}" r="4" fill="${BRASS}" ${ol(1.6)}/></g>`;
}

function background(): string {
  const defs = `
    <pattern id="khStripe" width="60" height="900" patternUnits="userSpaceOnUse">
      <rect width="60" height="900" fill="#2F4A3A"/><rect x="30" width="30" height="900" fill="#355342"/>
      <path d="M30 0 V900" stroke="#C9A24A" stroke-width="1.4" opacity="0.35"/>
    </pattern>
    <linearGradient id="khSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1E2848"/><stop offset="1" stop-color="#3A4A78"/></linearGradient>
    <linearGradient id="khBeam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF1B8" stop-opacity="0.5"/><stop offset="1" stop-color="#FFF1B8" stop-opacity="0.08"/></linearGradient>
    ${glowDef('khWarm', '#FFE2A0', 0.32)}${floorDefs}`;
  return roomDoc(defs, `
  <rect width="2400" height="${FLOOR_Y}" fill="url(#khStripe)"/>
  <rect y="0" width="2400" height="30" fill="${WOOD}"/>
  <rect y="338" width="2400" height="${FLOOR_Y - 338}" fill="${WOOD}"/>
  <path d="M0 338 H2400" stroke="${WOOD_L}" stroke-width="10"/><path d="M0 333 H2400 M0 343 H2400" ${ol(3)}/>
  ${Array.from({ length: 24 }, (_, k) => `<rect x="${k * 100 + 12}" y="356" width="76" height="52" rx="3" fill="none" stroke="#4A2C16" stroke-width="4"/>`).join('')}
  ${floorSvg(WOOD)}
  ${glow('khWarm', 1200, 230, 560, 300)}${glow('khWarm', LAMP.x, LAMP.deskY - 40, 260, 160)}
  ${bookcase(40, 660, 11)}
  ${nightWindow()}${windowFrame(0, 0)}
  <rect x="${WIN.x - 26}" y="${WIN.y + WIN.h + 8}" width="${WIN.w + 52}" height="16" rx="4" fill="${WOOD_L}" ${ol(3.5)}/>
  ${scoreSlate(BRASS, '#26332C')}
  ${barometer()}${bureau()}${globeStand()}
  ${bookcase(1950, 420, 29)}
  `);
}

export const KHARITON_ROOM: RoomArt = {
  id: 'khariton',
  name: 'Кабинет профессора',
  backgroundSvg: background,
  props: [
    // Звёзды за окном мерцают вразнобой.
    {
      key: 'star',
      box: { x: WIN.x + 6, y: WIN.y + 8, w: 12, h: 12 },
      svg: propSvg(12, 12, '<path d="M6 0 L7.2 4.8 L12 6 L7.2 7.2 L6 12 L4.8 7.2 L0 6 L4.8 4.8 Z" fill="#FFF6D8"/>'),
      count: 7,
      period: 12,
      reach: WIN.w,
      motion: (t, i) => {
        const per = 12 / (2 + (i % 3));
        return { dx: 8 + hash01(i, 7) * (WIN.w - 40), dy: hash01(i, 8) * 96, alpha: 0.55 + wave(t, per, 0.4, hash01(i, 9) * 6), sx: 0.7 + 0.3 * hash01(i, 10), sy: 0.7 + 0.3 * hash01(i, 10) };
      },
    },
    { key: 'frame', box: { x: WIN.x - 4, y: WIN.y - 4, w: WIN.w + 8, h: WIN.h + 8 }, svg: propSvg(WIN.w + 8, WIN.h + 8, windowFrame(WIN.x - 4, WIN.y - 4)) },
    // Глобус: полная карта мира из 24 полос по долготе, оборот за 40 с; видна только передняя половина.
    {
      key: 'map',
      box: { x: GLOBE.x - STRIP_W / 2, y: GLOBE.y - GLOBE.r, w: STRIP_W, h: MAP_H },
      pivot: { x: GLOBE.x, y: GLOBE.y },
      svg: worldMap(),
      frames: STRIPS,
      clip: { x: GLOBE.x, y: GLOBE.y, r: GLOBE.r },
      period: GLOBE_PERIOD,
      reach: GLOBE.r,
      motion: strip,
    },
    { key: 'globe', box: { x: GLOBE.x - GLOBE.r - 14, y: GLOBE.y - GLOBE.r - 14, w: 2 * GLOBE.r + 28, h: 2 * GLOBE.r + 28 }, svg: globeOverlay() },
    // Пыль в луче лампы.
    {
      key: 'dust',
      box: { x: LAMP.x - 3, y: LAMP.shadeY + 34, w: 5, h: 5 },
      svg: propSvg(5, 5, '<circle cx="2.5" cy="2.5" r="2" fill="#FFF6D0"/>'),
      count: 8,
      particle: true,
      period: 15,
      reach: 110,
      motion: (t, i) => {
        const per = 15 / (1 + (i % 3));
        const u = cycle(t, per, hash01(i, 11));
        const spread = (hash01(i, 12) - 0.5) * 2;
        return { dx: spread * (24 + u * 60) + wave(t, 3.75, 4, i), dy: u * 96, alpha: hump(u) * 0.75 };
      },
    },
    // Огонёк латунного прибора на бюро: медленно загорается и гаснет.
    {
      key: 'blink',
      box: { x: GAUGE_LAMP.x - 10, y: GAUGE_LAMP.y - 10, w: 20, h: 20 },
      svg: propSvg(20, 20, '<circle cx="10" cy="10" r="9" fill="#FF6A4A" opacity="0.45"/><circle cx="10" cy="10" r="4.5" fill="#FFC2A0"/>'),
      period: 4.7,
      motion: (t) => ({ alpha: 0.15 + 0.85 * hump(cycle(t, 4.7)) ** 2 }),
    },
  ],
};
