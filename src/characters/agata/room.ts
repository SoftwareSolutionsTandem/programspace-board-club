// Комната Агаты — «Гостиная с сервантом» (docs/ART_STYLE.md §12): обои в мелкий цветочек, сервант с хрусталём
// и салфеткой, семейные фото, герань на подоконнике, часы с маятником, торшер. За окном — дождливый вечер.
// Живое: занавески, маятник, пар над чайником, капли по стеклу. Модуль строит SVG-строки и не зависит от DOM.
import { cycle, hash01, hump, propSvg, wave, type RoomArt } from '../../render/ambient';
import { frame, glow, glowDef, ol, roomDoc, scoreSlate } from '../../render/roomKit';

const WOOD = '#8C5A31', WOOD_D = '#6A4023', CREAM = '#F6EEDB';
// Окно: стекло и рама (единицы фона).
const WIN = { x: 520, y: 104, w: 280, h: 236 };

function windowGlass(): string {
  const { x, y, w, h } = WIN;
  // Дома напротив в сумерках, тёплые окна.
  const houses = `<path d="M${x} ${y + h} V${y + 150} L${x + 40} ${y + 128} L${x + 80} ${y + 150} V${y + 120} H${x + 150} V${y + 160} L${x + 190} ${y + 136} L${x + 236} ${y + 160} V${y + 140} H${w + x} V${y + h} Z" fill="#3A4466"/>` +
    [[24, 160], [52, 166], [96, 136], [126, 136], [96, 170], [204, 172], [252, 156]].map(([dx, dy]) => `<rect x="${x + dx!}" y="${y + dy!}" width="12" height="14" rx="2" fill="#F5C76A" opacity="0.85"/>`).join('');
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#agSky)"/>${houses}
  <path d="M${x + 30} ${y + 40} C${x + 60} ${y + 22} ${x + 100} ${y + 30} ${x + 120} ${y + 46} C${x + 90} ${y + 52} ${x + 50} ${y + 54} ${x + 30} ${y + 40} Z" fill="#8C93B0" opacity="0.6"/>
  <path d="M${x + 160} ${y + 70} C${x + 190} ${y + 54} ${x + 240} ${y + 58} ${x + 262} ${y + 76} C${x + 230} ${y + 82} ${x + 190} ${y + 84} ${x + 160} ${y + 70} Z" fill="#8C93B0" opacity="0.5"/>`;
}

/** Переплёт окна — рисуется и в фоне, и поверх капель (капли — по наружному стеклу, за переплётом). */
function windowFrame(ox: number, oy: number): string {
  const x = WIN.x - ox, y = WIN.y - oy, { w, h } = WIN;
  return `<path d="M${x + w / 2} ${y} V${y + h} M${x} ${y + h * 0.44} H${x + w}" stroke="${CREAM}" stroke-width="9"/>
  <path d="M${x + w / 2} ${y} V${y + h} M${x} ${y + h * 0.44} H${x + w}" fill="none" ${ol(2)}/>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="none" stroke="${CREAM}" stroke-width="12"/>
  <rect x="${x - 6}" y="${y - 6}" width="${w + 12}" height="${h + 12}" rx="6" fill="none" ${ol(4)}/>`;
}

function curtain(side: 1 | -1): string {
  // Локальные координаты: 100 × 300, верх — у карниза. Складки — светлые и тёмные полосы.
  const d = side === 1
    ? 'M8 4 H92 C86 80 80 170 96 290 H30 C20 200 30 110 8 4 Z'
    : 'M92 4 H8 C14 80 20 170 4 290 H70 C80 200 70 110 92 4 Z';
  const folds = [30, 52, 74].map((fx) => `<path d="M${fx} 8 C${fx - 4 * side} 100 ${fx + 6 * side} 200 ${fx + 2 * side} 286" fill="none" stroke="#8E2632" stroke-width="5" opacity="0.55"/>`).join('');
  return propSvg(100, 300, `<path d="${d}" fill="#B8323F" ${ol(4)}/>${folds}
    <path d="M${side === 1 ? 20 : 80} 160 Q50 176 ${side === 1 ? 80 : 20} 168" fill="none" stroke="#E8AB30" stroke-width="7" stroke-linecap="round"/>
    <path d="M${side === 1 ? 20 : 80} 160 Q50 176 ${side === 1 ? 80 : 20} 168" fill="none" ${ol(2)}/>`);
}

function clock(): string {
  // Часы с маятником: корпус 868…948, циферблат сверху, под стеклом — маятник (живой предмет).
  return `<g>
    <path d="M868 150 Q868 108 908 104 Q948 108 948 150 V330 Q908 344 868 330 Z" fill="${WOOD}" ${ol(4)}/>
    <circle cx="908" cy="148" r="30" fill="${CREAM}" ${ol(3.5)}/>
    ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((k) => { const a = (k * Math.PI) / 6; return `<circle cx="${908 + Math.sin(a) * 23}" cy="${148 - Math.cos(a) * 23}" r="2" fill="#3B2418"/>`; }).join('')}
    <path d="M908 148 L908 128 M908 148 L922 154" ${ol(3)}/>
    <rect x="882" y="190" width="52" height="126" rx="6" fill="#4A2E1A" ${ol(3)}/>
    <rect x="886" y="194" width="44" height="118" rx="4" fill="#5C3A22"/>
    <path d="M888 196 L900 196 L888 230 Z" fill="#FFFFFF" opacity="0.12"/></g>`;
}

function sideboard(): string {
  const x = 1470, w = 440;
  const glass = (gx: number) => `<rect x="${gx}" y="262" width="196" height="176" rx="5" fill="#5D4A57" ${ol(3)}/>
    <rect x="${gx + 4}" y="266" width="188" height="168" rx="3" fill="#7A6875"/>
    <path d="M${gx + 4} 350 H${gx + 192}" stroke="${WOOD_D}" stroke-width="5"/>
    ${[0, 1, 2, 3].map((k) => crystal(gx + 26 + k * 44, 346)).join('')}
    ${[0, 1, 2].map((k) => `<ellipse cx="${gx + 46 + k * 52}" cy="410" rx="22" ry="22" fill="#F1E6D2" ${ol(2.5)}/><ellipse cx="${gx + 46 + k * 52}" cy="410" rx="13" ry="13" fill="none" stroke="#2F6FA8" stroke-width="3"/>`).join('')}
    <path d="M${gx + 20} 270 L${gx + 60} 270 L${gx + 20} 330 Z" fill="#FFFFFF" opacity="0.1"/>`;
  return `<g>
    <rect x="${x}" y="240" width="${w}" height="660" rx="8" fill="${WOOD}" ${ol(5)}/>
    <rect x="${x - 10}" y="232" width="${w + 20}" height="16" rx="6" fill="${WOOD_D}" ${ol(3.5)}/>
    ${glass(x + 18)}${glass(x + 226)}
    <rect x="${x + 18}" y="452" width="404" height="420" rx="6" fill="${WOOD_D}" opacity="0.5"/>
    <path d="M${x + 60} 236 Q${x + 90} 252 ${x + 120} 236 Q${x + 150} 252 ${x + 180} 236" fill="none" stroke="${CREAM}" stroke-width="6"/>
  </g>`;
}

/** Хрустальная рюмка: опора на полке (x, y). */
function crystal(x: number, y: number): string {
  return `<path d="M${x - 11} ${y - 52} L${x + 11} ${y - 52} L${x + 4} ${y - 28} L${x + 2} ${y - 10} L${x + 9} ${y} L${x - 9} ${y} L${x - 2} ${y - 10} L${x - 4} ${y - 28} Z" fill="#DCEAF2" opacity="0.85" ${ol(2)}/>
    <path d="M${x - 6} ${y - 48} L${x - 2} ${y - 32}" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round"/>`;
}

function teapot(): string {
  // Фарфоровый чайник на салфетке на серванте; носик — на (1886, 196).
  return `<g>
    <path d="M1790 236 Q1840 222 1904 236 Q1846 244 1790 236 Z" fill="${CREAM}" ${ol(2)}/>
    <path d="M1812 232 C1806 196 1830 182 1846 182 C1862 182 1886 196 1880 232 Z" fill="#F1E6D2" ${ol(3.5)}/>
    <path d="M1876 212 C1890 210 1890 198 1886 194" fill="none" stroke="#F1E6D2" stroke-width="8" stroke-linecap="round"/>
    <path d="M1876 212 C1890 210 1890 198 1886 194" fill="none" ${ol(2.6)}/>
    <path d="M1814 200 C1798 200 1798 222 1814 222" fill="none" ${ol(3)}/>
    <ellipse cx="1846" cy="182" rx="14" ry="5" fill="#F1E6D2" ${ol(2.5)}/><circle cx="1846" cy="175" r="4" fill="#2F6FA8" ${ol(2)}/>
    <path d="M1822 208 Q1846 218 1870 208" fill="none" stroke="#2F6FA8" stroke-width="3"/>
    <circle cx="1846" cy="214" r="5" fill="#C5333B"/></g>`;
}

function sill(): string {
  const { x, y, w, h } = WIN;
  // Подоконник, спящая кошка слева и герань справа.
  return `<rect x="${x - 26}" y="${y + h + 4}" width="${w + 52}" height="18" rx="5" fill="${CREAM}" ${ol(3.5)}/>
  <g>
    <path d="M${x + 22} ${y + h + 6} C${x + 18} ${y + h - 30} ${x + 70} ${y + h - 44} ${x + 104} ${y + h - 26} C${x + 120} ${y + h - 18} ${x + 120} ${y + h + 4} ${x + 108} ${y + h + 6} Z" fill="#7A6A64" ${ol(3.5)}/>
    <path d="M${x + 22} ${y + h - 14} C${x + 20} ${y + h - 30} ${x + 30} ${y + h - 38} ${x + 44} ${y + h - 36} L${x + 40} ${y + h - 48} L${x + 52} ${y + h - 38} C${x + 56} ${y + h - 30} ${x + 50} ${y + h - 12} ${x + 22} ${y + h - 14} Z" fill="#7A6A64" ${ol(3)}/>
    <path d="M${x + 30} ${y + h - 26} q4 3 8 0" fill="none" ${ol(2)}/>
    <path d="M${x + 106} ${y + h + 2} C${x + 130} ${y + h} ${x + 136} ${y + h - 12} ${x + 128} ${y + h - 20}" fill="none" stroke="#7A6A64" stroke-width="9" stroke-linecap="round"/>
    <path d="M${x + 60} ${y + h - 34} q8 6 16 4 M${x + 74} ${y + h - 38} q8 6 16 4" fill="none" stroke="#5E504B" stroke-width="3" stroke-linecap="round"/></g>
  <g>
    <path d="M${x + 214} ${y + h + 4} L${x + 208} ${y + h - 26} L${x + 256} ${y + h - 26} L${x + 250} ${y + h + 4} Z" fill="#C2774A" ${ol(3)}/>
    <path d="M${x + 232} ${y + h - 26} C${x + 220} ${y + h - 60} ${x + 200} ${y + h - 64} ${x + 196} ${y + h - 56} C${x + 210} ${y + h - 50} ${x + 222} ${y + h - 40} ${x + 230} ${y + h - 26} M${x + 232} ${y + h - 26} C${x + 240} ${y + h - 64} ${x + 260} ${y + h - 70} ${x + 268} ${y + h - 62} C${x + 256} ${y + h - 52} ${x + 244} ${y + h - 40} ${x + 234} ${y + h - 26}" fill="#5B9A4E" ${ol(2.5)}/>
    ${[[214, -72], [232, -84], [252, -76], [224, -96], [244, -96]].map(([dx, dy]) => `<circle cx="${x + dx!}" cy="${y + h + dy!}" r="9" fill="#D9475A" ${ol(2)}/>`).join('')}</g>`;
}

function floorLamp(x: number): string {
  return `<g><path d="M${x} 230 V900" ${ol(5)}/><path d="M${x} 230 V900" stroke="#C9A24A" stroke-width="3"/>
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
    ${glowDef('agWarm', '#FFE2A8', 0.5)}`;
  const { x, y, w, h } = WIN;
  return roomDoc(defs, `
  <rect width="2400" height="900" fill="url(#agPaper)"/>
  <rect width="2400" height="900" fill="url(#agShade)"/>
  <rect y="372" width="2400" height="528" fill="#9C6A43"/>
  <path d="M0 372 H2400" stroke="${WOOD_D}" stroke-width="12"/><path d="M0 366 H2400 M0 378 H2400" ${ol(3)}/>
  ${[60, 300, 1960, 2200].map((px) => `<rect x="${px}" y="404" width="180" height="96" rx="6" fill="none" stroke="${WOOD_D}" stroke-width="4"/>`).join('')}
  ${glow('agWarm', 300, 260, 340, 260)}${glow('agWarm', 1200, 200, 520, 300)}
  ${floorLamp(300)}
  ${frame(110, 120, 120, 150, WOOD, photoFace('#C9B79A', '#5A6A8A'))}
  ${frame(390, 170, 96, 120, '#C9A24A', photoFace('#B9C4A8', '#8E2632'))}
  <g><rect x="${x - 8}" y="${y - 8}" width="${w + 16}" height="${h + 16}" rx="8" fill="${CREAM}" ${ol(4)}/>${windowGlass()}${windowFrame(0, 0)}</g>
  ${sill()}
  ${clock()}
  ${scoreSlate(WOOD)}
  ${sideboard()}${teapot()}
  ${frame(1960, 120, 130, 160, WOOD, photoFace('#D4C2A0', '#3E6E5A'))}
  ${frame(2120, 150, 110, 100, '#C9A24A', '<rect width="100" height="100" fill="#AFC6D8"/><path d="M0 80 L30 50 L55 72 L75 56 L100 80 V100 H0 Z" fill="#6E9A62"/><circle cx="76" cy="26" r="9" fill="#F4C542"/>')}
  ${frame(2120, 270, 110, 90, WOOD, photoFace('#E3CFB0', '#C5333B'))}
  <g><path d="M2300 370 C2270 300 2250 230 2290 170 M2300 370 C2320 290 2350 230 2330 160" fill="none" stroke="#3E6E3A" stroke-width="6"/>
    ${[[2280, 200], [2340, 190], [2262, 260], [2350, 260], [2290, 300], [2330, 320]].map(([lx, ly]) => `<ellipse cx="${lx}" cy="${ly}" rx="26" ry="14" fill="#5B9A4E" ${ol(2.5)} transform="rotate(${lx! > 2300 ? 30 : -30} ${lx} ${ly})"/>`).join('')}
    <path d="M2262 372 L2270 330 L2338 330 L2346 372 Z" fill="#C2774A" ${ol(3)}/></g>
  `);
}

export const AGATA_ROOM: RoomArt = {
  id: 'agata',
  name: 'Гостиная с сервантом',
  backgroundSvg: background,
  props: [
    // Капли по стеклу: медленно сползают и тают; 9 штук с разными скоростями.
    {
      key: 'drop',
      box: { x: WIN.x + 6, y: WIN.y + 6, w: 8, h: 16 },
      svg: propSvg(8, 16, '<path d="M4 1 C6 6 7.5 9 7.5 11.5 A3.5 3.5 0 0 1 0.5 11.5 C0.5 9 2 6 4 1 Z" fill="#DDE6F2" opacity="0.9"/><circle cx="3" cy="11" r="1.2" fill="#FFFFFF"/>'),
      count: 9,
      particle: true,
      period: 6,
      reach: WIN.w,
      motion: (t, i) => {
        // Период копии — целая доля общего периода (6 с), чтобы цикл слоя замыкался.
        const per = 6 / (1 + (i % 2));
        const u = cycle(t, per, hash01(i, 1));
        return { dx: 8 + hash01(i, 2) * (WIN.w - 30), dy: u * (WIN.h - 34), alpha: hump(u) * 0.85 };
      },
    },
    // Переплёт поверх капель.
    { key: 'mullion', box: { x: WIN.x - 8, y: WIN.y - 8, w: WIN.w + 16, h: WIN.h + 16 }, svg: propSvg(WIN.w + 16, WIN.h + 16, windowFrame(WIN.x - 8, WIN.y - 8)) },
    // Маятник часов: ±4°, период 2,4 с.
    {
      key: 'pendulum',
      box: { x: 898, y: 194, w: 20, h: 110 },
      pivot: { x: 908, y: 198 },
      svg: propSvg(20, 110, '<path d="M10 4 V86" stroke="#C9A24A" stroke-width="3"/><circle cx="10" cy="4" r="3" fill="#C9A24A"/><circle cx="10" cy="94" r="10" fill="#E8AB30" stroke="#3B2418" stroke-width="2.5"/><circle cx="7" cy="91" r="3" fill="#FFF1C9"/>'),
      period: 2.4,
      motion: (t) => ({ rot: wave(t, 2.4, 0.07) }),
    },
    // Пар над носиком чайника: три облачка поднимаются и тают.
    {
      key: 'steam',
      box: { x: 1874, y: 168, w: 26, h: 26 },
      pivot: { x: 1887, y: 190 },
      svg: propSvg(26, 26, '<circle cx="13" cy="13" r="10" fill="#FFFFFF" opacity="0.55"/>'),
      count: 3,
      particle: true,
      period: 4.3,
      reach: 80,
      motion: (t, i) => {
        const u = cycle(t, 4.3, i / 3);
        return { dy: -u * 70, dx: wave(u, 1, 6, i), sx: 0.6 + u * 0.9, sy: 0.6 + u * 0.9, alpha: hump(u) * 0.75 };
      },
    },
    // Занавески: едва колышутся от сквозняка, у каждой свой период.
    {
      key: 'curtainL',
      box: { x: WIN.x - 62, y: WIN.y - 20, w: 100, h: 300 },
      pivot: { x: WIN.x - 12, y: WIN.y - 18 },
      svg: curtain(1),
      period: 7.3,
      motion: (t) => ({ rot: wave(t, 7.3, 0.014), sx: 1 + wave(t, 7.3, 0.015, 1.2) }),
    },
    {
      key: 'curtainR',
      box: { x: WIN.x + WIN.w - 38, y: WIN.y - 20, w: 100, h: 300 },
      pivot: { x: WIN.x + WIN.w + 12, y: WIN.y - 18 },
      svg: curtain(-1),
      period: 8.9,
      motion: (t) => ({ rot: wave(t, 8.9, -0.012, 0.8), sx: 1 + wave(t, 8.9, 0.012, 2) }),
    },
    // Карниз — поверх верхнего края занавесок.
    { key: 'rod', box: { x: WIN.x - 76, y: WIN.y - 32, w: WIN.w + 152, h: 20 }, svg: propSvg(WIN.w + 152, 20, `<rect x="6" y="4" width="${WIN.w + 140}" height="12" rx="6" fill="${WOOD}" ${ol(3)}/><circle cx="8" cy="10" r="7" fill="#C9A24A" ${ol(2.5)}/><circle cx="${WIN.w + 144}" cy="10" r="7" fill="#C9A24A" ${ol(2.5)}/>`) },
  ],
};
