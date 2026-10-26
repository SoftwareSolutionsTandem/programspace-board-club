// Комната Харитона — «Кабинет профессора» (docs/ART_STYLE.md §12): тёмно-зелёные обои в полоску, книжные шкафы,
// глобус на подставке, лампа с зелёным абажуром на бюро, барометр, латунный прибор, грифельная доска для счёта.
// За окном — ночь. Живое: глобус медленно вращается, звёзды мерцают, пыль в луче лампы, огонёк прибора.
// Модуль строит SVG-строки и не зависит от DOM.
import { cycle, hash01, hump, propSvg, wave, type AmbientPose, type RoomArt } from '../../render/ambient';
import { frame, glow, glowDef, ol, roomDoc, scoreSlate } from '../../render/roomKit';

const WOOD = '#6A4023', WOOD_L = '#8C5A31', BRASS = '#C9A24A', BRASS_D = '#9C7A30';
const WIN = { x: 540, y: 100, w: 220, h: 230 };
const GLOBE = { x: 872, y: 318, r: 58 };
// Лампа: абажур и конус света вниз, на бюро.
const LAMP = { x: 1830, shadeY: 236, deskY: 380 };

const BOOK = ['#7A2E2E', '#2F5A4A', '#2E3F6A', '#8C6A2E', '#5A3A5A', '#3E5A2E', '#9A4A2A'];

function shelfRow(x: number, y: number, w: number, seed: number): string {
  let out = '';
  let bx = x + 8;
  let k = 0;
  while (bx < x + w - 24) {
    const bw = 16 + Math.round(hash01(k, seed) * 12);
    const bh = 66 + Math.round(hash01(k, seed + 1) * 22);
    const lean = hash01(k, seed + 2) > 0.88;
    const c = BOOK[Math.floor(hash01(k, seed + 3) * BOOK.length)]!;
    out += `<rect x="${bx}" y="${y - bh}" width="${bw}" height="${bh}" rx="2" fill="${c}" ${ol(2.4)}${lean ? ` transform="rotate(-8 ${bx} ${y})"` : ''}/>` +
      `<path d="M${bx + 3} ${y - bh + 12} H${bx + bw - 3} M${bx + 3} ${y - 14} H${bx + bw - 3}" stroke="${BRASS}" stroke-width="2"/>`;
    bx += bw + (lean ? 10 : 2);
    k++;
  }
  return out;
}

function bookcase(x: number, w: number, seed: number): string {
  const rows = [150, 270, 390, 510];
  return `<g><rect x="${x}" y="30" width="${w}" height="870" fill="${WOOD}" ${ol(5)}/>
    <rect x="${x + 14}" y="44" width="${w - 28}" height="856" fill="#3A2414"/>
    ${rows.map((ry, i) => shelfRow(x + 14, ry, w - 28, seed + i * 7) + `<rect x="${x + 10}" y="${ry}" width="${w - 20}" height="14" fill="${WOOD_L}" ${ol(3)}/>`).join('')}
    <rect x="${x - 8}" y="22" width="${w + 16}" height="22" rx="4" fill="${WOOD_L}" ${ol(3.5)}/></g>`;
}

function nightWindow(): string {
  const { x, y, w, h } = WIN;
  return `<rect x="${x - 10}" y="${y - 10}" width="${w + 20}" height="${h + 20}" rx="8" fill="${WOOD_L}" ${ol(4)}/>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#khSky)"/>
  <circle cx="${x + 160}" cy="${y + 50}" r="20" fill="#F4EBC8"/><circle cx="${x + 170}" cy="${y + 44}" r="17" fill="#2A3558"/>
  <path d="M${x} ${y + h} V${y + 170} H${x + 40} V${y + 150} H${x + 70} V${y + 176} H${x + 110} V${y + 140} L${x + 130} ${y + 120} L${x + 150} ${y + 140} V${y + 180} H${x + 190} V${y + 160} H${x + w} V${y + h} Z" fill="#1B2238"/>
  ${[[52, 170], [124, 156], [200, 182]].map(([dx, dy]) => `<rect x="${x + dx!}" y="${y + dy!}" width="8" height="10" fill="#E8C46A" opacity="0.8"/>`).join('')}`;
}

function windowFrame(ox: number, oy: number): string {
  const x = WIN.x - ox, y = WIN.y - oy, { w, h } = WIN;
  return `<path d="M${x + w / 2} ${y} V${y + h} M${x} ${y + h * 0.45} H${x + w}" stroke="${WOOD_L}" stroke-width="9"/>
  <path d="M${x + w / 2} ${y} V${y + h} M${x} ${y + h * 0.45} H${x + w}" fill="none" ${ol(2)}/>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" ${ol(4)}/>`;
}

function globeStand(): string {
  const { x, y, r } = GLOBE;
  return `<g>
    <path d="M${x} ${y + r + 8} V${y + r + 40} M${x - 44} 470 L${x} ${y + r + 40} L${x + 44} 470" fill="none" stroke="${WOOD_L}" stroke-width="10" stroke-linecap="round"/>
    <path d="M${x} ${y + r + 8} V${y + r + 40} M${x - 44} 470 L${x} ${y + r + 40} L${x + 44} 470" fill="none" ${ol(2.4)}/>
    <circle cx="${x}" cy="${y}" r="${r}" fill="#3F7DA8" ${ol(4)}/></g>`;
}

/** Латунный меридиан, тень и блик поверх материков (локальные координаты, центр — (r + 14, r + 14)). */
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

// Материки на глобусе: долгота, широта (рад), масштаб.
const LANDS: readonly (readonly [number, number, number])[] = [
  [0, 0.45, 1.1], [1.2, -0.35, 0.9], [2.3, 0.3, 1.3], [3.4, -0.5, 0.8], [4.5, 0.15, 1.0], [5.4, 0.7, 0.7],
];
const GLOBE_PERIOD = 40;

function land(t: number, i: number): AmbientPose {
  const [lon, lat, k] = LANDS[i % LANDS.length]!;
  const phi = lon + (2 * Math.PI * t) / GLOBE_PERIOD;
  const front = Math.cos(phi);
  const r = GLOBE.r * Math.cos(lat);
  // Проекция точки сферы: у края материк сжимается по горизонтали и тает.
  return { dx: r * Math.sin(phi) * 0.86, dy: -GLOBE.r * Math.sin(lat) * 0.8, sx: Math.max(0.05, front) * k, sy: k * Math.cos(lat), alpha: Math.min(1, Math.max(0, front * 2.6)) };
}

function bureau(): string {
  const x = 1480, w = 440, top = LAMP.deskY;
  return `<g>
    <rect x="${x}" y="${top}" width="${w}" height="${900 - top}" fill="${WOOD}" ${ol(5)}/>
    <rect x="${x - 12}" y="${top - 12}" width="${w + 24}" height="18" rx="5" fill="${WOOD_L}" ${ol(3.5)}/>
    ${[0, 1].map((k) => `<rect x="${x + 20 + k * 210}" y="${top + 26}" width="190" height="60" rx="4" fill="none" ${ol(3)}/><circle cx="${x + 115 + k * 210}" cy="${top + 56}" r="6" fill="${BRASS}" ${ol(2)}/>`).join('')}
    <path d="M${LAMP.x} ${top - 12} V${LAMP.shadeY + 26}" stroke="${BRASS}" stroke-width="7"/><path d="M${LAMP.x} ${top - 12} V${LAMP.shadeY + 26}" fill="none" ${ol(2)}/>
    <ellipse cx="${LAMP.x}" cy="${top - 12}" rx="34" ry="8" fill="${BRASS}" ${ol(3)}/>
    <path d="M${LAMP.x - 64} ${LAMP.shadeY + 30} Q${LAMP.x - 60} ${LAMP.shadeY} ${LAMP.x} ${LAMP.shadeY - 2} Q${LAMP.x + 60} ${LAMP.shadeY} ${LAMP.x + 64} ${LAMP.shadeY + 30} Z" fill="#2E7A4A" ${ol(4)}/>
    <path d="M${LAMP.x - 40} ${LAMP.shadeY + 10} Q${LAMP.x - 20} ${LAMP.shadeY + 4} ${LAMP.x} ${LAMP.shadeY + 4}" fill="none" stroke="#7FC79A" stroke-width="4" stroke-linecap="round"/>
    <path d="M${LAMP.x - 60} ${LAMP.shadeY + 32} L${LAMP.x - 110} ${top - 12} L${LAMP.x + 110} ${top - 12} L${LAMP.x + 60} ${LAMP.shadeY + 32} Z" fill="url(#khBeam)"/>
    <g><rect x="1520" y="${top - 60}" width="70" height="48" rx="6" fill="${BRASS_D}" ${ol(3)}/><rect x="1530" y="${top - 52}" width="50" height="22" rx="10" fill="#F2E7C8" ${ol(2)}/>
      <path d="M1555 ${top - 32} L1566 ${top - 48}" ${ol(2)}/><circle cx="1596" cy="${top - 26}" r="7" fill="#5A1A1A" ${ol(2)}/></g>
    <g><rect x="1640" y="${top - 36}" width="90" height="24" rx="3" fill="#7A2E2E" ${ol(2.5)}/><rect x="1646" y="${top - 56}" width="80" height="20" rx="3" fill="#2E3F6A" ${ol(2.5)}/></g></g>`;
}

function barometer(): string {
  const x = 1684, y = 284;
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
    ${glowDef('khWarm', '#FFE2A0', 0.32)}`;
  return roomDoc(defs, `
  <rect width="2400" height="900" fill="url(#khStripe)"/>
  <rect y="0" width="2400" height="30" fill="${WOOD}"/>
  <rect y="390" width="2400" height="510" fill="${WOOD}"/>
  ${[60, 280, 1940, 2160].map((px) => `<rect x="${px}" y="420" width="180" height="110" rx="4" fill="none" stroke="#4A2C16" stroke-width="5"/>`).join('')}
  <path d="M0 390 H2400" stroke="${WOOD_L}" stroke-width="12"/><path d="M0 384 H2400 M0 396 H2400" ${ol(3)}/>
  ${glow('khWarm', 1200, 230, 560, 300)}${glow('khWarm', LAMP.x, LAMP.deskY - 40, 260, 160)}
  ${bookcase(40, 420, 11)}
  ${nightWindow()}${windowFrame(0, 0)}
  <rect x="${WIN.x - 26}" y="${WIN.y + WIN.h + 8}" width="${WIN.w + 52}" height="16" rx="4" fill="${WOOD_L}" ${ol(3.5)}/>
  ${frame(780, 120, 70, 90, BRASS, '<rect width="100" height="100" fill="#E9DDBE"/><circle cx="50" cy="38" r="18" fill="#C9AE90"/><path d="M18 100 C20 66 80 66 82 100 Z" fill="#3E3A36"/>', 8)}
  ${globeStand()}
  ${scoreSlate(BRASS, '#26332C')}
  ${barometer()}${bureau()}
  ${bookcase(1940, 420, 29)}
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
    // Материки глобуса: оборот за 40 с.
    {
      key: 'land',
      box: { x: GLOBE.x - 18, y: GLOBE.y - 13, w: 36, h: 26 },
      pivot: { x: GLOBE.x, y: GLOBE.y },
      svg: propSvg(36, 26, '<path d="M4 12 C2 4 12 1 18 4 C24 0 34 4 32 12 C35 18 28 25 20 22 C14 26 6 22 4 12 Z" fill="#7FAF5A" stroke="#3B5A2A" stroke-width="2"/><path d="M12 10 q4 -3 8 0" fill="none" stroke="#C9B26A" stroke-width="2"/>'),
      count: LANDS.length,
      period: GLOBE_PERIOD,
      reach: GLOBE.r,
      motion: land,
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
      box: { x: 1586, y: LAMP.deskY - 36, w: 20, h: 20 },
      svg: propSvg(20, 20, '<circle cx="10" cy="10" r="9" fill="#FF6A4A" opacity="0.45"/><circle cx="10" cy="10" r="4.5" fill="#FFC2A0"/>'),
      period: 4.7,
      motion: (t) => ({ alpha: 0.15 + 0.85 * hump(cycle(t, 4.7)) ** 2 }),
    },
  ],
};
