// Состояние партии в русские шашки (docs/games/checkers.md §5).
import type { Board, Color, Square } from './board';

export type CheckersResult =
  /** Сторона без ходов (все шашки сбиты или заперты) проиграла. */
  | { readonly kind: 'noMoves'; readonly winner: Color }
  | { readonly kind: 'resign'; readonly winner: Color }
  | { readonly kind: 'repetition' | 'kingMoves'; readonly winner: null };

export interface CheckersState {
  readonly board: Board;
  readonly turn: Color;
  /** Полуходы подряд только дамками и без взятий (ничья на 30 — по 15 ходов каждой стороны). */
  readonly kingPlies: number;
  /** Ключи позиций (boardKey) — для троекратного повторения. */
  readonly history: readonly string[];
  readonly phase: 'play' | 'over';
  readonly result: CheckersResult | null;
  readonly lastMove: { readonly path: readonly Square[] } | null;
  /** Номер хода (растёт после хода чёрных). */
  readonly moveNo: number;
}
