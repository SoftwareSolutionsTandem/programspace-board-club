// Комната Деда Матвея — «Веранда на даче» (docs/ART_STYLE.md §12): стены из сосновой вагонки, большое окно в сад,
// полка с ламповым радио, щит с инструментами, вешалка с соломенной шляпой, грифельная доска для счёта.
// Живое: ветка яблони за окном, дым из трубы соседнего дома, пылинки в солнечном луче, лампа-индикатор радио.
// Модуль строит SVG-строки и не зависит от DOM.
import { cycle, hash01, hump, propSvg, wave, type RoomArt } from '../../render/ambient';
import { frame, glow, glowDef, ol, roomDoc, scoreSlate } from '../../render/roomKit';

const PINE = '#D9A86A', PINE_D = '#B9824A', WOOD = '#8C5A31', WOOD_D = '#6A4023', SASH = '#EFE6D0';
const WIN = { x: 440, y: 92, w: 500, h: 260 };
// Труба соседского дома (откуда идёт дым).
const CHIMNEY = { x: 606, y: 226 };

function garden(): string {
  const { x, y, w, h } = WIN;
  const b = y + h;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#mvSky)"/>
  <path d="M${x + 260} ${y + 52} C${x + 280} ${y + 30} ${x + 320} ${y + 30} ${x + 334} ${y + 46} C${x + 350} ${y + 36} ${x + 380} ${y + 42} ${x + 382} ${y + 60} Z" fill="#FFFFFF" opacity="0.85"/>
  <path d="M${x + 60} ${y + 80} C${x + 74} ${y + 66} ${x + 100} ${y + 66} ${x + 110} ${y + 78} C${x + 120} ${y + 72} ${x + 140} ${y + 74} ${x + 140} ${y + 86} Z" fill="#FFFFFF" opacity="0.7"/>
  <path d="M${x} ${b - 90} C${x + 120} ${b - 120} ${x + 300} ${b - 110} ${x + w} ${b - 130} V${b} H${x} Z" fill="#9CC27A"/>
  <path d="M${x} ${b - 50} C${x + 160} ${b - 74} ${x + 340} ${b - 60} ${x + w} ${b - 76} V${b} H${x} Z" fill="#79A85C"/>
  <g><path d="M${x + 110} ${b - 96} V${b - 150} L${x + 166} ${b - 186} L${x + 222} ${b - 150} V${b - 96} Z" fill="#E7D3A8" ${ol(3)}/>
    <path d="M${x + 100} ${b - 148} L${x + 166} ${b - 196} L${x + 232} ${b - 148}" fill="#B8463A" ${ol(3)}/>
    <rect x="${CHIMNEY.x - 8}" y="${CHIMNEY.y - 4}" width="16" height="26" fill="#9C4A3A" ${ol(2.5)}/>
    <rect x="${x + 150}" y="${b - 140}" width="30" height="26" fill="#8EC3E0" ${ol(2.5)}/></g>
  ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((k) => `<path d="M${x + 14 + k * 46} ${b - 8} V${b - 44} L${x + 22 + k * 46} ${b - 52} L${x + 30 + k * 46} ${b - 44} V${b - 8}" fill="#F3EBDD" ${ol(2)}/>`).join('')}
  <path d="M${x} ${b - 34} H${x + w}" stroke="#F3EBDD" stroke-width="5"/>
  <g><path d="M${x + 410} ${b} C${x + 404} ${b - 60} ${x + 414} ${b - 120} ${x + 400} ${b - 160}" stroke="#7A5233" stroke-width="16" fill="none" stroke-linecap="round"/>
    <circle cx="${x + 400}" cy="${b - 186}" r="58" fill="#5E9A4A" ${ol(3)}/><circle cx="${x + 450}" cy="${b - 160}" r="44" fill="#6CAA54" ${ol(3)}/>
    ${[[380, -200], [420, -176], [452, -150], [396, -160]].map(([dx, dy]) => `<circle cx="${x + dx!}" cy="${b + dy!}" r="7" fill="#D9473A" ${ol(2)}/>`).join('')}</g>`;
}

/** Переплёт: три створки и фрамуга. ox, oy — сдвиг начала координат (для текстуры поверх живого). */
function sash(ox: number, oy: number): string {
  const x = WIN.x - ox, y = WIN.y - oy, { w, h } = WIN;
  const bars = `M${x + w / 3} ${y} V${y + h} M${x + (2 * w) / 3} ${y} V${y + h} M${x} ${y + 84} H${x + w}`;
  return `<path d="${bars}" stroke="${SASH}" stroke-width="10"/><path d="${bars}" fill="none" ${ol(2)}/>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${SASH}" stroke-width="14"/>
  <rect x="${x - 7}" y="${y - 7}" width="${w + 14}" height="${h + 14}" rx="4" fill="none" ${ol(4)}/>`;
}

function branch(): string {
  // Ветка яблони свисает из верхнего левого угла стекла (локальные координаты 260 × 130).
  const leaves = [[60, 24, 20], [96, 40, -30], [130, 48, 15], [170, 62, -20], [204, 80, 30], [150, 82, 60], [90, 64, 70], [230, 100, -10]];
  return propSvg(260, 130, `<path d="M0 6 C60 14 120 30 170 58 C200 74 222 92 240 112 M120 32 C112 50 104 66 92 78" fill="none" stroke="#6E4A2C" stroke-width="7" stroke-linecap="round"/>
    ${leaves.map(([lx, ly, r]) => `<ellipse cx="${lx}" cy="${ly}" rx="17" ry="8" fill="#4F8C3E" transform="rotate(${r} ${lx} ${ly})" ${ol(2)}/>`).join('')}
    <circle cx="186" cy="80" r="11" fill="#D9473A" ${ol(2.4)}/><circle cx="182" cy="76" r="3" fill="#F6B0A0"/>
    <circle cx="96" cy="84" r="10" fill="#E2603E" ${ol(2.4)}/>`);
}

function radioShelf(): string {
  const x = 1500;
  return `<g>
    <rect x="${x}" y="330" width="290" height="16" rx="4" fill="${WOOD}" ${ol(3.5)}/>
    <path d="M${x + 20} 346 L${x + 30} 372 M${x + 270} 346 L${x + 260} 372" ${ol(4)}/>
    <rect x="${x + 28}" y="234" width="178" height="96" rx="12" fill="#7A4A2A" ${ol(4)}/>
    <rect x="${x + 40}" y="246" width="88" height="72" rx="8" fill="#C8B48A" ${ol(2.5)}/>
    ${[0, 1, 2, 3, 4, 5].map((k) => `<path d="M${x + 46} ${254 + k * 11} H${x + 122}" stroke="#9C8762" stroke-width="3"/>`).join('')}
    <rect x="${x + 138}" y="250" width="58" height="22" rx="4" fill="#F2E0B0" ${ol(2.5)}/>
    <path d="M${x + 146} 266 V256 M${x + 156} 266 V259 M${x + 166} 266 V256 M${x + 176} 266 V259 M${x + 186} 266 V256" stroke="#7A4A2A" stroke-width="1.6"/>
    <circle cx="${x + 150}" cy="302" r="10" fill="#4A2E1A" ${ol(2.5)}/><circle cx="${x + 182}" cy="302" r="10" fill="#4A2E1A" ${ol(2.5)}/>
    <circle cx="${x + 166}" cy="284" r="5" fill="#2F4A2A" ${ol(1.6)}/>
    <path d="M${x + 196} 238 L${x + 286} 196" ${ol(3)}/>
    <path d="M${x + 222} 330 V296 C${x + 222} 286 ${x + 254} 286 ${x + 254} 296 V330 Z" fill="#E6C470" ${ol(3)}/><path d="M${x + 222} 300 H${x + 254}" stroke="#C5333B" stroke-width="5"/>
    <rect x="${x + 260}" y="292" width="22" height="38" rx="4" fill="#B9D7A0" opacity="0.8" ${ol(2.5)}/></g>`;
}

function tools(): string {
  const x = 1830, y = 110;
  return `<g>
    <rect x="${x}" y="${y}" width="250" height="230" rx="6" fill="#C9935A" ${ol(4)}/>
    ${[0, 1, 2, 3, 4, 5, 6, 7].map((r) => [0, 1, 2, 3, 4, 5, 6, 7, 8].map((c) => `<circle cx="${x + 18 + c * 27}" cy="${y + 16 + r * 28}" r="2" fill="#7A5233"/>`).join('')).join('')}
    <path d="M${x + 30} ${y + 30} L${x + 30} ${y + 180} L${x + 64} ${y + 200} L${x + 64} ${y + 40} Z" fill="#C9CED6" ${ol(3)}/><rect x="${x + 22}" y="${y + 14}" width="50" height="30" rx="8" fill="#B8463A" ${ol(3)}/>
    <path d="M${x + 106} ${y + 40} V${y + 190}" stroke="#A0703C" stroke-width="10" stroke-linecap="round"/><path d="M${x + 106} ${y + 40} V${y + 190}" fill="none" ${ol(2)}/>
    <rect x="${x + 84}" y="${y + 26}" width="46" height="22" rx="4" fill="#5A6470" ${ol(3)}/>
    <path d="M${x + 156} ${y + 40} L${x + 166} ${y + 120} L${x + 150} ${y + 190} M${x + 176} ${y + 40} L${x + 166} ${y + 120} L${x + 182} ${y + 190}" fill="none" stroke="#5A6470" stroke-width="6" stroke-linecap="round"/>
    <circle cx="${x + 166}" cy="${y + 120}" r="5" fill="#C9CED6" ${ol(2)}/>
    <path d="M${x + 214} ${y + 36} C${x + 200} ${y + 36} ${x + 200} ${y + 60} ${x + 214} ${y + 60} V${y + 200}" fill="none" stroke="#7E8894" stroke-width="9" stroke-linecap="round"/></g>`;
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
  ${frame(110, 420, 110, 120, '#E8E1D0', '<rect width="100" height="100" fill="#F7F3EA"/><rect x="0" y="0" width="100" height="22" fill="#C5333B"/>' + [0, 1, 2, 3].map((r) => [0, 1, 2, 3, 4].map((c) => `<rect x="${8 + c * 18}" y="${30 + r * 17}" width="12" height="10" fill="#B9AFA0"/>`).join('')).join(''), 6)}
  <g><path d="M250 520 L268 600 L380 600 L398 520 Z" fill="#B98A50" ${ol(3.5)}/><path d="M256 548 H392 M262 574 H386" stroke="#8C6234" stroke-width="3"/>
    ${[[280, 512], [310, 506], [340, 512], [370, 506], [296, 494], [354, 494]].map(([ax, ay]) => `<circle cx="${ax}" cy="${ay}" r="16" fill="#D9473A" ${ol(2.5)}/>`).join('')}</g>`;
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
    ${glowDef('mvSun', '#FFF1C9', 0.45)}`;
  const { x, y, w, h } = WIN;
  return roomDoc(defs, `
  <rect width="2400" height="900" fill="url(#mvPlank)"/>
  <rect y="0" width="2400" height="40" fill="${WOOD}"/><path d="M0 40 H2400" ${ol(4)}/>
  <rect y="380" width="2400" height="520" fill="#A9763E"/>
  ${[0, 1, 2, 3, 4].map((k) => `<path d="M0 ${410 + k * 60} H2400" stroke="#8C6234" stroke-width="4"/>`).join('')}
  <path d="M0 380 H2400" stroke="${WOOD_D}" stroke-width="10"/><path d="M0 375 H2400 M0 385 H2400" ${ol(2.5)}/>
  ${glow('mvSun', x + w / 2, y + h / 2, 420, 300)}
  <g>${garden()}${sash(0, 0)}</g>
  <rect x="${x - 24}" y="${y + h + 8}" width="${w + 48}" height="18" rx="5" fill="${SASH}" ${ol(3.5)}/>
  <path d="M${x + 60} ${y + 20} L${x + w - 20} ${y + 20} L${x + w + 260} 470 L${x + 300} 470 Z" fill="url(#mvBeam)"/>
  <g><path d="M${x + 60} ${y + h + 8} L${x + 70} ${y + h - 30} L${x + 110} ${y + h - 30} L${x + 120} ${y + h + 8} Z" fill="#C2774A" ${ol(3)}/>
    <path d="M${x + 90} ${y + h - 30} C${x + 84} ${y + h - 60} ${x + 74} ${y + h - 70} ${x + 66} ${y + h - 64} M${x + 90} ${y + h - 30} C${x + 96} ${y + h - 64} ${x + 106} ${y + h - 72} ${x + 116} ${y + h - 66}" fill="none" stroke="#4F8C3E" stroke-width="6" stroke-linecap="round"/>
    <circle cx="${x + 66}" cy="${y + h - 66}" r="8" fill="#F4C542" ${ol(2)}/><circle cx="${x + 116}" cy="${y + h - 68}" r="8" fill="#F4C542" ${ol(2)}/></g>
  ${hooks()}
  ${scoreSlate('#C2955A', '#2E3B36')}
  ${radioShelf()}${tools()}
  <g><rect x="2140" y="150" width="190" height="16" rx="4" fill="${WOOD}" ${ol(3)}/>
    ${[2156, 2200, 2244, 2288].map((jx, k) => `<rect x="${jx}" y="${96 + (k % 2) * 8}" width="34" height="${54 - (k % 2) * 8}" rx="6" fill="${['#E2603E', '#9CC27A', '#E6C470', '#C24A3A'][k]}" opacity="0.85" ${ol(2.5)}/><rect x="${jx + 2}" y="${90 + (k % 2) * 8}" width="30" height="10" rx="3" fill="#F3EBDD" ${ol(2)}/>`).join('')}
    <rect x="2140" y="300" width="190" height="16" rx="4" fill="${WOOD}" ${ol(3)}/>
    <path d="M2160 300 C2160 250 2220 240 2236 270 C2250 240 2310 250 2310 300 Z" fill="#5E9A4A" ${ol(3)}/></g>
  `);
}

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
      box: { x: WIN.x + 4, y: WIN.y + 4, w: 260, h: 130 },
      pivot: { x: WIN.x + 4, y: WIN.y + 8 },
      svg: branch(),
      period: 5.9,
      motion: (t) => ({ rot: wave(t, 5.9, 0.03) + wave(t, 5.9 / 2, 0.008, 1) }),
    },
    { key: 'sash', box: { x: WIN.x - 12, y: WIN.y - 12, w: WIN.w + 24, h: WIN.h + 24 }, svg: propSvg(WIN.w + 24, WIN.h + 24, sash(WIN.x - 12, WIN.y - 12)) },
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
    // «Глазок» лампы радио: мягко дышит.
    {
      key: 'radioLamp',
      box: { x: 1654, y: 272, w: 24, h: 24 },
      svg: propSvg(24, 24, '<circle cx="12" cy="12" r="11" fill="#9BFF8A" opacity="0.45"/><circle cx="12" cy="12" r="5" fill="#D8FFC8"/>'),
      period: 3.3,
      motion: (t) => ({ alpha: 0.55 + wave(t, 3.3, 0.35) }),
    },
  ],
};
