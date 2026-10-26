// Комната Костяна — «Комната с постерами» (docs/ART_STYLE.md §12): сине-фиолетовая стена, афиши рок-фестиваля и
// скейт-контеста, светодиодная лента под потолком, классическая гитара на стойке, телевизор на тумбе с приставкой,
// скейт, кровать, дощатый пол, окно на вечерний город.
// Живое: лента меняет оттенок, гитара чуть покачивается, музыкальный канал по телевизору, огни города и самолёт.
// Модуль строит SVG-строки и не зависит от DOM.
import { cycle, hash01, hueTint, propSvg, wave, type RoomArt } from '../../render/ambient';
import { FLOOR_Y, floorDefs, floorSvg, glow, glowDef, ol, roomDoc, scoreSlate } from '../../render/roomKit';

const NEON = '#FF4FA0', CYAN = '#3FE0E8', WOOD = '#5A3A2A', INK = '#1E1C3E';
// Окно на вечерний город — слева, между постером и Костяном; гитара стоит на полу перед окном.
const WIN = { x: 694, y: 104, w: 220, h: 214 };
// Телевизор на тумбе под табло счёта; экран — единицы фона.
const TV = { x: 1476, y: 244, w: 240, h: 128 };
const SCREEN = { x: TV.x + 12, y: TV.y + 10, w: TV.w - 24, h: TV.h - 20 };
const STAND_TOP = TV.y + TV.h + 8;
const GUITAR = { x: 868, base: FLOOR_Y + 6, w: 100, h: 250 };
// Постеры — целиком в кадре на широком экране (единицы фона).
const POSTER_L = { x: 516, y: 122, w: 150, h: 216 };
const POSTER_R = { x: 1764, y: 124, w: 110, h: 200 };
const KX = WIN.w / 260;

function city(): string {
  const { x, y, w, h } = WIN;
  const b = y + h;
  const towers = [[0, 120, 40], [44, 90, 34], [82, 140, 46], [132, 70, 30], [166, 110, 42], [212, 150, 48]];
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#kcSky)"/>
  ${towers.map(([dx, th, tw]) => `<rect x="${x + dx! * KX}" y="${b - th!}" width="${tw! * KX}" height="${th}" fill="${INK}"/>`).join('')}
  <rect x="${x + 140 * KX}" y="${b - 92}" width="3" height="22" fill="${INK}"/>`;
}

// Окна домов: каждое светится своим ритмом (координаты — от левого верхнего угла стекла).
const LIGHTS: readonly (readonly [number, number])[] = [[10, 128], [22, 150], [56, 156], [94, 116], [106, 146], [140, 176], [178, 136], [190, 164], [224, 100], [236, 132]].map(([lx, ly]) => [lx! * KX, ly!] as const);

function blinds(ox: number, oy: number): string {
  const x = WIN.x - ox, y = WIN.y - oy, { w, h } = WIN;
  // Жалюзи подняты: собраны сверху; рама.
  return `<rect x="${x - 6}" y="${y - 6}" width="${w + 12}" height="34" rx="4" fill="#D8D4E8" ${ol(3)}/>
  ${[0, 1, 2].map((k) => `<path d="M${x - 4} ${y + 4 + k * 9} H${x + w + 4}" stroke="#A8A2C2" stroke-width="2"/>`).join('')}
  <path d="M${x + 40} ${y + 28} V${y + 70}" stroke="#D8D4E8" stroke-width="2"/>
  <path d="M${x + w / 2} ${y + 28} V${y + h}" stroke="#E8E4F4" stroke-width="8"/><path d="M${x + w / 2} ${y + 28} V${y + h}" fill="none" ${ol(2)}/>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#E8E4F4" stroke-width="10"/>
  <rect x="${x - 6}" y="${y - 6}" width="${w + 12}" height="${h + 12}" rx="5" fill="none" ${ol(4)}/>`;
}

/** Классическая гитара: дека из ели с волокнами, тёмная обечайка, розетка, подставка, грифель с ладами, головка с колками. */
function guitar(): string {
  const { w, h } = GUITAR;
  const cx = w / 2, base = h - 6;
  const body = `M${cx} ${base - 112} C${cx - 26} ${base - 114} ${cx - 34} ${base - 96} ${cx - 30} ${base - 80} C${cx - 26} ${base - 68} ${cx - 44} ${base - 58} ${cx - 44} ${base - 36} C${cx - 44} ${base - 10} ${cx - 20} ${base} ${cx} ${base} C${cx + 20} ${base} ${cx + 44} ${base - 10} ${cx + 44} ${base - 36} C${cx + 44} ${base - 58} ${cx + 26} ${base - 68} ${cx + 30} ${base - 80} C${cx + 34} ${base - 96} ${cx + 26} ${base - 114} ${cx} ${base - 112} Z`;
  const grain = [-30, -20, -10, 0, 10, 20, 30].map((dx) => `<path d="M${cx + dx} ${base - 108 + Math.abs(dx) * 0.4} C${cx + dx + 2} ${base - 70} ${cx + dx - 2} ${base - 40} ${cx + dx} ${base - 4 - Math.abs(dx) * 0.3}" stroke="#C48A48" stroke-width="1.2" fill="none" opacity="0.6"/>`).join('');
  const frets = Array.from({ length: 8 }, (_, k) => `<path d="M${cx - 6} ${base - 118 - k * 11} H${cx + 6}" stroke="#D8D2C0" stroke-width="1.4"/>`).join('');
  return propSvg(w, h, `
    <path d="M${cx} ${base} L${cx - 22} ${h} M${cx} ${base} L${cx + 22} ${h} M${cx} ${base - 6} V${base - 30}" fill="none" stroke="#2A2A36" stroke-width="5" stroke-linecap="round"/>
    <rect x="${cx - 7}" y="${base - 206}" width="14" height="100" rx="3" fill="#5A3A22" ${ol(2.6)}/>${frets}
    <path d="M${cx - 11} ${base - 206} L${cx - 12} ${base - 236} Q${cx} ${base - 242} ${cx + 12} ${base - 236} L${cx + 11} ${base - 206} Z" fill="#6E4A2C" ${ol(2.4)}/>
    <path d="M${cx - 4} ${base - 210} V${base - 232} M${cx + 4} ${base - 210} V${base - 232}" stroke="#2A1A10" stroke-width="3" stroke-linecap="round"/>
    ${[0, 1, 2].map((k) => `<circle cx="${cx - 15}" cy="${base - 228 + k * 8}" r="3" fill="#F2E7C8" ${ol(1.2)}/><circle cx="${cx + 15}" cy="${base - 228 + k * 8}" r="3" fill="#F2E7C8" ${ol(1.2)}/>`).join('')}
    <path d="${body}" fill="#8A5A2E" ${ol(3.4)}/>
    <g transform="translate(${cx} ${base - 56}) scale(0.92) translate(${-cx} ${-(base - 56)})"><path d="${body}" fill="#E2B06A"/>${grain}</g>
    <circle cx="${cx}" cy="${base - 70}" r="13" fill="#2A1A10" ${ol(2)}/>
    <circle cx="${cx}" cy="${base - 70}" r="16.5" fill="none" stroke="#5A8A5A" stroke-width="2.2"/><circle cx="${cx}" cy="${base - 70}" r="19" fill="none" stroke="#8A5A2E" stroke-width="1.6"/>
    <rect x="${cx - 16}" y="${base - 30}" width="32" height="8" rx="2" fill="#5A3A22" ${ol(1.8)}/>
    <path d="M${cx - 5} ${base - 206} V${base - 26} M${cx - 3} ${base - 206} V${base - 26} M${cx - 1} ${base - 206} V${base - 26} M${cx + 1} ${base - 206} V${base - 26} M${cx + 3} ${base - 206} V${base - 26} M${cx + 5} ${base - 206} V${base - 26}" stroke="#F4F0E6" stroke-width="0.7" opacity="0.9"/>
    <path d="M${cx - 34} ${base - 40} C${cx - 36} ${base - 60} ${cx - 26} ${base - 72} ${cx - 22} ${base - 78}" stroke="#FFF3D6" stroke-width="2.4" fill="none" opacity="0.6" stroke-linecap="round"/>`);
}

const text = (x: number, y: number, size: number, fill: string, str: string, extra = '') =>
  `<text x="${x}" y="${y}" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="${size}" fill="${fill}" text-anchor="middle" ${extra}>${str}</text>`;

/** Афиша рок-фестиваля: сцена, лучи прожекторов, гитарист в прыжке, толпа, название и дата. */
function rockPoster(): string {
  const { x, y, w, h } = POSTER_L;
  const cx = x + w / 2;
  const beams = [[-44, '#F4C542'], [0, '#FF4FA0'], [44, '#3FE0E8']].map(([dx, c]) => `<path d="M${cx + Number(dx)} ${y + 40} L${cx + Number(dx) - 30} ${y + h - 46} L${cx + Number(dx) + 30} ${y + h - 46} Z" fill="${c}" opacity="0.28"/>`).join('');
  const crowd = Array.from({ length: 9 }, (_, k) => {
    const hx = x + 12 + k * 15.5, hy = y + h - 34 + (k % 2) * 4;
    return `<circle cx="${hx}" cy="${hy}" r="6" fill="#0E0C22"/>` + (k % 3 === 1 ? `<path d="M${hx + 3} ${hy - 4} l6 -14 l3 -2" stroke="#0E0C22" stroke-width="3.4" stroke-linecap="round" fill="none"/>` : '');
  }).join('');
  // Гитарист: силуэт с электрогитарой, одна рука вверх.
  const g = `<g transform="translate(${cx} ${y + h - 72})">
    <circle cx="0" cy="-58" r="9" fill="#0E0C22"/>
    <path d="M-10 -48 L10 -48 L8 -10 L-8 -10 Z" fill="#0E0C22"/>
    <path d="M-8 -10 L-18 18 M8 -10 L16 18" stroke="#0E0C22" stroke-width="7" stroke-linecap="round"/>
    <path d="M8 -44 L22 -64 L26 -78" stroke="#0E0C22" stroke-width="5" stroke-linecap="round" fill="none"/>
    <path d="M-10 -44 L-18 -28" stroke="#0E0C22" stroke-width="5" stroke-linecap="round"/>
    <path d="M-24 -24 C-30 -30 -22 -38 -14 -32 L14 -46 L30 -56 L32 -52 L16 -42 C20 -34 12 -24 2 -28 C-6 -18 -18 -18 -24 -24 Z" fill="#E2483A" stroke="#0E0C22" stroke-width="2"/>
    <path d="M28 -80 l4 -6 M30 -72 l7 -2" stroke="#F4C542" stroke-width="2.4" stroke-linecap="round"/></g>`;
  return `<g>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#2A1450" ${ol(3.5)}/>
    <rect x="${x + 6}" y="${y + 6}" width="${w - 12}" height="${h - 12}" fill="#3A1C6A"/>
    ${beams}
    <rect x="${x + 6}" y="${y + h - 52}" width="${w - 12}" height="12" fill="#5A3A8A"/>
    ${g}${crowd}
    ${text(cx, y + 34, 25, '#F4C542', 'РОК', 'stroke="#0E0C22" stroke-width="1.2"')}${text(cx, y + 56, 19, '#FF4FA0', 'ФЕСТ', 'stroke="#0E0C22" stroke-width="1"')}
    ${text(cx, y + h - 12, 12, '#F7EEDC', '12 АВГУСТА')}
    <path d="M${x + 4} ${y + 4} l10 0 l-10 10 Z M${x + w - 4} ${y + 4} l-10 0 l10 10 Z" fill="#F7EEDC"/></g>`;
}

/** Афиша скейт-контеста: закат, рампа, скейтер в прыжке, надписи. */
function skatePoster(): string {
  const { x, y, w, h } = POSTER_R;
  const cx = x + w / 2;
  return `<g>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#F4A24A" ${ol(3.5)}/>
    <rect x="${x + 5}" y="${y + 5}" width="${w - 10}" height="${h - 10}" fill="url(#kcPoster)"/>
    <circle cx="${cx + 18}" cy="${y + 78}" r="22" fill="#FFE08A"/>
    <path d="M${x + 5} ${y + h - 30} H${x + 30} C${x + 60} ${y + h - 30} ${x + 80} ${y + h - 60} ${x + 86} ${y + h - 108} L${x + w - 5} ${y + h - 108} V${y + h - 5} H${x + 5} Z" fill="#8A8FA6" stroke="#1E1C3E" stroke-width="2"/>
    <path d="M${x + 86} ${y + h - 108} H${x + w - 5}" stroke="#E8E4F4" stroke-width="4"/>
    <g transform="translate(${cx - 8} ${y + 112}) rotate(-18)">
      <circle cx="0" cy="-30" r="7" fill="#F2C6A8" stroke="#1E1C3E" stroke-width="1.8"/>
      <path d="M-6 -36 q6 -6 12 0" fill="#1E1C3E"/>
      <path d="M-8 -22 L8 -22 L6 0 L-6 0 Z" fill="#E2483A" stroke="#1E1C3E" stroke-width="1.8"/>
      <path d="M-8 -18 L-20 -26 M8 -18 L20 -8" stroke="#F2C6A8" stroke-width="4" stroke-linecap="round"/>
      <path d="M-4 0 L-12 12 M4 0 L10 12" stroke="#3E5AA8" stroke-width="5" stroke-linecap="round"/>
      <rect x="-20" y="12" width="40" height="5" rx="2.5" fill="#3FE0E8" stroke="#1E1C3E" stroke-width="1.6"/>
      <circle cx="-12" cy="19" r="2.6" fill="#F4C542"/><circle cx="12" cy="19" r="2.6" fill="#F4C542"/></g>
    <path d="M${cx - 34} ${y + 146} q-8 4 -14 0 M${cx - 30} ${y + 154} q-8 4 -14 0" stroke="#FFFFFF" stroke-width="2" fill="none" opacity="0.8"/>
    ${text(cx, y + 28, 17, '#1E1C3E', 'СКЕЙТ')}${text(cx, y + 46, 13, '#FFFFFF', 'КОНТЕСТ', 'stroke="#1E1C3E" stroke-width="0.8"')}
    ${text(cx, y + h - 12, 13, '#FFFFFF', 'ФИНАЛ', 'stroke="#1E1C3E" stroke-width="0.8"')}</g>`;
}

function tvStand(): string {
  const t = TV, s = SCREEN;
  return `<g>
    <rect x="${t.x - 16}" y="${STAND_TOP}" width="${t.w + 32}" height="${FLOOR_Y - 4 - STAND_TOP}" rx="4" fill="#4A3046" ${ol(3.5)}/>
    <rect x="${t.x - 22}" y="${STAND_TOP - 6}" width="${t.w + 44}" height="12" rx="4" fill="${WOOD}" ${ol(3)}/>
    <rect x="${t.x + 4}" y="${STAND_TOP + 14}" width="${t.w - 8}" height="${FLOOR_Y - 22 - STAND_TOP - 14}" rx="3" fill="#2E1E30" ${ol(2.4)}/>
    <rect x="${t.x + 20}" y="${STAND_TOP + 22}" width="96" height="16" rx="5" fill="#E8E4F4" ${ol(2.4)}/><circle cx="${t.x + 104}" cy="${STAND_TOP + 30}" r="3" fill="${CYAN}"/>
    <path d="M${t.x + 140} ${STAND_TOP + 38} c0 -12 10 -14 16 -8 c6 -6 16 -4 16 8 c0 8 -8 10 -16 6 c-8 4 -16 2 -16 -6 Z" fill="#2A2A36" ${ol(2)}/>
    <path d="M${t.x + 6} ${FLOOR_Y - 4} v10 M${t.x + t.w - 6} ${FLOOR_Y - 4} v10" ${ol(6)}/>
    <rect x="${t.x}" y="${t.y}" width="${t.w}" height="${t.h}" rx="8" fill="#1A1A26" ${ol(4)}/>
    <rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" rx="3" fill="url(#kcScreenBg)"/>
    <path d="M${t.x + t.w / 2 - 30} ${t.y + t.h} L${t.x + t.w / 2 - 40} ${STAND_TOP - 6} H${t.x + t.w / 2 + 40} L${t.x + t.w / 2 + 30} ${t.y + t.h} Z" fill="#1A1A26" ${ol(2.6)}/>
    <circle cx="${t.x + t.w - 14}" cy="${t.y + t.h - 5}" r="2.4" fill="#FF5A5A"/></g>`;
}

/** Постоянное на экране музыкального канала: логотип, «певица» у микрофона, пол сцены. */
function tvScene(): string {
  const s = SCREEN;
  return `<g>
    <rect x="${s.x + 6}" y="${s.y + 6}" width="40" height="16" rx="4" fill="${NEON}"/>${text(s.x + 26, s.y + 18, 11, '#FFFFFF', 'МУЗ')}
    <circle cx="${s.x + s.w - 40}" cy="${s.y + 40}" r="10" fill="#F2C6A8"/><path d="M${s.x + s.w - 52} ${s.y + 34} q12 -16 24 0 v16 q-4 -6 -4 -10 q-8 -6 -16 0 q0 6 -4 10 Z" fill="#F4C542"/>
    <path d="M${s.x + s.w - 56} ${s.y + 86} C${s.x + s.w - 56} ${s.y + 58} ${s.x + s.w - 24} ${s.y + 58} ${s.x + s.w - 24} ${s.y + 86} Z" fill="#3FE0E8"/>
    <path d="M${s.x + s.w - 62} ${s.y + 86} V${s.y + 56}" stroke="#C9CED6" stroke-width="2"/><circle cx="${s.x + s.w - 62}" cy="${s.y + 54}" r="4" fill="#C9CED6"/>
    <rect x="${s.x}" y="${s.y + s.h - 18}" width="${s.w}" height="18" fill="#0E0C22" opacity="0.85"/></g>`;
}

const EQ = { n: 7, w: 12, h: 48, gap: 17 };
const TICKER = { w: 520, h: 14, loop: 260 };
const tickerSvg = (): string => {
  const line = '★ ХИТ-ПАРАД ★ НОВЫЕ КЛИПЫ ★ ПРЯМОЙ ЭФИР ';
  return propSvg(TICKER.w, TICKER.h, [0, TICKER.loop].map((ox) => `<text x="${ox + 4}" y="11" font-family="Arial, sans-serif" font-weight="700" font-size="10.5" fill="#FFE08A" textLength="${TICKER.loop - 8}" lengthAdjust="spacingAndGlyphs">${line}</text>`).join(''));
};

function background(): string {
  const defs = `
    <linearGradient id="kcWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2C2A5C"/><stop offset="1" stop-color="#3D2F6A"/></linearGradient>
    <linearGradient id="kcSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3A3478"/><stop offset="0.6" stop-color="#B0558A"/><stop offset="1" stop-color="#F09A6A"/></linearGradient>
    <linearGradient id="kcPoster" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F4C542"/><stop offset="1" stop-color="#F06A5A"/></linearGradient>
    <linearGradient id="kcScreenBg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2A1A6A"/><stop offset="1" stop-color="#6A2A8A"/></linearGradient>
    ${glowDef('kcScreen', '#6AA8FF', 0.28)}${glowDef('kcWin', '#F09A6A', 0.22)}${floorDefs}`;
  return roomDoc(defs, `
  <rect width="2400" height="${FLOOR_Y}" fill="url(#kcWall)"/>
  ${floorSvg('#1E183A')}
  ${glow('kcWin', WIN.x + WIN.w / 2, WIN.y + WIN.h / 2, 300, 220)}${glow('kcScreen', SCREEN.x + SCREEN.w / 2, SCREEN.y + SCREEN.h / 2, 260, 180)}
  ${rockPoster()}
  <g><rect x="${WIN.x}" y="${WIN.y}" width="${WIN.w}" height="${WIN.h}" fill="url(#kcSky)"/>${city()}${blinds(0, 0)}</g>
  <rect x="${WIN.x - 20}" y="${WIN.y + WIN.h + 6}" width="${WIN.w + 40}" height="16" rx="4" fill="#E8E4F4" ${ol(3)}/>
  <path d="M${WIN.x + 20} ${WIN.y + WIN.h + 6} L${WIN.x + 26} ${WIN.y + WIN.h - 24} L${WIN.x + 60} ${WIN.y + WIN.h - 24} L${WIN.x + 66} ${WIN.y + WIN.h + 6} Z" fill="#E8E4F4" ${ol(2.5)}/>
  <path d="M${WIN.x + 43} ${WIN.y + WIN.h - 24} C${WIN.x + 30} ${WIN.y + WIN.h - 60} ${WIN.x + 50} ${WIN.y + WIN.h - 64} ${WIN.x + 43} ${WIN.y + WIN.h - 24} M${WIN.x + 43} ${WIN.y + WIN.h - 24} C${WIN.x + 56} ${WIN.y + WIN.h - 56} ${WIN.x + 70} ${WIN.y + WIN.h - 50} ${WIN.x + 43} ${WIN.y + WIN.h - 24}" fill="#5B9A4E" ${ol(2)}/>
  ${scoreSlate(NEON, '#1E1A3A')}
  ${tvStand()}${tvScene()}
  ${skatePoster()}
  <g transform="rotate(-12 2290 ${FLOOR_Y})"><rect x="2266" y="${FLOOR_Y - 300}" width="48" height="300" rx="24" fill="#E2483A" ${ol(4)}/>
    <path d="M2276 ${FLOOR_Y - 260} H2304 M2276 ${FLOOR_Y - 40} H2304" stroke="#F7EEDC" stroke-width="4"/>
    ${[[2272, -240], [2308, -240], [2272, -60], [2308, -60]].map(([wx, wy]) => `<circle cx="${wx}" cy="${FLOOR_Y + wy!}" r="9" fill="#F4C542" ${ol(2)}/>`).join('')}</g>
  <g><rect x="80" y="${FLOOR_Y - 100}" width="380" height="110" rx="18" fill="#3E5AA8" ${ol(4)}/><rect x="96" y="${FLOOR_Y - 128}" width="140" height="56" rx="22" fill="#E8E4F4" ${ol(3.5)}/>
    <path d="M250 ${FLOOR_Y - 80} Q330 ${FLOOR_Y - 100} 450 ${FLOOR_Y - 84}" stroke="#2E4A90" stroke-width="5" fill="none"/></g>
  `);
}

const LED_PERIOD = 30;

export const KOSTYAN_ROOM: RoomArt = {
  id: 'kostyan',
  name: 'Комната с постерами',
  backgroundSvg: background,
  props: [
    // Светодиодная лента под потолком и её отсвет на стене: оттенок плавно обходит круг за 30 с.
    {
      key: 'led',
      box: { x: 0, y: 0, w: 2400, h: 72 },
      svg: propSvg(2400, 72, `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.55"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient></defs>
        <rect y="22" width="2400" height="50" fill="url(#g)"/><rect y="12" width="2400" height="12" fill="#FFFFFF"/><rect y="8" width="2400" height="4" fill="#9A94B8"/>`),
      period: LED_PERIOD,
      motion: (t) => ({ tint: hueTint(cycle(t, LED_PERIOD, 0.85)), alpha: 0.85 }),
    },
    // Огни в окнах домов: загораются и гаснут вразнобой, медленно.
    {
      key: 'light',
      box: { x: WIN.x, y: WIN.y, w: 8, h: 9 },
      pivot: { x: WIN.x, y: WIN.y },
      svg: propSvg(8, 9, '<rect width="8" height="9" rx="1" fill="#FFD27A"/>'),
      count: LIGHTS.length,
      period: 24,
      reach: WIN.w,
      motion: (t, i) => {
        const [lx, ly] = LIGHTS[i]!;
        const per = 24 / (1 + (i % 3));
        const v = Math.sin((2 * Math.PI * t) / per + hash01(i, 13) * 6);
        return { dx: lx, dy: ly, alpha: 0.5 + 0.45 * Math.tanh(2.5 * v) };
      },
    },
    // Самолёт: мигающий огонёк медленно пересекает небо (48 с), у краёв тает.
    {
      key: 'plane',
      box: { x: WIN.x + 4, y: WIN.y + 44, w: 8, h: 8 },
      svg: propSvg(8, 8, '<circle cx="4" cy="4" r="3.4" fill="#FF5A5A"/>'),
      particle: true,
      period: 48,
      reach: WIN.w,
      motion: (t) => {
        const u = cycle(t, 48);
        const edge = Math.min(1, u * 10, (1 - u) * 10);
        return { dx: u * (WIN.w - 16), dy: -u * 14, alpha: edge * (0.35 + 0.65 * Math.max(0, wave(t, 1.6, 1))) };
      },
    },
    { key: 'blinds', box: { x: WIN.x - 10, y: WIN.y - 10, w: WIN.w + 20, h: WIN.h + 20 }, svg: propSvg(WIN.w + 20, WIN.h + 20, blinds(WIN.x - 10, WIN.y - 10)) },
    // Гитара на стойке у окна: едва заметно покачивается.
    {
      key: 'guitar',
      box: { x: GUITAR.x - GUITAR.w / 2, y: GUITAR.base - GUITAR.h + 6, w: GUITAR.w, h: GUITAR.h },
      pivot: { x: GUITAR.x, y: GUITAR.base },
      svg: guitar(),
      period: 6.7,
      motion: (t) => ({ rot: wave(t, 6.7, 0.01) }),
    },
    // Музыкальный канал: эквалайзер пляшет в такт…
    {
      key: 'eq',
      box: { x: SCREEN.x + 12, y: SCREEN.y + SCREEN.h - 20 - EQ.h, w: EQ.w, h: EQ.h },
      pivot: { x: SCREEN.x + 12 + EQ.w / 2, y: SCREEN.y + SCREEN.h - 20 },
      svg: propSvg(EQ.w, EQ.h, `<defs><linearGradient id="e" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#3FE0E8"/><stop offset="0.6" stop-color="#F4C542"/><stop offset="1" stop-color="#FF4FA0"/></linearGradient></defs><rect width="${EQ.w}" height="${EQ.h}" rx="2" fill="url(#e)"/>`),
      count: EQ.n,
      period: 2.6,
      reach: EQ.n * EQ.gap,
      motion: (t, i) => ({ dx: i * EQ.gap, sy: 0.5 + wave(t, 2.6, 0.3, i * 1.9) + wave(t, 1.3, 0.12, i * 0.7) }),
    },
    // …а внизу экрана бежит строка.
    {
      key: 'ticker',
      box: { x: SCREEN.x, y: SCREEN.y + SCREEN.h - 16, w: TICKER.w, h: TICKER.h },
      svg: tickerSvg(),
      clip: SCREEN,
      period: 16,
      reach: TICKER.loop,
      motion: (t) => ({ dx: -cycle(t, 16) * TICKER.loop }),
    },
  ],
};
