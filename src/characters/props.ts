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
