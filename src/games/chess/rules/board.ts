// Шахматная доска (docs/games/chess.md §1): клетки 0…63 (a1 = 0, b1 = 1, …, h8 = 63), фигуры — буквы FEN
// (заглавные — белые, строчные — чёрные). Чистые функции без DOM.

export type Color = 'w' | 'b';
export type Kind = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
/** Фигура в записи FEN: P N B R Q K — белые, p n b r q k — чёрные. */
export type Piece = 'P' | 'N' | 'B' | 'R' | 'Q' | 'K' | 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type Board = readonly (Piece | null)[];
export type Square = number;

export const other = (c: Color): Color => (c === 'w' ? 'b' : 'w');
export const colorOf = (p: Piece): Color => (p === p.toUpperCase() ? 'w' : 'b');
export const kindOf = (p: Piece): Kind => p.toLowerCase() as Kind;
export const pieceOf = (c: Color, k: Kind): Piece => (c === 'w' ? k.toUpperCase() : k) as Piece;

export const fileOf = (s: Square): number => s & 7;
export const rankOf = (s: Square): number => s >> 3;
export const sq = (file: number, rank: number): Square => rank * 8 + file;
export const onBoard = (file: number, rank: number): boolean => file >= 0 && file < 8 && rank >= 0 && rank < 8;

/** «e4» ↔ 28. */
export const squareName = (s: Square): string => 'abcdefgh'[fileOf(s)]! + String(rankOf(s) + 1);
export function parseSquare(name: string): Square {
  const f = 'abcdefgh'.indexOf(name[0] ?? '');
  const r = Number(name[1]) - 1;
  if (f < 0 || !(r >= 0 && r < 8) || name.length !== 2) throw new Error(`не клетка: ${name}`);
  return sq(f, r);
}

export interface CastlingRights {
  readonly wK: boolean;
  readonly wQ: boolean;
  readonly bK: boolean;
  readonly bQ: boolean;
}

/** Позиция FEN без счётчиков: фигуры, очередь, рокировки, взятие на проходе. */
export interface Position {
  readonly board: Board;
  readonly turn: Color;
  readonly castling: CastlingRights;
  /** Клетка, через которую только что прошла пешка двойным ходом (её можно взять на проходе), или null. */
  readonly ep: Square | null;
}

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export function parseFen(fen: string): Position & { halfmove: number; fullmove: number } {
  const [placement, turn, castle, ep, half, full] = fen.trim().split(/\s+/);
  const board: (Piece | null)[] = new Array(64).fill(null);
  const rows = (placement ?? '').split('/');
  if (rows.length !== 8) throw new Error(`FEN: нужно 8 рядов: ${fen}`);
  rows.forEach((row, i) => {
    const rank = 7 - i;
    let file = 0;
    for (const ch of row) {
      if (/[1-8]/.test(ch)) file += Number(ch);
      else if (/[pnbrqkPNBRQK]/.test(ch)) board[sq(file++, rank)] = ch as Piece;
      else throw new Error(`FEN: неизвестный знак ${ch}`);
    }
    if (file !== 8) throw new Error(`FEN: ряд ${row} не из 8 клеток`);
  });
  return {
    board,
    turn: turn === 'b' ? 'b' : 'w',
    castling: { wK: !!castle?.includes('K'), wQ: !!castle?.includes('Q'), bK: !!castle?.includes('k'), bQ: !!castle?.includes('q') },
    ep: ep && ep !== '-' ? parseSquare(ep) : null,
    halfmove: Number(half ?? 0) || 0,
    fullmove: Number(full ?? 1) || 1,
  };
}

/** Ключ позиции для повторений: фигуры, очередь, права рокировки и взятие на проходе (FIDE 9.2). */
export function positionKey(p: Position, epCapturable: boolean): string {
  let s = '';
  for (let r = 7; r >= 0; r--) {
    let empty = 0;
    for (let f = 0; f < 8; f++) {
      const x = p.board[sq(f, r)];
      if (!x) empty++;
      else {
        if (empty) s += empty;
        empty = 0;
        s += x;
      }
    }
    if (empty) s += empty;
    if (r) s += '/';
  }
  const c = p.castling;
  const cs = `${c.wK ? 'K' : ''}${c.wQ ? 'Q' : ''}${c.bK ? 'k' : ''}${c.bQ ? 'q' : ''}` || '-';
  // Взятие на проходе меняет позицию, только если оно действительно возможно.
  return `${s} ${p.turn} ${cs} ${epCapturable && p.ep !== null ? squareName(p.ep) : '-'}`;
}

export const PIECE_VALUE: Readonly<Record<Kind, number>> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
