// Единый стандарт кистей всех персонажей (docs/ART_STYLE.md §5.7): одна конструкция и одни правила рисунка,
// характер — в параметрах (размер ладони, длина и толщина пальцев, костяшки, возрастные детали, цвет кожи).
//
// Локальная система координат кисти — как у прежних кистей-«варежек», поэтому все позы и жесты остаются в силе:
//  • начало координат — точка кисти, к которой риг прикладывает смещение от запястья (lDX/lDY) и хват реквизита;
//  • запястье — со стороны −x (там манжета), пальцы — к +x;
//  • большой палец — сверху (−y); правая рука — зеркало по y (PuppetArt.mirrorHandR).
// Кисть видна с тыльной стороны, пальцы чуть согнуты: так она читается и лежащей на столе, и поднятой, и держащей предмет.
//
// Правила рисунка (общие для всех):
//  • контур #3B2418 одной толщины (как у фигур), круглые стыки; силуэт кисти — одним контуром, без швов между частями;
//  • пальцы разделены тонкой тёмной щелью, а не отдельными обводками — кисть цельная;
//  • заливка в два тона: тень снизу-справа (свет слева сверху, как у всех фигур), блик на тыльной стороне;
//  • ногти — светлые овалы без обводки; костяшки — короткие дуги цветом тени.

export interface HandStyle {
  readonly outline: string;
  readonly skin: string;
  readonly skinSh: string;
  /** Блик на тыльной стороне. */
  readonly skinHi: string;
  /** Толщина контура. */
  readonly line: number;
  /** Ладонь (тыльная сторона): центр по x и полуоси. */
  readonly palm: { readonly cx: number; readonly rx: number; readonly ry: number };
  /** Пальцы: где начинаются (x костяшек), длины указательного…мизинца, толщина и шаг по y. */
  readonly fingers: { readonly base: number; readonly len: readonly [number, number, number, number]; readonly w: number; readonly gap: number; readonly droop: number };
  /** Большой палец: длина и толщина. */
  readonly thumb: { readonly len: number; readonly w: number };
  /** Костяшки: нет, мягкие складки (возраст), выпуклые суставы (худая натруженная кисть). */
  readonly knuckles: 'none' | 'soft' | 'bony';
  /** Ногти. */
  readonly nails?: string;
  /** Колечко на безымянном пальце (цвет) — деталь образа. */
  readonly ring?: string;
  /** Сдвиг всей кисти вдоль +x (у Агаты кисть начинается прямо от запястья). */
  readonly shift?: number;
}

const r1 = (n: number): string => (Math.round(n * 10) / 10).toString();

/**
 * Кисть по стандарту. fist — сжатый кулак: пальцы подогнуты (видны первые фаланги), большой палец лежит поверх.
 * Рисунок — с центром в начале координат, укладывается в квадрат ±30.
 */
export function handSvg(s: HandStyle, fist = false): string {
  const { outline: O, skin, skinSh, skinHi, line } = s;
  // Кулак — полнее раскрытой ладони: сжатые пальцы собирают кисть в круглый ком.
  const { cx, rx } = s.palm;
  const ry = s.palm.ry * (fist ? 1.12 : 1);
  const f = s.fingers;
  const fw = f.w, tw = s.thumb.w;
  const ys = [-1.5, -0.5, 0.5, 1.5].map((k) => k * f.gap);
  // Пальцы чуть расходятся веером; в кулаке — короткие подогнутые фаланги.
  const spread = fist ? [0, 0, 0, 0] : [-0.9, -0.2, 0.5, 1.3];
  const lens = fist ? f.len.map((_, i) => fw * (i === 3 ? 1.5 : 1.75)) : f.len;
  const ends = ys.map((y, i) => ({ x: f.base + lens[i]!, y: y + spread[i]! + (fist ? 0 : f.droop * (0.6 + i * 0.2)) }));
  const fingers = ys.map((y, i) => `M${r1(f.base - 2)} ${r1(y)} Q${r1(f.base + lens[i]! * 0.55)} ${r1(y + spread[i]! * 0.3)} ${r1(ends[i]!.x)} ${r1(ends[i]!.y)}`);
  const palm = fist
    ? `M${r1(cx - rx)} 0 A${r1(rx * 1.02)} ${r1(ry)} 0 1 1 ${r1(cx + rx * 1.04)} 0 A${r1(rx * 1.02)} ${r1(ry)} 0 1 1 ${r1(cx - rx)} 0 Z`
    : `M${r1(cx - rx)} ${r1(-ry * 0.82)} Q${r1(cx - rx * 0.2)} ${r1(-ry * 1.08)} ${r1(cx + rx * 0.95)} ${r1(-ry * 0.9)} Q${r1(cx + rx * 1.12)} 0 ${r1(cx + rx * 0.95)} ${r1(ry * 0.9)} Q${r1(cx - rx * 0.2)} ${r1(ry * 1.1)} ${r1(cx - rx)} ${r1(ry * 0.82)} Q${r1(cx - rx * 1.18)} 0 ${r1(cx - rx)} ${r1(-ry * 0.82)} Z`;
  // Большой палец. Раскрытая кисть: от бугра у запястья вперёд-вверх, кончик заметно над указательным.
  // Кулак: лежит поперёк подогнутых пальцев, со своим контуром.
  const tRoot = { x: cx - rx * 0.25, y: -ry * 0.55 };
  const tTip = fist ? { x: f.base + fw * 0.35, y: ys[2]! + f.gap * 0.15 } : { x: cx + rx * 0.2 + s.thumb.len, y: -ry - tw * 0.55 };
  const thumb = fist
    ? `M${r1(cx - rx * 0.35)} ${r1(ry * 0.05)} Q${r1((cx + f.base) / 2)} ${r1(tTip.y + 1.2)} ${r1(tTip.x)} ${r1(tTip.y)}`
    : `M${r1(tRoot.x)} ${r1(tRoot.y)} Q${r1(cx + rx * 0.45)} ${r1(-ry * 1.05)} ${r1(tTip.x)} ${r1(tTip.y)}`;
  const cap = 'stroke-linecap="round" stroke-linejoin="round" fill="none"';
  const shapes = (color: string, scaleW: number, withThumb: boolean): string =>
    `<path d="${palm}" fill="${color}"/>` +
    fingers.map((p) => `<path d="${p}" stroke="${color}" stroke-width="${r1(fw * scaleW)}" ${cap}/>`).join('') +
    (withThumb ? `<path d="${thumb}" stroke="${color}" stroke-width="${r1(tw * scaleW)}" ${cap}/>` : '');
  // 1) Силуэт одним контуром (у раскрытой кисти большой палец — часть силуэта).
  const outlinePass = `<path d="${palm}" fill="${O}" stroke="${O}" stroke-width="${line * 2}" stroke-linejoin="round"/>
  ${fingers.map((p) => `<path d="${p}" stroke="${O}" stroke-width="${r1(fw + line * 2)}" ${cap}/>`).join('')}
  ${fist ? '' : `<path d="${thumb}" stroke="${O}" stroke-width="${r1(tw + line * 2)}" ${cap}/>`}`;
  // 2) Тень, 3) свет — те же формы, свет чуть уже и выше-левее: снизу-справа остаётся кромка тени.
  const shade = shapes(skinSh, 1, !fist);
  const lit = `<g transform="translate(-0.5 -1)">${`<path d="${palm}" fill="${skin}" transform="translate(${r1(cx)} 0) scale(0.9) translate(${r1(-cx)} 0)"/>` +
    fingers.map((p) => `<path d="${p}" stroke="${skin}" stroke-width="${r1(fw * 0.55)}" ${cap}/>`).join('') +
    (fist ? '' : `<path d="${thumb}" stroke="${skin}" stroke-width="${r1(tw * 0.55)}" ${cap}/>`)}</g>`;
  // Щели между пальцами — тонкие, от костяшек к кончикам.
  const slits = ys.slice(0, 3).map((y, i) => {
    const a = ends[i]!, b = ends[i + 1]!;
    const t = fist ? 0.6 : 0.82;
    const yy = y + f.gap / 2;
    const ex = f.base + Math.min(lens[i]!, lens[i + 1]!) * t, ey = (a.y + b.y) / 2;
    return `<path d="M${r1(f.base + (fist ? -1 : 2))} ${r1(yy)} Q${r1((f.base + ex) / 2)} ${r1(yy)} ${r1(ex)} ${r1(ey)}" stroke="${O}" stroke-width="${r1(line * 0.45)}" fill="none" stroke-linecap="round" opacity="0.8"/>`;
  }).join('');
  // Складка между большим пальцем и ладонью.
  const thumbCrease = fist ? '' : `<path d="M${r1(tRoot.x + 2)} ${r1(tRoot.y + 2)} Q${r1(cx + rx * 0.5)} ${r1(-ry * 0.7)} ${r1(f.base + 2)} ${r1(ys[0]! - fw * 0.55)}" stroke="${O}" stroke-width="${r1(line * 0.45)}" fill="none" stroke-linecap="round" opacity="0.8"/>`;
  // Кулак: большой палец поверх пальцев — со своим контуром и тенью.
  const fistThumb = fist ? `<path d="${thumb}" stroke="${O}" stroke-width="${r1(tw + line * 2)}" ${cap}/>
  <path d="${thumb}" stroke="${skinSh}" stroke-width="${r1(tw)}" ${cap}/>
  <path d="${thumb}" stroke="${skin}" stroke-width="${r1(tw * 0.55)}" ${cap} transform="translate(-0.4 -0.8)"/>` : '';
  // Ногти — светлые овалы у кончиков.
  const nails = !s.nails ? '' : fist
    ? `<ellipse cx="${r1(tTip.x - tw * 0.15)}" cy="${r1(tTip.y - 0.4)}" rx="${r1(tw * 0.24)}" ry="${r1(tw * 0.18)}" fill="${s.nails}"/>`
    : ends.map((e) => `<ellipse cx="${r1(e.x - fw * 0.05)}" cy="${r1(e.y - fw * 0.12)}" rx="${r1(fw * 0.22)}" ry="${r1(fw * 0.17)}" fill="${s.nails}"/>`).join('') +
      `<ellipse cx="${r1(tTip.x - tw * 0.05)}" cy="${r1(tTip.y - tw * 0.12)}" rx="${r1(tw * 0.22)}" ry="${r1(tw * 0.17)}" fill="${s.nails}"/>`;
  // Костяшки: мягкие складки (возраст) или выпуклые суставы (худая натруженная кисть); у кулака — ряд выпуклостей.
  const kx = f.base + 1;
  const knuckles = s.knuckles === 'none' || fist ? '' : ys.slice(1, 3).map((y) => {
    const bony = s.knuckles === 'bony';
    const w = fw * (bony ? 0.4 : 0.3);
    return `<path d="M${r1(kx - 1)} ${r1(y - w)} Q${r1(kx + (bony ? 2 : 1.4))} ${r1(y)} ${r1(kx - 1)} ${r1(y + w)}" stroke="${skinSh}" stroke-width="${bony ? 1.8 : 1.3}" fill="none" stroke-linecap="round" opacity="${bony ? 0.9 : 0.6}"/>`;
  }).join('');
  // Блик на тыльной стороне (свет слева сверху).
  const hi = `<path d="M${r1(cx - rx * 0.6)} ${r1(-ry * 0.15)} Q${r1(cx - rx * 0.15)} ${r1(-ry * 0.42)} ${r1(cx + rx * 0.4)} ${r1(-ry * 0.32)}" stroke="${skinHi}" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.9"/>`;
  // Колечко — маленький ободок у основания безымянного пальца.
  const ring = s.ring && !fist ? `<path d="M${r1(f.base + 3.5)} ${r1(ys[2]! - fw * 0.42)} L${r1(f.base + 4)} ${r1(ys[2]! + fw * 0.42)}" stroke="${s.ring}" stroke-width="1.8" stroke-linecap="round"/>` : '';
  return `<g transform="translate(${s.shift ?? 0} 0)">${outlinePass}${shade}${lit}${slits}${thumbCrease}${knuckles}${hi}${ring}${fistThumb}${nails}</g>`;
}
