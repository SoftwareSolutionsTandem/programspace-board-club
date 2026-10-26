// Комната Костяна — «Комната с постерами» (docs/ART_STYLE.md §12): сине-фиолетовая стена, постеры, светодиодная
// лента под потолком, гитара на стойке, монитор с заставкой, приставка, скейт, окно на вечерний город.
// Живое: лента плавно меняет оттенок, гитара чуть покачивается, заставка на мониторе, огни города и самолёт.
// Модуль строит SVG-строки и не зависит от DOM.
import { cycle, hash01, hueTint, propSvg, wave, type RoomArt } from '../../render/ambient';
import { frame, glow, glowDef, ol, roomDoc, scoreSlate } from '../../render/roomKit';

const NEON = '#FF4FA0', CYAN = '#3FE0E8', WOOD = '#5A3A2A';
const WIN = { x: 560, y: 110, w: 260, h: 220 };
// Экран монитора (единицы фона).
const SCREEN = { x: 1512, y: 262, w: 196, h: 104 };
const GUITAR = { x: 908, base: 458 };

function city(): string {
  const { x, y, w, h } = WIN;
  const b = y + h;
  const towers = [[0, 120, 40], [44, 90, 34], [82, 140, 46], [132, 70, 30], [166, 110, 42], [212, 150, 48]];
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#kcSky)"/>
  ${towers.map(([dx, th, tw]) => `<rect x="${x + dx!}" y="${b - th!}" width="${tw}" height="${th}" fill="#1E1C3E"/>`).join('')}
  <rect x="${x + 140}" y="${b - 92}" width="3" height="22" fill="#1E1C3E"/>`;
}

// Окна домов: каждое светится своим ритмом (координаты — от левого верхнего угла стекла).
const LIGHTS: readonly (readonly [number, number])[] = [[10, 128], [22, 150], [56, 156], [94, 116], [106, 146], [140, 176], [178, 136], [190, 164], [224, 100], [236, 132]];

function blinds(ox: number, oy: number): string {
  const x = WIN.x - ox, y = WIN.y - oy, { w, h } = WIN;
  // Жалюзи подняты: собраны сверху; рама и подоконник.
  return `<rect x="${x - 6}" y="${y - 6}" width="${w + 12}" height="34" rx="4" fill="#D8D4E8" ${ol(3)}/>
  ${[0, 1, 2].map((k) => `<path d="M${x - 4} ${y + 4 + k * 9} H${x + w + 4}" stroke="#A8A2C2" stroke-width="2"/>`).join('')}
  <path d="M${x + 40} ${y + 28} V${y + 70}" stroke="#D8D4E8" stroke-width="2"/>
  <path d="M${x + w / 2} ${y + 28} V${y + h}" stroke="#E8E4F4" stroke-width="8"/><path d="M${x + w / 2} ${y + 28} V${y + h}" fill="none" ${ol(2)}/>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#E8E4F4" stroke-width="10"/>
  <rect x="${x - 6}" y="${y - 6}" width="${w + 12}" height="${h + 12}" rx="5" fill="none" ${ol(4)}/>`;
}

function guitar(): string {
  // Локальные координаты 120 × 310; основание стойки — низ по центру (60, 300).
  return propSvg(120, 310, `
    <path d="M60 300 L30 304 M60 300 L90 304 M60 300 V230" fill="none" stroke="#2A2A36" stroke-width="7" stroke-linecap="round"/>
    <rect x="53" y="18" width="14" height="150" rx="4" fill="#7A4A2A" ${ol(3)}/>
    ${[0, 1, 2, 3, 4, 5, 6].map((k) => `<path d="M53 ${40 + k * 18} H67" stroke="#E8D8B0" stroke-width="1.6"/>`).join('')}
    <path d="M50 4 H70 L72 26 H48 Z" fill="#2A2A36" ${ol(3)}/>
    <circle cx="44" cy="10" r="3.4" fill="#C9CED6"/><circle cx="76" cy="10" r="3.4" fill="#C9CED6"/><circle cx="44" cy="20" r="3.4" fill="#C9CED6"/><circle cx="76" cy="20" r="3.4" fill="#C9CED6"/>
    <path d="M60 160 C28 160 18 182 26 204 C34 222 14 236 18 262 C24 296 96 296 102 262 C106 236 86 222 94 204 C102 182 92 160 60 160 Z" fill="#E2483A" ${ol(4)}/>
    <path d="M60 172 C40 172 34 188 40 204 C46 220 30 232 32 254 C36 280 84 280 88 254 C90 232 74 220 80 204 C86 188 80 172 60 172 Z" fill="#F7EEDC" opacity="0.9"/>
    <circle cx="60" cy="214" r="15" fill="#2A2A36" ${ol(2.4)}/>
    <rect x="46" y="250" width="28" height="8" rx="2" fill="#2A2A36"/>
    <path d="M56 26 V250 M64 26 V250" stroke="#E8E4F4" stroke-width="1.1" opacity="0.8"/>`);
}

function desk(): string {
  const x = 1470, top = 392, s = SCREEN;
  return `<g>
    <rect x="${s.x - 14}" y="${s.y - 12}" width="${s.w + 28}" height="${s.h + 26}" rx="8" fill="#1A1A26" ${ol(4)}/>
    <rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" rx="3" fill="#121838"/>
    <path d="M${s.x + s.w / 2} ${s.y + s.h + 14} V${top - 12} M${s.x + s.w / 2 - 40} ${top - 10} H${s.x + s.w / 2 + 40}" ${ol(7, '#1A1A26')}/>
    <rect x="${x - 10}" y="${top - 12}" width="470" height="18" rx="4" fill="${WOOD}" ${ol(3.5)}/>
    <rect x="${x}" y="${top + 6}" width="450" height="${900 - top}" fill="#4A3046" ${ol(4)}/>
    <rect x="${x + 260}" y="${top - 30}" width="120" height="18" rx="6" fill="#E8E4F4" ${ol(3)}/><circle cx="${x + 362}" cy="${top - 21}" r="3.5" fill="${CYAN}"/>
    <path d="M${x + 400} ${top - 12} V${top - 54} H${x + 428} V${top - 12} Z" fill="#3FA0E8" ${ol(3)}/><path d="M${x + 400} ${top - 44} H${x + 428}" stroke="#F7EEDC" stroke-width="5"/></g>`;
}

const poster = (x: number, y: number, w: number, h: number, inner: string, color = '#F7EEDC') => frame(x, y, w, h, color, inner, 6);

function background(): string {
  const defs = `
    <linearGradient id="kcWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2C2A5C"/><stop offset="1" stop-color="#3D2F6A"/></linearGradient>
    <linearGradient id="kcSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3A3478"/><stop offset="0.6" stop-color="#B0558A"/><stop offset="1" stop-color="#F09A6A"/></linearGradient>
    ${glowDef('kcScreen', '#6AA8FF', 0.28)}${glowDef('kcWin', '#F09A6A', 0.22)}`;
  return roomDoc(defs, `
  <rect width="2400" height="900" fill="url(#kcWall)"/>
  <rect y="398" width="2400" height="502" fill="#2A2246"/>
  <path d="M0 398 H2400" stroke="#1E183A" stroke-width="10"/>
  ${glow('kcWin', WIN.x + WIN.w / 2, WIN.y + WIN.h / 2, 300, 220)}${glow('kcScreen', SCREEN.x + SCREEN.w / 2, SCREEN.y + SCREEN.h / 2, 260, 180)}
  ${poster(110, 110, 170, 230, `<rect width="100" height="100" fill="#1E1C3E"/><circle cx="50" cy="44" r="26" fill="${NEON}"/><path d="M20 82 H80 M28 92 H72" stroke="#F7EEDC" stroke-width="5"/><path d="M38 44 L50 30 L62 44 L50 58 Z" fill="#1E1C3E"/>`)}
  ${poster(310, 150, 130, 170, `<rect width="100" height="100" fill="#F4C542"/><rect x="18" y="20" width="64" height="44" rx="8" fill="#2A2A36"/><circle cx="34" cy="42" r="7" fill="${CYAN}"/><circle cx="66" cy="42" r="7" fill="${NEON}"/><path d="M20 80 H80" stroke="#2A2A36" stroke-width="6"/>`)}
  <g><rect x="${WIN.x}" y="${WIN.y}" width="${WIN.w}" height="${WIN.h}" fill="url(#kcSky)"/>${city()}${blinds(0, 0)}</g>
  <rect x="${WIN.x - 20}" y="${WIN.y + WIN.h + 6}" width="${WIN.w + 40}" height="16" rx="4" fill="#E8E4F4" ${ol(3)}/>
  <path d="M${WIN.x + 20} ${WIN.y + WIN.h + 6} L${WIN.x + 26} ${WIN.y + WIN.h - 24} L${WIN.x + 60} ${WIN.y + WIN.h - 24} L${WIN.x + 66} ${WIN.y + WIN.h + 6} Z" fill="#E8E4F4" ${ol(2.5)}/>
  <path d="M${WIN.x + 43} ${WIN.y + WIN.h - 24} C${WIN.x + 30} ${WIN.y + WIN.h - 60} ${WIN.x + 50} ${WIN.y + WIN.h - 64} ${WIN.x + 43} ${WIN.y + WIN.h - 24} M${WIN.x + 43} ${WIN.y + WIN.h - 24} C${WIN.x + 56} ${WIN.y + WIN.h - 56} ${WIN.x + 70} ${WIN.y + WIN.h - 50} ${WIN.x + 43} ${WIN.y + WIN.h - 24}" fill="#5B9A4E" ${ol(2)}/>
  ${scoreSlate(NEON, '#1E1A3A')}
  ${desk()}
  ${poster(1960, 110, 150, 200, `<rect width="100" height="100" fill="${CYAN}"/><path d="M10 70 Q50 40 90 70" stroke="#1E1C3E" stroke-width="10" fill="none"/><circle cx="26" cy="78" r="7" fill="#1E1C3E"/><circle cx="74" cy="78" r="7" fill="#1E1C3E"/><path d="M30 26 L50 12 L70 26" stroke="${NEON}" stroke-width="6" fill="none"/>`)}
  ${poster(2140, 160, 120, 150, `<rect width="100" height="100" fill="#2A2A36"/><path d="M50 14 L60 40 L88 40 L66 56 L74 84 L50 68 L26 84 L34 56 L12 40 L40 40 Z" fill="#F4C542"/>`)}
  <g transform="rotate(-12 2290 660)"><rect x="2266" y="380" width="48" height="300" rx="24" fill="#E2483A" ${ol(4)}/>
    <path d="M2276 420 H2304 M2276 640 H2304" stroke="#F7EEDC" stroke-width="4"/>
    <circle cx="2272" cy="440" r="9" fill="#F4C542" ${ol(2)}/><circle cx="2308" cy="440" r="9" fill="#F4C542" ${ol(2)}/><circle cx="2272" cy="620" r="9" fill="#F4C542" ${ol(2)}/><circle cx="2308" cy="620" r="9" fill="#F4C542" ${ol(2)}/></g>
  <g><rect x="80" y="430" width="420" height="120" rx="20" fill="#3E5AA8" ${ol(4)}/><rect x="96" y="402" width="140" height="56" rx="22" fill="#E8E4F4" ${ol(3.5)}/>
    <path d="M250 450 Q330 430 480 446" stroke="#2E4A90" stroke-width="5" fill="none"/></g>
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
    // Гитара на стойке: едва заметно покачивается.
    {
      key: 'guitar',
      box: { x: GUITAR.x - 60, y: GUITAR.base - 300, w: 120, h: 310 },
      pivot: { x: GUITAR.x, y: GUITAR.base },
      svg: guitar(),
      period: 6.7,
      motion: (t) => ({ rot: wave(t, 6.7, 0.012) }),
    },
    // Заставка монитора: значок плавает по экрану и медленно меняет цвет.
    {
      key: 'saver',
      box: { x: SCREEN.x + SCREEN.w / 2 - 22, y: SCREEN.y + SCREEN.h / 2 - 13, w: 44, h: 26 },
      svg: propSvg(44, 26, `<rect x="2" y="2" width="40" height="22" rx="11" fill="#FFFFFF" opacity="0.9"/><path d="M14 7 V19 M14 13 L22 7 M14 13 L22 19" stroke="#121838" stroke-width="3" stroke-linecap="round" fill="none"/><circle cx="31" cy="13" r="4" fill="#121838"/>`),
      period: 91,
      reach: 80,
      motion: (t) => ({ dx: wave(t, 13, 70), dy: wave(t, 9.1, 30, 1), tint: hueTint(cycle(t, 91), 0.6, 0.7) }),
    },
  ],
};
