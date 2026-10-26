// Рисунок костей домино в стиле клуба (docs/ART_STYLE.md §2, §6): слоновая кость, тёмные точки, латунный штифт посередине.
// Кость горизонтальна: старшая половина слева. Рубашка — тёмное дерево с латунной рамкой (как кость в руке Матвея).
// Модуль не зависит от DOM.
export const BONE_BOX = { x: -48, y: -24, w: 96, h: 48 } as const;

const C = { outline: '#3B2418', face: '#FFF8EA', faceSh: '#EADBC0', pip: '#2A2230', pin: '#C9973A', back: '#3A2A22', backHi: '#5A4234', frame: '#E8AB30' };
const ol = (w: number): string => `stroke="${C.outline}" stroke-width="${w}" stroke-linejoin="round"`;
const svgDoc = (inner: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${BONE_BOX.x} ${BONE_BOX.y} ${BONE_BOX.w} ${BONE_BOX.h}" width="${BONE_BOX.w}" height="${BONE_BOX.h}">${inner}</svg>`;

// Точки половины: сетка 3 × 3 с шагом 12 вокруг центра половины.
const D = 12.5;
const PIPS: Record<number, readonly (readonly [number, number])[]> = {
  0: [],
  1: [[0, 0]],
  2: [[-D, -D], [D, D]],
  3: [[-D, -D], [0, 0], [D, D]],
  4: [[-D, -D], [D, -D], [-D, D], [D, D]],
  5: [[-D, -D], [D, -D], [0, 0], [-D, D], [D, D]],
  6: [[-D, -D], [0, -D], [D, -D], [-D, D], [0, D], [D, D]],
};

function half(n: number, cx: number): string {
  return PIPS[n]!.map(([x, y]) => `<circle cx="${cx + x}" cy="${y}" r="4.6" fill="${C.pip}"/><circle cx="${cx + x - 1.3}" cy="${y - 1.4}" r="1.3" fill="#FFFFFF" opacity="0.35"/>`).join('');
}

/** Лицо кости hi:lo (hi — левая половина). */
export function boneFaceSvg(hi: number, lo: number): string {
  return svgDoc(`<rect x="-46" y="-22" width="92" height="44" rx="8" fill="${C.faceSh}" ${ol(3)}/>
  <rect x="-44" y="-21" width="88" height="38" rx="7" fill="${C.face}"/>
  <path d="M-38 -17 H30" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" opacity="0.8"/>
  <rect x="-46" y="-22" width="92" height="44" rx="8" fill="none" ${ol(3)}/>
  <path d="M0 -17 V17" stroke="${C.outline}" stroke-width="2.4" stroke-linecap="round" opacity="0.75"/>
  <circle r="3.2" fill="${C.pin}" stroke="${C.outline}" stroke-width="1.2"/>
  ${half(hi, -23)}${half(lo, 23)}`);
}

/** Рубашка кости. */
export function boneBackSvg(): string {
  return svgDoc(`<rect x="-46" y="-22" width="92" height="44" rx="8" fill="${C.back}" ${ol(3)}/>
  <path d="M-38 -16 H34" stroke="${C.backHi}" stroke-width="3" stroke-linecap="round"/>
  <rect x="-39" y="-15" width="78" height="30" rx="5" fill="none" stroke="${C.frame}" stroke-width="2"/>
  <circle r="4" fill="${C.frame}" stroke="${C.outline}" stroke-width="1.2"/>`);
}
