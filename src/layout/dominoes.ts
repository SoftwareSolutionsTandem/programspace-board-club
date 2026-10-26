// Компоновка стола домино (docs/LAYOUT.md, docs/games/dominoes.md): общий кадр «Матвей напротив через стол»
// из computeLayout плюс места костей — рука, кости Матвея на краю стола, базар и цепочка-«змейка».
// Чистые функции: размеры окна и цепочка → координаты в CSS-пикселях. Правила и ИИ о них не знают.
import { computeLayout, MIN_TOUCH, type LayoutSpec, type Point, type Rect, type Viewport } from './layout';

/** Кость на столе: half — короткая сторона (кость — 2 × 1 half). Текстура кости горизонтальна, старшая половина слева. */
export interface BonePose {
  readonly x: number;
  readonly y: number;
  readonly rot: number;
}

export interface DominoLayout extends LayoutSpec {
  readonly domino: {
    /** Короткая сторона кости в руке игрока (кости стоят вертикально, высота — 2 × handHalf). */
    readonly handHalf: number;
    /** Кости Матвея — рубашкой к игроку на дальнем краю стола. */
    readonly opponent: { readonly cx: number; readonly y: number; readonly half: number; readonly maxW: number };
    /** Базар: стопка рубашек и число костей. */
    readonly bazaar: { readonly x: number; readonly y: number; readonly half: number };
    /** Где лежит цепочка и самый крупный размер её костей. */
    readonly chain: { readonly area: Rect; readonly maxHalf: number; readonly minHalf: number };
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function computeDominoLayout(vp: Viewport): DominoLayout {
  const base = computeLayout(vp);
  const portraitish = base.kind === 'portrait' || base.kind === 'portrait-wide';
  const { hand, table } = base;
  // Рука: 7 костей стоймя в ряд без перекрытия; высота — не больше высоты карты общей компоновки.
  const gap = 6;
  // На компьютере кость в руке не выше 7 % высоты окна: остаётся место для цепочки. На телефоне — не уже удобного касания.
  const handHalf = clamp(Math.min((hand.right - hand.left - 6 * gap) / 7, hand.cardH / 2, base.kind === 'landscape' ? base.height * 0.068 : base.kind === 'landscape-compact' ? base.height * 0.1 : Infinity), MIN_TOUCH * 0.8, 64);
  const handTop = hand.bottom - handHalf * 2 - handHalf * 0.3;
  // Кости Матвея — у его рук на дальнем краю стола.
  const oppHalf = clamp(handHalf * 0.5, 12, 26);
  const tableLeft = Math.max(base.safe.x, table.farLeft + 8);
  const tableRight = Math.min(base.safe.x + base.safe.w, table.farRight - 8);
  const opponent = { cx: base.character.x, y: table.farY + oppHalf * 1.1, half: oppHalf, maxW: Math.min(tableRight - tableLeft, base.character.bounds.w * 1.15) };
  // Игровое поле: от костей Матвея до строки состояния/кнопок (телефон) или до руки (компьютер).
  const playTop = opponent.y + oppHalf * 1.2 + 6;
  const playBottom = (portraitish ? Math.min(base.status.y, base.actions.y) : handTop) - 8;
  // Базар — слева, стопкой рубашек; на телефоне — узкой колонкой.
  const bazaarHalf = clamp(handHalf * 0.42, 11, 24);
  const bazaar = { x: tableLeft + bazaarHalf * 2.2, y: playTop + (playBottom - playTop) / 2, half: bazaarHalf };
  const left = bazaar.x + bazaarHalf * 2.6;
  const right = portraitish ? tableRight : Math.min(tableRight, base.actions.x - 8) - (left - tableLeft) * 0.4;
  const area: Rect = { x: left, y: playTop, w: Math.max(40, right - left), h: Math.max(40, playBottom - playTop) };
  return {
    ...base,
    domino: {
      handHalf,
      opponent,
      bazaar,
      chain: { area, maxHalf: clamp(handHalf * (portraitish ? 0.72 : 0.85), 14, 44), minHalf: Math.min(10, handHalf * 0.4) },
    },
  };
}

// ---------- рука ----------

export interface HandBoneSlot {
  readonly x: number;
  readonly y: number;
  readonly half: number;
}

/** Кости руки стоймя: ряд по центру; если не помещаются — мельче, затем вторым рядом. */
export function dominoHandSlots(spec: DominoLayout, n: number): HandBoneSlot[] {
  if (n === 0) return [];
  const { left, right, bottom, cx } = spec.hand;
  const avail = right - left;
  const gapK = 0.14;
  // Не мельче, чем удобно попасть пальцем: ширина кости ≥ MIN_TOUCH × 0,8.
  const minHalf = Math.max(MIN_TOUCH * 0.8, spec.domino.handHalf * 0.62);
  let half = Math.min(spec.domino.handHalf, avail / (n * (1 + gapK)));
  let rows = 1;
  if (half < minHalf) {
    rows = 2;
    half = Math.min(spec.domino.handHalf * 0.8, avail / (Math.ceil(n / 2) * (1 + gapK)));
  }
  const out: HandBoneSlot[] = [];
  let index = 0;
  for (let r = 0; r < rows; r++) {
    const inRow = Math.ceil((n - index) / (rows - r));
    const step = half * (1 + gapK);
    const startX = cx - (step * (inRow - 1)) / 2;
    const y = bottom - half - half * 0.2 - (rows - 1 - r) * half * 2.15;
    for (let k = 0; k < inRow; k++, index++) out.push({ x: startX + step * k, y, half });
  }
  return out;
}

/** Кости Матвея на краю стола: ряд рубашек, при большом числе — плотнее. */
export function opponentBoneSlots(spec: DominoLayout, n: number): HandBoneSlot[] {
  const o = spec.domino.opponent;
  if (n === 0) return [];
  const half = Math.min(o.half, o.maxW / (n * 1.12));
  const step = half * 1.12;
  const start = o.cx - (step * (n - 1)) / 2;
  return Array.from({ length: n }, (_, i) => ({ x: start + step * i, y: o.y, half }));
}

// ---------- цепочка-«змейка» ----------

/** Кость цепочки для раскладки: числа её концов и дубль ли она. */
export interface ChainBone {
  readonly hi: number;
  readonly lo: number;
  /** Число, обращённое к левому концу цепочки, и к правому. */
  readonly left: number;
  readonly right: number;
}

export interface ChainPlan {
  readonly half: number;
  readonly poses: readonly BonePose[];
  /** Куда встанет следующая обычная кость у каждого конца (для подсветки и перетаскивания). */
  readonly ends: { readonly left: BonePose; readonly right: BonePose } | null;
  readonly fits: boolean;
}

const RIGHT = 0, DOWN = Math.PI / 2, LEFT = Math.PI, UP = -Math.PI / 2;

/**
 * Раскладка цепочки при размере half. origin — индекс первой выложенной кости: она в центре поля,
 * правая ветвь идёт вправо и заворачивает вниз, левая — влево и заворачивает вверх.
 * Дубль в ряду — поперёк; на повороте кость стоит вдоль хода.
 */
export function chainPoses(chain: readonly ChainBone[], origin: number, area: Rect, half: number): ChainPlan {
  const s = half;
  const g = s * 0.08;
  const pitch = 2 * s + s * 0.3;
  const cx = area.x + area.w / 2;
  const cy = area.y + area.h / 2;
  const xmin = area.x, xmax = area.x + area.w;
  const poses: BonePose[] = new Array(chain.length);
  if (chain.length === 0) return { half, poses, ends: null, fits: true };
  const dbl = (b: ChainBone) => b.hi === b.lo;
  // Поворот кости: её «внешнее» число смотрит по ходу цепочки. Текстура: старшая половина слева (−x).
  const rotFor = (b: ChainBone, outer: number, flow: number, along: boolean) => {
    if (dbl(b)) return along ? flow : flow + Math.PI / 2;
    return outer === b.lo ? flow : flow + Math.PI;
  };
  const o = chain[origin]!;
  const oLen = dbl(o) ? s : 2 * s;
  poses[origin] = { x: cx, y: cy, rot: rotFor(o, o.right, RIGHT, false) };
  let maxOff = dbl(o) ? s : s / 2;
  let fits = true;

  const walk = (indices: readonly number[], side: 'left' | 'right'): BonePose => {
    let dir = side === 'right' ? 1 : -1;
    const step = side === 'right' ? 1 : -1;
    let cursor = cx + dir * (oLen / 2 + g);
    let rowY = cy;
    const outerOf = (b: ChainBone) => (side === 'right' ? b.right : b.left);
    const place = (b: ChainBone | null): BonePose => {
      const along = b && dbl(b) ? s : 2 * s;
      const limit = dir > 0 ? xmax - s - g : xmin + s + g;
      const fitsRow = dir > 0 ? cursor + along <= limit : cursor - along >= limit;
      if (fitsRow) {
        const pose = { x: cursor + (dir * along) / 2, y: rowY, rot: b ? rotFor(b, outerOf(b), dir > 0 ? RIGHT : LEFT, false) : dir > 0 ? RIGHT : LEFT };
        if (b) {
          cursor += dir * (along + g);
          maxOff = Math.max(maxOff, Math.abs(rowY - cy) + (dbl(b) ? s : s / 2));
        }
        return pose;
      }
      // Поворот: кость вдоль хода в колонке у края, между рядами.
      const flow = step > 0 ? DOWN : UP;
      const pose = { x: cursor + (dir * s) / 2, y: rowY + (step * pitch) / 2, rot: b ? rotFor(b, outerOf(b), flow, true) : flow };
      if (b) {
        rowY += step * pitch;
        dir = -dir;
        maxOff = Math.max(maxOff, Math.abs(rowY - cy) + s);
      }
      return pose;
    };
    for (const i of indices) poses[i] = place(chain[i]!);
    return place(null);
  };

  const rightIdx = Array.from({ length: chain.length - origin - 1 }, (_, k) => origin + 1 + k);
  const leftIdx = Array.from({ length: origin }, (_, k) => origin - 1 - k);
  const right = walk(rightIdx, 'right');
  const left = walk(leftIdx, 'left');
  if (maxOff > area.h / 2) fits = false;
  // Конец не должен выходить за поле: иначе следующей кости негде встать.
  for (const e of [left, right]) if (Math.abs(e.y - cy) + s > area.h / 2) fits = false;
  return { half, poses, ends: { left, right }, fits };
}

/** Самый крупный размер костей, при котором цепочка (и место под следующую кость) помещается в поле. */
export function fitChain(chain: readonly ChainBone[], origin: number, spec: DominoLayout): ChainPlan {
  const { area, maxHalf, minHalf } = spec.domino.chain;
  // Короткая сторона не больше четверти высоты поля: в поле помещаются хотя бы два ряда.
  let half = Math.min(maxHalf, area.h / 4.6);
  for (;;) {
    const plan = chainPoses(chain, origin, area, half);
    if (plan.fits || half <= minHalf) return plan;
    half = Math.max(minHalf, half * 0.93);
  }
}

/** Ближайший к точке конец цепочки (для перетаскивания кости), если точка рядом с ним. */
export function endAt(plan: ChainPlan, p: Point): 'left' | 'right' | null {
  if (!plan.ends) return null;
  const d = (e: BonePose) => Math.hypot(p.x - e.x, p.y - e.y);
  const dl = d(plan.ends.left), dr = d(plan.ends.right);
  const r = plan.half * 2.6;
  if (Math.min(dl, dr) > r) return null;
  return dl <= dr ? 'left' : 'right';
}
