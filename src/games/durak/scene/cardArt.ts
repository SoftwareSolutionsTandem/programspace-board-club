// Рисунок карт подкидного (утверждён вместе с концептом Агаты, docs/ART_STYLE.md §6): лица с русскими индексами и рубашка.
// Модуль не зависит от DOM.
type SuitKey = 'h' | 'd' | 's' | 'c';
const C = { outline: '#3B2418', card: '#FFFDF6', red: '#C8263A', black: '#2A2230', back: '#8E2236', backPat: '#E8AB30' };
const ol = (w = 4): string => `stroke="${C.outline}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const svgDoc = (box: { x: number; y: number; w: number; h: number }, inner: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.x} ${box.y} ${box.w} ${box.h}" width="${box.w}" height="${box.h}">${inner}</svg>`;

const SUIT: Record<SuitKey, string> = {
  h: 'M0 9 C-15 -2 -12 -14 -5.5 -14 C-2.5 -14 0 -11.5 0 -9 C0 -11.5 2.5 -14 5.5 -14 C12 -14 15 -2 0 9 Z',
  d: 'M0 -13 L9.5 0 L0 13 L-9.5 0 Z',
  s: 'M0 -13 C12 -3 15 5 7 7 C3.5 7.5 1.5 5.5 0 3.5 C-1.5 5.5 -3.5 7.5 -7 7 C-15 5 -12 -3 0 -13 Z M-4.5 13 L0 3 L4.5 13 Z',
  c: 'M0 -12.5 a5.6 5.6 0 1 1 -0.01 0 Z M-6.5 -2 a5.6 5.6 0 1 1 -0.01 0 Z M6.5 -2 a5.6 5.6 0 1 1 -0.01 0 Z M-4 13 L0 2 L4 13 Z',
};
const suitColor = (s: SuitKey): string => (s === 'h' || s === 'd' ? C.red : C.black);
const suit = (s: SuitKey, x: number, y: number, k = 1): string => `<path d="${SUIT[s]}" transform="translate(${x} ${y}) scale(${k})" fill="${suitColor(s)}"/>`;

function cardBack(x: number, y: number, rot: number, k = 1): string {
  return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${k})">
  <rect x="-23" y="-33" width="46" height="66" rx="6" fill="${C.back}" ${ol(2.5)}/>
  <rect x="-17" y="-27" width="34" height="54" rx="3" fill="none" stroke="${C.backPat}" stroke-width="1.6"/>
  <path d="M0 -21 L11 0 L0 21 L-11 0 Z" fill="none" stroke="${C.backPat}" stroke-width="1.6"/>
  ${suit('h', 0, 0.5, 0.42).replace(C.red, C.backPat)}
  </g>`;
}

// ---------- карты ----------
export const CARD_BOX = { x: -24, y: -34, w: 48, h: 68 } as const;
const RANK_LABEL: Record<number, string> = { 6: '6', 7: '7', 8: '8', 9: '9', 10: '10', 11: 'В', 12: 'Д', 13: 'К', 14: 'Т' };
const SUIT_KEY: Record<string, SuitKey> = { H: 'h', D: 'd', S: 's', C: 'c' };

/**
 * Лицо карты: крупное достоинство и масть в углах, масть в центре; подписи — по-русски (В, Д, К, Т).
 * Угловые индексы и центральная масть не пересекаются: центр занимает |x| ≤ 9,8, углы — |x| ≥ 10,3.
 */
export function cardFaceSvg(suitCode: 'S' | 'C' | 'D' | 'H', rank: number): string {
  const k = SUIT_KEY[suitCode] as SuitKey;
  const col = suitColor(k);
  const label = RANK_LABEL[rank] ?? String(rank);
  const fs = label.length > 1 ? 13 : 15;
  const x = label.length > 1 ? -21 : -20;
  const corner = `<text x="${x}" y="-17" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="${fs}" fill="${col}"${label.length > 1 ? ' letter-spacing="-1"' : ''}>${label}</text>${suit(k, -16, -6, 0.38)}`;
  const inner = `<rect x="-23" y="-33" width="46" height="66" rx="6" fill="${C.card}" ${ol(2.2)}/>
  ${corner}
  <g transform="rotate(180)">${corner}</g>
  ${suit(k, 0, 1, 0.65)}`;
  return svgDoc(CARD_BOX, inner);
}
export const cardBackSvg = (): string => svgDoc(CARD_BOX, cardBack(0, 0, 0));
