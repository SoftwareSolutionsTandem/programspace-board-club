// Кисти всех персонажей (docs/ART_STYLE.md §5.7, D70): кисть-«варежка» — мягкий овал без пальцев и толстый
// большой палец, утверждённые владельцем 2026-10-31. Одна конструкция для всех; характер — в цвете и размере.
//
// Локальная система координат кисти — прежняя, поэтому все позы и жесты остаются в силе:
//  • начало координат — центр кисти (смещение от запястья lDX/lDY, хват реквизита и карты — от него);
//  • запястье — со стороны −x (там манжета), кисть смотрит к +x, большой палец — сверху (−y);
//  • правая рука — зеркало по y (PuppetArt.mirrorHandR): большой палец у обеих с внутренней стороны.
//
// Перспектива: зритель видит тыльную сторону кисти, поэтому большой палец всегда лежит ЗА ладонью и выглядывает из её
// края (сверху спереди), а не накрывает ладонь. В кулаке — так же: подогнутые пальцы спереди не рисуются,
// большой палец выглядывает с края, а линия по передней кромке намечает сжатые пальцы.
//
// Правила рисунка: контур #3B2418 одним силуэтом (палец и ладонь слиты без шва, в месте соединения — короткая
// складка), заливка в два тона (тень снизу справа, свет слева сверху), блик на тыльной стороне.

export interface HandStyle {
  readonly outline: string;
  readonly skin: string;
  readonly skinSh: string;
  /** Блик на тыльной стороне. */
  readonly skinHi: string;
  /** Полуоси овала ладони. */
  readonly rx: number;
  readonly ry: number;
  /** Большой палец: толщина и длина (полуоси его овала). */
  readonly thumb: readonly [number, number];
}

const LINE = 3.4;
const r1 = (n: number): string => (Math.round(n * 100) / 100).toString();

interface Oval { cx: number; cy: number; rx: number; ry: number; rot: number }
const ellipse = (o: Oval, k = 0, dx = 0, dy = 0): string =>
  `<ellipse cx="${r1(o.cx + dx)}" cy="${r1(o.cy + dy)}" rx="${r1(o.rx - k)}" ry="${r1(o.ry - k)}" transform="rotate(${o.rot} ${r1(o.cx + dx)} ${r1(o.cy + dy)})"`;

/** Кисть-варежка. fist — кулак: ладонь круглее, большой палец ближе к краю, по передней кромке — сжатые пальцы. */
export function handSvg(s: HandStyle, fist = false): string {
  const rx = fist ? s.rx - 1.5 : s.rx, ry = fist ? s.ry + 0.5 : s.ry;
  const [tw, tl] = s.thumb;
  const palm: Oval = { cx: 0, cy: 0, rx, ry, rot: 0 };
  // Большой палец за ладонью, выглядывает сверху спереди; у кулака — короче и прижат.
  const thumb: Oval = fist
    ? { cx: rx * 0.38, cy: -ry * 0.78, rx: tl * 0.72, ry: tw * 0.85, rot: -22 }
    : { cx: rx * 0.42, cy: -ry * 0.72, rx: tl, ry: tw, rot: -34 };
  const O = s.outline;
  // 1) общий контур обеих форм, 2) заливка тенью, 3) свет — палец сначала, ладонь поверх: палец за ладонью.
  const silhouette = `${ellipse(thumb)} fill="${O}" stroke="${O}" stroke-width="${LINE * 2}" stroke-linejoin="round"/>${ellipse(palm)} fill="${O}" stroke="${O}" stroke-width="${LINE * 2}"/>
  ${ellipse(thumb)} fill="${s.skinSh}"/>${ellipse(thumb, 2.2, -0.5, -1)} fill="${s.skin}"/>
  ${ellipse(palm)} fill="${s.skinSh}"/>${ellipse(palm, 3, -1.2, -1.6)} fill="${s.skin}"/>`;
  // Складка там, где палец уходит за ладонь (по краю ладони — палец за ней).
  const crease = fist
    ? `<path d="M${r1(rx * 0.1)} ${r1(-ry * 0.74)} Q${r1(rx * 0.36)} ${r1(-ry * 0.6)} ${r1(rx * 0.6)} ${r1(-ry * 0.64)}" fill="none" stroke="${O}" stroke-width="2.2" stroke-linecap="round" opacity="0.75"/>`
    : `<path d="M${r1(rx * 0.02)} ${r1(-ry * 0.52)} Q${r1(rx * 0.32)} ${r1(-ry * 0.38)} ${r1(rx * 0.6)} ${r1(-ry * 0.5)}" fill="none" stroke="${O}" stroke-width="2.2" stroke-linecap="round" opacity="0.75"/>`;
  // Кулак: по передней кромке — дуга сжатых пальцев (подогнуты к ладони, сами не видны с тыльной стороны).
  const curl = fist
    ? `<path d="M${r1(rx * 0.55)} ${r1(-ry * 0.25)} Q${r1(rx * 0.72)} ${r1(ry * 0.15)} ${r1(rx * 0.5)} ${r1(ry * 0.55)}" fill="none" stroke="${O}" stroke-width="2" stroke-linecap="round" opacity="0.55"/>`
    : '';
  const hi = `<path d="M${r1(-rx * 0.6)} ${r1(-ry * 0.12)} Q${r1(-rx * 0.25)} ${r1(-ry * 0.42)} ${r1(rx * 0.05)} ${r1(-ry * 0.36)}" fill="none" stroke="${s.skinHi}" stroke-width="2.4" stroke-linecap="round"/>`;
  return silhouette + crease + curl + hi;
}
