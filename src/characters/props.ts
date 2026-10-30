// Реквизит сценок «своей жизни» (docs/ART_STYLE.md §5.6): маленькие предметы в руке — в стиле персонажей: тёмный
// контур с круглыми стыками, мягкая заливка, светлый блик сверху, без градиентов. Каждый рисунок — с центром в начале
// координат (как кисть); персонаж задаёт хват и поворот в своём puppet.ts. Свет — сверху слева, как у всех фигур.

const ol = (c: string, w = 3): string => `stroke="${c}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

/** Платочек: смятый квадрат с каймой и складками. */
export function hankySvg(outline: string, fill: string, border: string, fold: string): string {
  return `<path d="M-18 -9 Q-9 -19 3 -14 Q15 -18 19 -6 Q23 6 12 13 Q1 19 -10 14 Q-22 8 -18 -9 Z" fill="${fill}" ${ol(outline)}/>
  <path d="M-13 -7 Q-6 -13 3 -10 Q12 -13 14 -4 Q17 5 9 9 Q0 13 -8 10 Q-16 5 -13 -7 Z" fill="none" stroke="${border}" stroke-width="2.4" stroke-dasharray="3 2.6" stroke-linecap="round"/>
  <path d="M-6 -3 Q0 2 7 -1 M-3 6 Q3 4 8 6" fill="none" stroke="${fold}" stroke-width="2" stroke-linecap="round"/>`;
}

/** Конфета в фантике: середина в полоску, закрученные хвостики. */
export function candySvg(outline: string, wrap: string, stripe: string): string {
  return `<path d="M-9 -2 L-20 -9 L-18 0 L-20 9 L-9 2 Z" fill="${wrap}" ${ol(outline, 2.6)}/>
  <path d="M9 -2 L20 -9 L18 0 L20 9 L9 2 Z" fill="${wrap}" ${ol(outline, 2.6)}/>
  <ellipse cx="0" cy="0" rx="10" ry="7.5" fill="${wrap}" ${ol(outline, 2.8)}/>
  <path d="M-5 -6.5 L-1 6.8 M2 -7 L5.5 6" stroke="${stripe}" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M-6 -3.5 Q-3 -5.5 1 -5.5" fill="none" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round" opacity="0.8"/>`;
}

/** Стакан чая в подстаканнике: янтарный чай, ложечка, кружевной металл и ручка справа. */
export function teaGlassSvg(outline: string, metal: string, metalSh: string, tea: string): string {
  return `<path d="M-13 -24 L13 -24 L10 10 L-10 10 Z" fill="#EAF3F3" ${ol(outline)}/>
  <path d="M-12 -14 L12 -14 L10 10 L-10 10 Z" fill="${tea}"/>
  <path d="M-13 -24 L13 -24 L10 10 L-10 10 Z" fill="none" ${ol(outline)}/>
  <path d="M5 -30 L1 -8" stroke="${metal}" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M-8 -20 L-7 2" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
  <path d="M-14 -2 L14 -2 L12 20 L-12 20 Z" fill="${metal}" ${ol(outline)}/>
  <path d="M-9 4 Q0 10 9 4 M-8 12 Q0 17 8 12" fill="none" stroke="${metalSh}" stroke-width="2" stroke-linecap="round"/>
  <path d="M14 1 Q23 2 22 9 Q21 15 13 15" fill="none" ${ol(outline, 6)}/>
  <path d="M14 1 Q23 2 22 9 Q21 15 13 15" fill="none" stroke="${metal}" stroke-width="3" stroke-linecap="round"/>`;
}

/** Семечка подсолнуха. */
export function seedSvg(outline: string): string {
  return `<path d="M0 -7 Q5 -3 3 6 Q0 9 -3 6 Q-5 -3 0 -7 Z" fill="#2B2420" ${ol(outline, 1.6)}/>
  <path d="M-1 -3 L-1.5 4 M1.5 -3 L1.5 4" stroke="#8D8379" stroke-width="1.1" stroke-linecap="round"/>`;
}

/** Замшевая салфетка для очков. */
export function clothSvg(outline: string, fill: string, fold: string): string {
  return `<path d="M-15 -11 Q-3 -15 13 -11 Q17 0 13 11 Q0 15 -14 11 Q-18 0 -15 -11 Z" fill="${fill}" ${ol(outline)}/>
  <path d="M-8 -4 Q1 0 9 -3 M-7 5 Q0 3 8 6" fill="none" stroke="${fold}" stroke-width="2" stroke-linecap="round"/>`;
}

/** Карманные часы: золотой корпус с колечком, циферблат, стрелки и звено цепочки. */
export function pocketWatchSvg(outline: string, gold: string, goldHi: string, dial: string): string {
  return `<path d="M-2 -20 Q-10 -25 -16 -19" fill="none" stroke="${gold}" stroke-width="2.6" stroke-dasharray="3 2" stroke-linecap="round"/>
  <circle cx="0" cy="-18" r="3.6" fill="none" ${ol(outline, 2.4)}/>
  <circle cx="0" cy="-18" r="3.6" fill="none" stroke="${gold}" stroke-width="1.6"/>
  <circle cx="0" cy="0" r="14.5" fill="${gold}" ${ol(outline)}/>
  <circle cx="0" cy="0" r="10.5" fill="${dial}" ${ol(outline, 1.8)}/>
  <path d="M0 -7.5 L0 -6 M7.5 0 L6 0 M0 7.5 L0 6 M-7.5 0 L-6 0" stroke="${outline}" stroke-width="1.6" stroke-linecap="round"/>
  <path d="M0 0 L0 -6 M0 0 L4.5 2" stroke="${outline}" stroke-width="1.8" stroke-linecap="round"/>
  <path d="M-10 -8 Q-6 -12 -1 -13" fill="none" stroke="${goldHi}" stroke-width="2" stroke-linecap="round"/>`;
}

/** Телефон: тёмный корпус, светлый экран с «лентой» сообщений. */
export function phoneSvg(outline: string, body: string, screen: string, ui: string): string {
  return `<rect x="-13" y="-23" width="26" height="46" rx="5" fill="${body}" ${ol(outline)}/>
  <rect x="-10" y="-18" width="20" height="35" rx="2" fill="${screen}"/>
  <rect x="-7" y="-14" width="11" height="4" rx="2" fill="${ui}"/>
  <rect x="-4" y="-7" width="11" height="4" rx="2" fill="#FFFFFF" opacity="0.9"/>
  <rect x="-7" y="0" width="13" height="4" rx="2" fill="${ui}"/>
  <rect x="-4" y="7" width="9" height="4" rx="2" fill="#FFFFFF" opacity="0.9"/>
  <path d="M-3 20 L3 20" stroke="#8A8FA8" stroke-width="2" stroke-linecap="round"/>`;
}

/** Телефон с обратной стороны (селфи): корпус и глазок камеры. */
export function phoneBackSvg(outline: string, body: string, accent: string): string {
  return `<rect x="-13" y="-23" width="26" height="46" rx="5" fill="${body}" ${ol(outline)}/>
  <rect x="-9" y="-19" width="10" height="13" rx="3" fill="#1E2029" ${ol(outline, 1.6)}/>
  <circle cx="-4" cy="-15.5" r="2.6" fill="#5B6270"/>
  <circle cx="-4" cy="-9.5" r="2.2" fill="#5B6270"/>
  <circle cx="5" cy="-15" r="1.6" fill="#F4E6A8"/>
  <path d="M-7 8 L7 8" stroke="${accent}" stroke-width="2.4" stroke-linecap="round"/>
  <path d="M-10 -12 Q-11 0 -10 14" fill="none" stroke="#5B6270" stroke-width="1.8" stroke-linecap="round" opacity="0.7"/>`;
}

// ---------- реквизит второго этапа (LIFE-2, D65) ----------

/** Вязание: две спицы крест-накрест и полоска вязаного полотна с рядами «косичек». */
export function knittingSvg(outline: string, yarn: string, yarnSh: string, needle: string): string {
  return `<path d="M-26 -16 L18 14 M-22 16 L24 -12" stroke="${outline}" stroke-width="5" stroke-linecap="round"/>
  <path d="M-26 -16 L18 14 M-22 16 L24 -12" stroke="${needle}" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M-14 -6 Q0 -10 14 -6 L12 14 Q0 18 -12 14 Z" fill="${yarn}" ${ol(outline)}/>
  <path d="M-9 -2 L-6 2 L-3 -2 M-1 -3 L2 1 L5 -3 M7 -2 L10 2 M-9 6 L-6 10 L-3 6 M-1 5 L2 9 L5 5 M7 6 L10 10" fill="none" stroke="${yarnSh}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="-26" cy="-16" r="2.6" fill="${needle}" ${ol(outline, 1.6)}/><circle cx="24" cy="-12" r="2.6" fill="${needle}" ${ol(outline, 1.6)}/>`;
}

/** Пирожок: румяный, с защипом поверху. */
export function pieSvg(outline: string, crust: string, crustSh: string): string {
  return `<path d="M-19 4 Q-18 -10 0 -11 Q18 -10 19 4 Q18 11 0 12 Q-18 11 -19 4 Z" fill="${crust}" ${ol(outline)}/>
  <path d="M-14 -5 Q-10 -9 -6 -5 Q-2 -9 2 -5 Q6 -9 10 -5 Q13 -8 15 -4" fill="none" stroke="${crustSh}" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M-12 3 Q-6 0 -1 2" fill="none" stroke="#FFF1D6" stroke-width="2" stroke-linecap="round" opacity="0.8"/>`;
}

/** Ручное зеркальце: круглая оправа на ручке, блик на стекле. */
export function mirrorSvg(outline: string, frame: string, glass: string): string {
  return `<path d="M0 12 L0 26" stroke="${outline}" stroke-width="7" stroke-linecap="round"/>
  <path d="M0 12 L0 26" stroke="${frame}" stroke-width="3.6" stroke-linecap="round"/>
  <circle cx="0" cy="-2" r="14" fill="${frame}" ${ol(outline)}/>
  <circle cx="0" cy="-2" r="9.5" fill="${glass}"/>
  <path d="M-5 -7 L3 -11 M-6 -2 L-2 -4" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/>`;
}

/** Газета: сложенный лист с заголовком, колонками и картинкой. */
export function newspaperSvg(outline: string, paper: string, ink: string): string {
  return `<path d="M-34 -24 L32 -26 L34 24 L-32 26 Z" fill="${paper}" ${ol(outline)}/>
  <path d="M0 -25 L1 25" stroke="${ink}" stroke-width="1.2" opacity="0.5"/>
  <path d="M-28 -17 L-4 -18" stroke="${ink}" stroke-width="4" stroke-linecap="round"/>
  <path d="M-28 -9 L-4 -9.5 M-28 -3 L-4 -3.5 M-28 3 L-4 2.5 M-28 9 L-4 8.5 M-28 15 L-10 14.6" stroke="${ink}" stroke-width="1.6" stroke-linecap="round" opacity="0.7"/>
  <rect x="5" y="-19" width="22" height="16" rx="1.5" fill="${ink}" opacity="0.35"/>
  <path d="M5 4 L28 3.5 M5 10 L28 9.5 M5 16 L22 15.6" stroke="${ink}" stroke-width="1.6" stroke-linecap="round" opacity="0.7"/>`;
}

/** Кусок сахара. */
export function sugarSvg(outline: string): string {
  return `<path d="M-6 -4 L2 -7 L8 -3 L8 5 L0 8 L-6 5 Z" fill="#FFFFFF" ${ol(outline, 1.8)}/>
  <path d="M-6 -4 L0 -1 L8 -3 M0 -1 L0 8" fill="none" stroke="#D8D4CC" stroke-width="1.2"/>`;
}

/** Записная книжка: раскрытая, в кожаной обложке, строчки на страницах. */
export function notebookSvg(outline: string, cover: string, page: string, ink: string): string {
  return `<path d="M-26 -17 L0 -14 L26 -17 L26 16 L0 19 L-26 16 Z" fill="${cover}" ${ol(outline)}/>
  <path d="M-23 -14 L-1 -11 L-1 15 L-23 13 Z M23 -14 L1 -11 L1 15 L23 13 Z" fill="${page}"/>
  <path d="M-19 -6 L-5 -4 M-19 0 L-5 2 M-19 6 L-9 7.5 M5 -4 L19 -6 M5 2 L16 0.5" stroke="${ink}" stroke-width="1.4" stroke-linecap="round" opacity="0.7"/>
  <path d="M0 -14 L0 19" stroke="${outline}" stroke-width="2"/>`;
}

/** Карандаш: грифель вниз-влево, ластик сверху. */
export function pencilSvg(outline: string, wood: string, lead: string): string {
  return `<path d="M-3 -22 L3 -22 L3 14 L0 22 L-3 14 Z" fill="${wood}" ${ol(outline, 2.4)}/>
  <path d="M-3 14 L0 22 L3 14 Z" fill="#F3D9B1" ${ol(outline, 1.6)}/>
  <path d="M-1 19 L0 22 L1 19 Z" fill="${lead}"/>
  <rect x="-3" y="-26" width="6" height="5" rx="1.5" fill="#E58A8A" ${ol(outline, 1.6)}/>`;
}

/** Лупа: латунная оправа, ручка, блик. */
export function magnifierSvg(outline: string, frame: string, handle: string): string {
  return `<path d="M10 10 L24 24" stroke="${outline}" stroke-width="9" stroke-linecap="round"/>
  <path d="M10 10 L24 24" stroke="${handle}" stroke-width="5.5" stroke-linecap="round"/>
  <circle cx="0" cy="0" r="14" fill="#DDEFF2" fill-opacity="0.55" stroke="${outline}" stroke-width="3"/>
  <circle cx="0" cy="0" r="14" fill="none" stroke="${frame}" stroke-width="3.2"/>
  <circle cx="0" cy="0" r="15.6" fill="none" stroke="${outline}" stroke-width="1.6"/>
  <path d="M-8 -5 Q-6 -9 -2 -10" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round"/>`;
}

/** Шахматный конь — светлая фигура из кармана. */
export function knightSvg(outline: string, piece: string, pieceSh: string): string {
  return `<path d="M-9 14 L9 14 L8 8 Q12 -2 6 -10 Q2 -16 -4 -15 L-6 -12 L-11 -6 L-9 -2 L-4 -4 L-6 2 L-8 8 Z" fill="${piece}" ${ol(outline, 2.6)}/>
  <path d="M-12 18 L12 18 L10 13 L-10 13 Z" fill="${piece}" ${ol(outline, 2.6)}/>
  <circle cx="-2" cy="-9" r="1.4" fill="${outline}"/>
  <path d="M3 -8 Q6 -2 5 6" fill="none" stroke="${pieceSh}" stroke-width="2" stroke-linecap="round"/>`;
}

/** Банка газировки: яркая этикетка, язычок, капли. */
export function sodaSvg(outline: string, can: string, band: string): string {
  return `<path d="M-10 -18 L10 -18 L11 -14 L11 15 L9 19 L-9 19 L-11 15 L-11 -14 Z" fill="${can}" ${ol(outline)}/>
  <path d="M-11 -6 L11 -6 L11 6 L-11 6 Z" fill="${band}"/>
  <path d="M-11 -6 L11 -6 M-11 6 L11 6" stroke="${outline}" stroke-width="1.6"/>
  <ellipse cx="0" cy="-18" rx="10" ry="2.4" fill="#C9CED6" ${ol(outline, 1.6)}/>
  <path d="M2 -19 L6 -19" stroke="${outline}" stroke-width="2" stroke-linecap="round"/>
  <path d="M-7 -12 L-7 13" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" opacity="0.6"/>`;
}

/** Спиннер: три лопасти с подшипниками, центр. */
export function spinnerSvg(outline: string, body: string, bearing: string): string {
  const lobe = (a: number) => {
    const x = Math.cos(a) * 12, y = Math.sin(a) * 12;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7.5" fill="${body}" ${ol(outline, 2.4)}/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.4" fill="${bearing}" ${ol(outline, 1.4)}/>`;
  };
  return `<circle cx="0" cy="0" r="9" fill="${body}" ${ol(outline, 2.4)}/>${[-Math.PI / 2, Math.PI / 6, (5 * Math.PI) / 6].map(lobe).join('')}
  <circle cx="0" cy="0" r="4" fill="${bearing}" ${ol(outline, 1.6)}/>`;
}

/** Кубик Рубика: передняя грань 3×3 разноцветных квадратов. */
export function cubeSvg(outline: string): string {
  const colors = ['#E8473C', '#F4C542', '#2F9C8F', '#FFFFFF', '#E8743B', '#3B6FD4', '#F4C542', '#E8473C', '#FFFFFF'];
  const cells = colors.map((c, i) => `<rect x="${-12 + (i % 3) * 8.2}" y="${-12 + Math.floor(i / 3) * 8.2}" width="7" height="7" rx="1.4" fill="${c}"/>`).join('');
  return `<rect x="-14" y="-14" width="28" height="28" rx="4" fill="#25262E" ${ol(outline, 2.6)}/>${cells}`;
}
