// Компоновка партии на доске (шахматы, шашки; docs/LAYOUT.md §6в): общий кадр «персонаж напротив через стол»
// из computeLayout, а на столе — доска, стоящая прямо, во взгляде сверху-сбоку с мягкой перспективой (iso.ts).
// Дальний край доски — перед персонажем (его руки лежат на столе за ней), ближний — у игрока; под доской —
// взятые фигуры. Чистые функции: размеры окна → координаты (CSS-пиксели).
import { boardBounds, type IsoBoard } from './iso';
import { BG_DESIGN, computeLayout, FIGURE, MIN_TOUCH, type LayoutSpec, type Point, type Rect, type Viewport } from './layout';

/** Высота ближнего ряда к ширине клетки: взгляд сверху-сбоку (1 — строго сверху). */
export const TILT = 0.7;
/** Перспектива: дальний край уже ближнего в 1 + PERSP раз. */
export const PERSP = 0.2;
/** Толщина доски к высоте ближнего ряда. */
export const DEPTH_RATIO = 0.45;
/** Размер значка взятой фигуры к ширине клетки. */
const TRAY_SIZE = 0.42;

export interface BoardLayout extends LayoutSpec {
  readonly board: IsoBoard & {
    /** Взятые фигуры: слева — что взял игрок, справа — что взял персонаж (под доской или по её бокам). */
    readonly trays: { readonly human: Tray; readonly opponent: Tray };
    /** Радиус «притяжения» касания к подсказанной клетке (палец мимо клетки). */
    readonly snap: number;
  };
}

/** Ряд взятых фигур: начало, шаг вдоль края и размер значка. */
export interface Tray {
  readonly start: Point;
  readonly step: Point;
  readonly size: number;
  readonly max: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** pieceRise — рост самой высокой фигуры над её клеткой (в ширинах клетки): шахматы ≈ 1, шашки ≈ 0,35. */
export function computeBoardLayout(vp: Viewport, opts: { pieceRise?: number } = {}): BoardLayout {
  const rise = opts.pieceRise ?? 0.6;
  const base = computeLayout(vp);
  const portraitish = base.kind === 'portrait' || base.kind === 'portrait-wide';
  const { safe } = base;
  const W = base.width, H = base.height;
  const btnH = clamp(H * 0.07, MIN_TOUCH + 4, 76);

  // Кнопки и строка состояния: карт в руке нет, поэтому на телефоне — внизу экрана, на компьютере — как в общей компоновке.
  let actions: Rect = base.actions;
  let status: Rect = base.status;
  if (portraitish) {
    actions = { x: safe.x + safe.w * 0.5, y: safe.y + safe.h - btnH, w: safe.w * 0.5, h: btnH };
    status = { x: safe.x, y: actions.y + (btnH - 40) / 2, w: safe.w * 0.5 - 8, h: 40 };
  }

  // Доска с рамкой, передней гранью и рядом взятых фигур под ней — между дальним краем стола (с отступом:
  // там лежат руки персонажа) и строкой состояния (телефон) или нижним краем (компьютер: кнопки и строка — по сторонам).
  const bottom = portraitish ? Math.min(actions.y, status.y) - 8 : safe.y + safe.h - 4;
  // На компьютере персонаж меньше, чем за карточным столом: доске нужна высота.
  const farMin = base.kind === 'landscape' ? Math.round(H * 0.36) : base.table.farY;
  // Габарит доски при клетке шириной 1 (всё остальное ей пропорционально).
  const unit = (tw: number): IsoBoard => ({ cx: 0, nearY: 0, tileW: tw, tilt: TILT, persp: PERSP, tileH: tw * TILT, depth: tw * TILT * DEPTH_RATIO });
  const ub = boardBounds(unit(1));
  const compactH = base.kind === 'landscape-compact';
  // Отступ от дальнего края стола: руки персонажа лежат на столе за доской, высокие фигуры дальнего ряда
  // не должны заслонять их целиком.
  const gapFar = (tw: number) => (compactH ? tw * (0.1 + rise * 0.1) + 2 : tw * (0.2 + rise * 0.3) + 4);
  // Взятые фигуры: на телефоне — рядом под доской, на широком экране — колонками по бокам (высота дороже).
  const sideTrays = !portraitish;
  const trayH = (tw: number) => (sideTrays ? 4 : tw * TRAY_SIZE * 1.5 + 6);
  const trayW = sideTrays ? 2 * TRAY_SIZE * 1.7 : 0;
  const totalH = (tw: number) => gapFar(tw) + ub.h * tw + trayH(tw);
  // По ширине: на телефоне — вся ширина; на компьютере — между строкой состояния и кнопками.
  // Телефон боком: кнопки и строка состояния — колонкой справа, доска и персонаж — левее неё.
  const compact = base.kind === 'landscape-compact';
  const regionRight = compact ? actions.x - 10 : safe.x + safe.w;
  const sideRoom = portraitish ? safe.w : compact ? regionRight - safe.x : Math.min(W - 2 * Math.max(actions.w, status.w) - 2 * safe.x - 24, safe.w * 0.8);
  // Высота линейна по клетке плюс постоянные отступы: ширину клетки находим из неё напрямую.
  const tileW = Math.max(18, Math.min((bottom - farMin - totalH(0)) / (totalH(1) - totalH(0)), sideRoom / (ub.w + trayW), 120));
  const tileH = tileW * TILT;
  const depth = tileH * DEPTH_RATIO;
  // Лишняя высота (телефон): персонаж чуть крупнее, доска — ближе к середине между ним и кнопками.
  const free = Math.max(0, bottom - farMin - totalH(tileW));
  const farY = Math.round(farMin + free * 0.35);
  const top = farY + gapFar(tileW) + Math.round(free * (portraitish ? 0.35 : 0.3));
  const cx = compact ? (safe.x + regionRight) / 2 : safe.x + safe.w / 2;
  const nearY = top - ub.y * tileW;
  const iso: IsoBoard = { cx, nearY, tileW, tilt: TILT, persp: PERSP, tileH, depth };
  const bb = boardBounds(iso);

  // Персонаж и стол — как в общей компоновке, но от своего дальнего края стола.
  const crop = base.character.crop;
  const anchorLocal = crop === 'bust' ? FIGURE.bustY : FIGURE.waistY;
  const topMargin = Math.max((vp.safe?.top ?? 0) + 6, H * 0.03);
  let scale = (farY - topMargin) / (anchorLocal - FIGURE.headTop);
  scale = Math.min(scale, cx / FIGURE.centerX, (W - cx) / (FIGURE.width - FIGURE.centerX), base.kind === 'landscape' ? 1.25 : 2);
  const charY = farY + 2;
  const charBounds: Rect = { x: cx - FIGURE.centerX * scale, y: charY - (anchorLocal - FIGURE.headTop) * scale, w: FIGURE.width * scale, h: (anchorLocal - FIGURE.headTop) * scale };
  const farHalf = Math.max(portraitish ? W / 2 + 24 : Math.min(W * 0.34, safe.w * 0.48), bb.w / 2 + 16);
  const tableNearY = H + 60;
  const spread = portraitish ? 0.12 : 0.9;
  const nearHalf = farHalf + (tableNearY - farY) * spread;
  const table = { farY, farLeft: cx - farHalf, farRight: cx + farHalf, nearY: tableNearY, nearLeft: cx - nearHalf, nearRight: cx + nearHalf };
  const bgScale = Math.max(H / BG_DESIGN.height, (farY + 40) / BG_DESIGN.tableY);
  const background = { scale: bgScale, x: cx - BG_DESIGN.centerX * bgScale, y: farY - BG_DESIGN.tableY * bgScale };

  // Взятые фигуры: под передней гранью доски — от левого края вправо (взял игрок) и от правого влево (взял персонаж);
  // на широком экране — колонками слева и справа от доски, от ближнего края к дальнему.
  const size = clamp(tileW * TRAY_SIZE, 14, 40);
  const n = 16;
  let humanTray: Tray, oppTray: Tray;
  if (sideTrays) {
    const pitch = Math.min(size * 0.55, (bb.h - size) / (n - 1));
    const y0 = bb.y + bb.h - size * 0.2;
    humanTray = { start: { x: bb.x - size * 0.85, y: y0 }, step: { x: 0, y: -pitch }, size, max: n };
    oppTray = { start: { x: bb.x + bb.w + size * 0.85, y: y0 }, step: { x: 0, y: -pitch }, size, max: n };
  } else {
    const pitch = Math.min(size * 0.72, (bb.w / 2 - size) / (n - 1));
    const trayY = bb.y + bb.h + size * 1.15;
    humanTray = { start: { x: bb.x + size * 0.5, y: trayY }, step: { x: pitch, y: 0 }, size, max: n };
    oppTray = { start: { x: bb.x + bb.w - size * 0.5, y: trayY }, step: { x: -pitch, y: 0 }, size, max: n };
  }

  return {
    ...base,
    actions,
    status,
    character: { x: cx, y: charY, scale, crop, bounds: charBounds },
    table,
    background,
    board: { ...iso, trays: { human: humanTray, opponent: oppTray }, snap: Math.max(MIN_TOUCH * 0.75, tileW * 0.7) },
  };
}

/** Где лежит k-я взятая фигура в ряду. */
export function traySlot(t: Tray, k: number): Point {
  const i = Math.min(k, t.max - 1);
  return { x: t.start.x + t.step.x * i, y: t.start.y + t.step.y * i };
}
