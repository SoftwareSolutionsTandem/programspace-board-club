// Общие приёмы рисования объёмных фигур для изометрической доски (docs/ART_STYLE.md §11): «точёный» профиль,
// цилиндры-основания и тень правой стороны. Свет — слева сверху, как у персонажей и стола; контур — тот же
// тёмно-коричневый, что у всего клуба. Строит SVG-строки, без DOM.

export const OUTLINE = '#3B2418';
export const ol = (w = 4): string => `stroke="${OUTLINE}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

/** Отношение полуосей эллипса «круга на доске» — то же, что у ромба клетки (ISO_RATIO). */
export const FLAT = 0.5;

export interface Tone {
  readonly base: string;
  readonly shade: string;
  readonly hi: string;
  readonly accent: string;
}

/** Сглаженный путь через точки (Катмулл — Ром → кубические Безье). */
export function smooth(points: readonly (readonly [number, number])[], closed = false): string {
  const n = points.length;
  if (n < 2) return '';
  const at = (i: number) => points[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))]!;
  let d = `M${at(0)[0].toFixed(2)} ${at(0)[1].toFixed(2)}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0]!.toFixed(2)} ${c1[1]!.toFixed(2)} ${c2[0]!.toFixed(2)} ${c2[1]!.toFixed(2)} ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return closed ? d + ' Z' : d;
}

/**
 * Тело вращения: профиль — пары (радиус, y) снизу вверх, ось — x = cx. Возвращает замкнутый путь:
 * левая сторона вверх, правая — вниз; низ — по дуге эллипса основания.
 */
export function lathe(cx: number, profile: readonly (readonly [number, number])[]): string {
  const left = profile.map(([r, y]) => [cx - r, y] as const);
  const right = [...profile].reverse().map(([r, y]) => [cx + r, y] as const);
  const [r0, y0] = profile[0]!;
  const side = smooth([...left, ...right]);
  return `${side} A${r0} ${r0 * FLAT} 0 0 1 ${cx - r0} ${y0} Z`;
}

/** Заливка формы с тенью правой стороны и бликом слева. id — уникальный в документе. */
export function shaded(id: string, d: string, t: Tone, cx: number, top: number, bottom: number, w = 4): string {
  return `<clipPath id="${id}"><path d="${d}"/></clipPath>
  <path d="${d}" fill="${t.base}"/>
  <g clip-path="url(#${id})">
    <ellipse cx="${cx + 30}" cy="${(top + bottom) / 2}" rx="26" ry="${(bottom - top) * 0.75}" fill="${t.shade}" opacity="0.85"/>
    <ellipse cx="${cx - 14}" cy="${top + (bottom - top) * 0.42}" rx="6" ry="${(bottom - top) * 0.32}" fill="${t.hi}" opacity="0.55"/>
  </g>
  <path d="${d}" fill="none" ${ol(w)}/>`;
}

/** Цилиндр: боковая полоса и верхний эллипс (кольцо, подставка, ободок). */
export function cylinder(id: string, cx: number, yTop: number, yBot: number, rx: number, t: Tone, w = 4): string {
  const ry = rx * FLAT;
  const side = `M${cx - rx} ${yTop} L${cx - rx} ${yBot} A${rx} ${ry} 0 0 0 ${cx + rx} ${yBot} L${cx + rx} ${yTop} Z`;
  return `${shaded(id, side, t, cx, yTop - ry, yBot + ry, w)}
  <ellipse cx="${cx}" cy="${yTop}" rx="${rx}" ry="${ry}" fill="${t.base}" ${ol(w * 0.8)}/>
  <ellipse cx="${cx - rx * 0.2}" cy="${yTop - ry * 0.15}" rx="${rx * 0.55}" ry="${ry * 0.45}" fill="${t.hi}" opacity="0.45"/>`;
}

export const svgDoc = (w: number, h: number, inner: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`;
