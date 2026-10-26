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
