// Адаптивная компоновка сцены «Агата напротив через стол» (docs/LAYOUT.md).
// Чистая функция: размеры окна → прямоугольники зон в CSS-пикселях. Правила, ИИ и звук о ней не знают.

export type LayoutKind = 'portrait' | 'portrait-wide' | 'landscape' | 'landscape-compact';

export interface Viewport {
  readonly width: number;
  readonly height: number;
  readonly safe?: { readonly top: number; readonly right: number; readonly bottom: number; readonly left: number };
  /** coarse — палец, fine — мышь. */
  readonly pointer?: 'coarse' | 'fine';
}

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface LayoutSpec {
  readonly kind: LayoutKind;
  /** Окно меньше поддерживаемого минимума: показывается подсказка повернуть устройство или увеличить окно. */
  readonly tooSmall: boolean;
  readonly width: number;
  readonly height: number;
  readonly safe: Rect;
  readonly pointer: 'coarse' | 'fine';
  /** Верхняя полоса HUD (кнопки по углам поверх сцены). */
  readonly hud: Rect;
  /** Персонаж: точка (x, y) — центр её талии/груди на дальнем краю стола; scale — масштаб фигуры. */
  readonly character: { readonly x: number; readonly y: number; readonly scale: number; readonly crop: 'bust' | 'waist'; readonly bounds: Rect };
  /** Стол в перспективе: дальний край и ближний (за нижней границей экрана). */
  readonly table: { readonly farY: number; readonly farLeft: number; readonly farRight: number; readonly nearY: number; readonly nearLeft: number; readonly nearRight: number };
  readonly tableCard: { readonly w: number; readonly h: number };
  readonly deck: Point;
  readonly discard: Point;
  /** Центр плашки с числом карт в колоде — на самой колоде, чтобы её не закрывал отбой. */
  readonly deckLabel: Point;
  /** Пары «атака/защита»: колонки и ряды. */
  readonly pairs: { readonly x: number; readonly y: number; readonly cols: number; readonly pitchX: number; readonly pitchY: number };
  readonly hand: { readonly cx: number; readonly bottom: number; readonly cardW: number; readonly cardH: number; readonly left: number; readonly right: number; readonly lift: number };
  /** Кнопки действий (HTML). */
  readonly actions: Rect;
  /** Строка состояния («Ваш ход…»). */
  readonly status: Rect;
  /** Фон кафе: масштаб и сдвиг рисунка фона (единицы BG_DESIGN). */
  readonly background: { readonly scale: number; readonly x: number; readonly y: number };
}

/** Размер рисунка фона кафе в его собственных единицах; центр персонажа — BG_CENTER_X. */
export const BG_DESIGN = { width: 2400, height: 900, centerX: 1200, tableY: 470 } as const;

/** Координаты фигуры персонажа в единицах рига (docs/ART_STYLE.md §5). */
export const FIGURE = { width: 430, centerX: 210, headTop: -16, waistY: 383, bustY: 300 } as const;

export const CARD_RATIO = 1.43;
export const MIN_TOUCH = 44;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Поддерживаемый минимум: портрет — 320×480, альбомная ориентация — 480×340. */
export function isTooSmall(width: number, height: number): boolean {
  const kind = layoutKind(width, height);
  return kind === 'portrait' || kind === 'portrait-wide' ? width < 320 || height < 480 : width < 480 || height < 340;
}

export function layoutKind(width: number, height: number): LayoutKind {
  const r = width / height;
  if (r < 0.8) return 'portrait';
  if (r < 1.15) return width >= 700 ? 'portrait-wide' : 'portrait';
  return height >= 560 ? 'landscape' : 'landscape-compact';
}

export function computeLayout(vp: Viewport): LayoutSpec {
  const W = Math.max(1, vp.width);
  const H = Math.max(1, vp.height);
  const ins = vp.safe ?? { top: 0, right: 0, bottom: 0, left: 0 };
  const pointer = vp.pointer ?? 'fine';
  const kind = layoutKind(W, H);
  const M = 16;
  const safe: Rect = { x: ins.left + M, y: ins.top + M, w: W - ins.left - ins.right - 2 * M, h: H - ins.top - ins.bottom - 2 * M };
  const cx = safe.x + safe.w / 2;
  const portraitish = kind === 'portrait' || kind === 'portrait-wide';

  // --- Размер карт руки ---
  // Карты в веере перекрываются, поэтому ширина карты может быть больше доли экрана на карту:
  // на телефоне шесть карт занимают ширину, каждая видна на ~70 % — индексы в углу читаются без прищура.
  let handW: number;
  if (kind === 'portrait') handW = clamp(Math.min(safe.w / 4.6, H * 0.125), 56, 110);
  else if (kind === 'portrait-wide') handW = clamp(Math.min(safe.w / 6.5, H * 0.115), 64, 124);
  else if (kind === 'landscape') handW = clamp(H * 0.145, 64, 136);
  else handW = clamp(H * 0.19, 46, 84);
  const handH = handW * CARD_RATIO;
  const lift = handH * 0.16;

  // --- Кнопки и строка состояния ---
  const btnH = clamp(H * 0.07, MIN_TOUCH + 4, 76);
  const hud: Rect = { x: safe.x, y: safe.y, w: safe.w, h: MIN_TOUCH };

  const handBottom = safe.y + safe.h;
  const handTop = handBottom - handH - lift;
  let actions: Rect;
  let handLeft = safe.x;
  let handRight = safe.x + safe.w;
  if (portraitish) {
    actions = { x: safe.x + safe.w * 0.42, y: handTop - 10 - btnH, w: safe.w * 0.58, h: btnH };
  } else {
    const aw = clamp(safe.w * 0.17, 140, 220);
    actions = { x: safe.x + safe.w - aw, y: handBottom - btnH * (kind === 'landscape-compact' ? 2 : 1) - (kind === 'landscape-compact' ? 8 : 0), w: aw, h: kind === 'landscape-compact' ? btnH * 2 + 8 : btnH };
    handRight = actions.x - 12;
    handLeft = kind === 'landscape' ? safe.x + safe.w * 0.15 : safe.x;
  }
  // Запас по краям под наклон крайних карт веера.
  handLeft += handW * 0.07;
  handRight -= handW * 0.07;
  // Строка состояния не отнимает место у стола: на телефоне — над кнопками, на компьютере — в левом нижнем углу,
  // на телефоне боком — в колонке кнопок.
  let status: Rect;
  if (portraitish) status = { x: safe.x, y: actions.y + (btnH - 40) / 2, w: safe.w * 0.42 - 8, h: 40 };
  else if (kind === 'landscape') status = { x: safe.x, y: handBottom - 52, w: handLeft - safe.x - 10, h: 52 };
  else status = { x: actions.x, y: actions.y - 54, w: actions.w, h: 48 };

  // --- Стол и персонаж ---
  // На невысоком телефоне стол начинается выше: иначе карты на столе слишком мелкие.
  const farRatio = { portrait: H < 720 ? 0.39 : 0.44, 'portrait-wide': 0.42, landscape: 0.54, 'landscape-compact': H < 400 ? 0.38 : 0.43 }[kind];
  const farY = Math.round(H * farRatio);
  const crop = kind === 'landscape-compact' ? 'bust' : 'waist';
  const anchorLocal = crop === 'bust' ? FIGURE.bustY : FIGURE.waistY;
  const topMargin = Math.max(ins.top + 6, H * 0.03);
  let scale = (farY - topMargin) / (anchorLocal - FIGURE.headTop);
  // Ширина фигуры не больше доступной; на широком экране — не гигантская.
  // Фигура несимметрична относительно центра (centerX): ограничиваем каждую половину.
  scale = Math.min(scale, cx / FIGURE.centerX, (W - cx) / (FIGURE.width - FIGURE.centerX), kind === 'landscape' ? 1.25 : 2);
  const charY = farY + 2;
  const charBounds: Rect = { x: cx - FIGURE.centerX * scale, y: charY - (anchorLocal - FIGURE.headTop) * scale, w: FIGURE.width * scale, h: (anchorLocal - FIGURE.headTop) * scale };

  const farHalf = portraitish ? W / 2 + 24 : Math.min(W * 0.34, safe.w * 0.48);
  const nearY = H + 60;
  const spread = portraitish ? 0.12 : 0.9;
  const nearHalf = farHalf + (nearY - farY) * spread;
  const table = { farY, farLeft: cx - farHalf, farRight: cx + farHalf, nearY, nearLeft: cx - nearHalf, nearRight: cx + nearHalf };

  // --- Карты на столе ---
  const playTop = farY + 14;
  const playBottom = (portraitish ? Math.min(status.y, actions.y) : handTop) - 8;
  // Место под колоду в ширинах карты: колода (0,75) + козырь поперёк, сдвинутый на 0,42 (+0,72) + зазор.
  const deckSpace = 2.05;
  const tableLeft = Math.max(safe.x, table.farLeft + 8);
  const tableRight = Math.min(safe.x + safe.w, table.farRight - 8);
  // Пара занимает ширину карты + сдвиг бьющей карты; высота — карта + сдвиг.
  // На телефоне выбираем один или два ряда — где карта крупнее; на компьютере — всегда один ряд.
  const fit = (rows: number) => {
    const cols = rows === 1 ? 6 : 3;
    const byHeight = (playBottom - playTop) / (rows * CARD_RATIO * 1.22 + (rows - 1) * 0.12);
    const byWidth = (tableRight - tableLeft) / (cols * 1.3 + deckSpace * (portraitish ? 1 : 2));
    return { rows, cols, tw: Math.min(byHeight, byWidth, handW * 0.95) };
  };
  const one = fit(1);
  const two = fit(2);
  const best = !portraitish || one.tw >= two.tw * 0.92 ? one : two;
  const { rows, cols } = best;
  const tw = clamp(best.tw, 30, 110);
  const th = tw * CARD_RATIO;
  const pitchX = tw * 1.3;
  const pitchY = th * 1.34;
  const pairsW = cols * pitchX;
  const deck: Point = { x: tableLeft + tw * 0.75, y: playTop + th * 0.62 };
  // На телефоне отбой — в левой колонке под колодой, чтобы не наезжать на пары. Телефон боком: левее колонки
  // кнопок и строки состояния.
  const discardRight = kind === 'landscape-compact' ? Math.min(tableRight, actions.x - 10) : tableRight;
  const discard: Point = portraitish ? { x: deck.x, y: Math.min(deck.y + Math.max(th * 1.5, (rows - 1) * pitchY), playBottom - th * 0.6) } : { x: discardRight - tw * 0.75, y: playTop + th * 0.62 };
  // Пары не заходят на колоду с козырем (правый край козыря — 1,89 ширины карты от края стола).
  const pairsMin = tableLeft + tw * 1.95 + 4;
  const pairsLeft = portraitish ? clamp(cx - pairsW / 2, pairsMin, tableRight - pairsW) : Math.max(cx - pairsW / 2, pairsMin);
  const pairs = { x: pairsLeft + tw / 2, y: playTop + th / 2 + 2, cols, pitchX, pitchY };

  // --- Фон кафе: «cover» по высоте, центр — за персонажем, стол фона совпадает с дальним краем ---
  const bgScale = Math.max(H / BG_DESIGN.height, (farY + 40) / BG_DESIGN.tableY);
  const background = { scale: bgScale, x: cx - BG_DESIGN.centerX * bgScale, y: farY - BG_DESIGN.tableY * bgScale };

  return {
    kind, tooSmall: isTooSmall(W, H), width: W, height: H, safe, pointer, hud,
    character: { x: cx, y: charY, scale, crop, bounds: charBounds },
    table, tableCard: { w: tw, h: th }, deck, discard, deckLabel: { x: deck.x, y: deck.y + th * 0.18 }, pairs,
    hand: { cx: (handLeft + handRight) / 2, bottom: handBottom, cardW: handW, cardH: handH, left: handLeft, right: handRight, lift },
    actions, status, background,
  };
}

/** Центр пары №i на столе; при известном числе пар ряд центрируется в своей зоне. */
export function pairSlot(spec: LayoutSpec, i: number, count?: number): Point {
  const { cols } = spec.pairs;
  const col = i % cols;
  const row = Math.floor(i / cols);
  const inRow = count === undefined ? cols : Math.min(cols, count - row * cols);
  const shift = ((cols - inRow) / 2) * spec.pairs.pitchX;
  return { x: spec.pairs.x + col * spec.pairs.pitchX + shift, y: spec.pairs.y + row * spec.pairs.pitchY };
}

/** Сдвиг бьющей карты относительно атакующей. */
export const defenseOffset = (spec: LayoutSpec): Point => ({ x: spec.tableCard.w * 0.24, y: spec.tableCard.h * 0.16 });

export interface HandSlot {
  readonly x: number;
  readonly y: number;
  readonly rot: number;
  /** Ширина видимой части карты (для выбора пальцем). */
  readonly visible: number;
}

/** Минимальная видимая полоска карты в веере, чтобы её можно было выбрать. */
export const MIN_VISIBLE = 30;

/** Веер руки игрока: при нехватке места — несколько рядов. Центр карты (x, y). */
export function handSlots(spec: LayoutSpec, n: number): HandSlot[] {
  const { cardW, cardH, left, right, bottom, lift } = spec.hand;
  if (n === 0) return [];
  const avail = right - left;
  const natural = cardW * 0.94;
  const perRowMax = Math.max(1, Math.floor((avail - cardW) / MIN_VISIBLE) + 1);
  const rows = Math.ceil(n / perRowMax);
  const out: HandSlot[] = [];
  let index = 0;
  for (let r = 0; r < rows; r++) {
    const inRow = Math.ceil((n - index) / (rows - r));
    const step = inRow > 1 ? Math.min(natural, (avail - cardW) / (inRow - 1)) : 0;
    const width = cardW + step * (inRow - 1);
    const startX = spec.hand.cx - width / 2 + cardW / 2;
    // Задний ряд выше и левее не сдвигается: ряды стопкой, нижний — ближе к игроку.
    // Запас снизу под дугу веера: крайние карты опускаются не ниже края.
    const rowY = bottom - cardH / 2 - cardH * 0.035 - (rows - 1 - r) * cardH * 0.42;
    for (let k = 0; k < inRow; k++, index++) {
      const t = inRow > 1 ? k / (inRow - 1) - 0.5 : 0;
      out.push({ x: startX + step * k, y: rowY + Math.abs(t) * cardH * 0.06, rot: t * (inRow > 6 ? 0.12 : 0.18), visible: k === inRow - 1 ? cardW : step });
    }
  }
  void lift;
  return out;
}
