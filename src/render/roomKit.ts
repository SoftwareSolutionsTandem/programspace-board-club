// Общие детали рисунка комнат персонажей (docs/ART_STYLE.md §12): обводка, документ фона, табло счёта, мягкий свет.
// Стиль — как у персонажей и кафе: тёплая коричневая обводка, плоские заливки, мягкие тени. Без DOM.
import { BG_BOARD } from './cafe';

/** Обводка в стиле игры. */
export const ol = (w = 4, c = '#3B2418'): string => `stroke="${c}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

/** Документ фона 2400 × 900. */
export const roomDoc = (defs: string, inner: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2400 900" width="2400" height="900"><defs>${defs}</defs>${inner}</svg>`;

/**
 * Табло счёта: на этом месте приложение пишет счёт «мелом» (BG_BOARD), поэтому поле всегда тёмное и ровное.
 * frame — цвет рамки, fill — цвет поля.
 */
export function scoreSlate(frame: string, fill = '#2E4038', extra = ''): string {
  const b = BG_BOARD;
  return `<rect x="${b.x - 9}" y="${b.y - 9}" width="${b.w + 18}" height="${b.h + 18}" rx="10" fill="${fill}" ${ol(5)}/>
  <rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="6" fill="none" stroke="${frame}" stroke-width="5"/>${extra}`;
}

/** Мягкое пятно света (радиальный градиент id). */
export const glow = (id: string, x: number, y: number, rx: number, ry: number): string => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="url(#${id})"/>`;
export const glowDef = (id: string, color: string, alpha: number): string =>
  `<radialGradient id="${id}"><stop offset="0" stop-color="${color}" stop-opacity="${alpha}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`;

/** Рамка с картинкой (фото, постер): inner рисуется в координатах рамки. */
export const frame = (x: number, y: number, w: number, h: number, color: string, inner: string, pad = 10): string =>
  `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${color}" ${ol(3.5)}/>
  <svg x="${x + pad}" y="${y + pad}" width="${w - 2 * pad}" height="${h - 2 * pad}" viewBox="0 0 100 100" preserveAspectRatio="none">${inner}</svg>
  <rect x="${x + pad}" y="${y + pad}" width="${w - 2 * pad}" height="${h - 2 * pad}" fill="none" ${ol(2)}/></g>`;

// ---------- пол ----------

/** Линия пола во всех комнатах (единицы фона): стена кончается здесь, мебель стоит на этой линии. */
export const FLOOR_Y = 440;
/** Точка схода досок пола — на уровне глаз игрока над столом. */
const VP = { x: 1200, y: 120 };
const PLANKS = ['#B98352', '#AE7747', '#C08C5A', '#A9733F'] as const;

/**
 * Дощатый пол в перспективе и плинтус — одинаковые во всех комнатах. Доски сходятся к точке на уровне глаз,
 * поперечные стыки досок — вразбежку, ряды стыков к игроку редеют.
 */
export function floorSvg(baseboard = '#6A4023'): string {
  const bottom = 900;
  const k = (bottom - VP.y) / (FLOOR_Y - VP.y);
  const at = (x: number, y: number) => VP.x + (x - VP.x) * ((y - VP.y) / (FLOOR_Y - VP.y));
  let planks = '';
  const step = 64;
  for (let i = -24; i < 24; i++) {
    const x0 = VP.x + i * step, x1 = x0 + step;
    const b0 = VP.x + (x0 - VP.x) * k, b1 = VP.x + (x1 - VP.x) * k;
    if (Math.max(x1, b1) < -50 || Math.min(x0, b0) > 2450) continue;
    planks += `<path d="M${x0} ${FLOOR_Y} L${x1} ${FLOOR_Y} L${b1} ${bottom} L${b0} ${bottom} Z" fill="${PLANKS[(i + 48) % 4]}"/>`;
    // Поперечные стыки: у каждой доски свои, вразбежку.
    for (let r = 0; r < 4; r++) {
      const u = ((i * 0.37 + r * 0.29) % 1 + 1) % 1;
      const y = FLOOR_Y + (bottom - FLOOR_Y) * (0.08 + 0.9 * u * u);
      planks += `<path d="M${at(x0, y)} ${y} L${at(x1, y)} ${y}" stroke="#7E5230" stroke-width="2.2"/>`;
    }
  }
  let seams = '';
  for (let i = -24; i <= 24; i++) {
    const x0 = VP.x + i * step, b0 = VP.x + (x0 - VP.x) * k;
    if (Math.max(x0, b0) < -50 || Math.min(x0, b0) > 2450) continue;
    seams += `M${x0} ${FLOOR_Y} L${b0} ${bottom} `;
  }
  return `<g>
    <rect y="${FLOOR_Y}" width="2400" height="${bottom - FLOOR_Y}" fill="${PLANKS[0]}"/>${planks}
    <path d="${seams}" stroke="#6E4527" stroke-width="2.6" fill="none"/>
    <rect y="${FLOOR_Y}" width="2400" height="${bottom - FLOOR_Y}" fill="url(#floorShade)"/>
    <rect y="${FLOOR_Y - 18}" width="2400" height="22" fill="${baseboard}"/>
    <path d="M0 ${FLOOR_Y - 18} H2400" ${ol(3)}/><path d="M0 ${FLOOR_Y + 4} H2400" ${ol(4)}/>
    <path d="M0 ${FLOOR_Y - 12} H2400" stroke="#FFFFFF" stroke-width="2" opacity="0.18"/></g>`;
}
/** Градиент для floorSvg (добавить в defs комнаты): пол темнее у стены. */
export const floorDefs = `<linearGradient id="floorShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3B2418" stop-opacity="0.35"/><stop offset="0.3" stop-color="#3B2418" stop-opacity="0.05"/><stop offset="1" stop-color="#3B2418" stop-opacity="0"/></linearGradient>`;
