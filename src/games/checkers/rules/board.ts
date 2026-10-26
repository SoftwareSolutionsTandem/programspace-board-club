// Доска русских шашек (docs/games/checkers.md §1): клетки 0…63 как в шахматах (a1 = 0, h8 = 63), играют только
// тёмные поля ((вертикаль + горизонталь) чётна — a1 тёмное). Шашки: w/b — простые, W/B — дамки.

export type Color = 'w' | 'b';
export type Piece = 'w' | 'b' | 'W' | 'B';
export type Board = readonly (Piece | null)[];
export type Square = number;

export const other = (c: Color): Color => (c === 'w' ? 'b' : 'w');
export const colorOf = (p: Piece): Color => (p.toLowerCase() as Color);
export const isKing = (p: Piece): boolean => p === 'W' || p === 'B';
export const crown = (p: Piece): Piece => (p.toUpperCase() as Piece);

export const fileOf = (s: Square): number => s & 7;
export const rankOf = (s: Square): number => s >> 3;
export const sq = (file: number, rank: number): Square => rank * 8 + file;
export const onBoard = (file: number, rank: number): boolean => file >= 0 && file < 8 && rank >= 0 && rank < 8;
export const isDark = (s: Square): boolean => (fileOf(s) + rankOf(s)) % 2 === 0;
export const squareName = (s: Square): string => 'abcdefgh'[fileOf(s)]! + String(rankOf(s) + 1);
export function parseSquare(name: string): Square {
  const f = 'abcdefgh'.indexOf(name[0] ?? '');
  const r = Number(name[1]) - 1;
  if (f < 0 || !(r >= 0 && r < 8) || name.length !== 2) throw new Error(`не клетка: ${name}`);
  return sq(f, r);
}
/** Горизонталь превращения в дамку. */
export const crownRank = (c: Color): number => (c === 'w' ? 7 : 0);

/** Начальная расстановка: по 12 шашек на тёмных полях трёх ближних горизонталей. */
export function startBoard(): Board {
  const b: (Piece | null)[] = new Array(64).fill(null);
  for (let s = 0; s < 64; s++) {
    if (!isDark(s)) continue;
    if (rankOf(s) <= 2) b[s] = 'w';
    else if (rankOf(s) >= 5) b[s] = 'b';
  }
  return b;
}

/** Расстановка по списку «w:c3,e3,Wh8 b:d6» — для тестов и обучения. */
export function boardFrom(spec: string): Board {
  const b: (Piece | null)[] = new Array(64).fill(null);
  for (const part of spec.trim().split(/\s+/)) {
    const [side, list] = part.split(':');
    if ((side !== 'w' && side !== 'b') || list === undefined) throw new Error(`расстановка: ${part}`);
    for (const item of list.split(',').filter(Boolean)) {
      const king = item[0] === 'K';
      const s = parseSquare(king ? item.slice(1) : item);
      if (!isDark(s)) throw new Error(`шашка на светлом поле: ${item}`);
      b[s] = (king ? side.toUpperCase() : side) as Piece;
    }
  }
  return b;
}

export const boardKey = (b: Board, turn: Color): string => b.map((p) => p ?? '.').join('') + turn;
