// Состояние шахматной партии (docs/games/chess.md §6): позиция, счётчики, история позиций для повторений, итог.
import type { Color, Position, Square } from './board';

export type ChessResult =
  | { readonly kind: 'checkmate'; readonly winner: Color }
  | { readonly kind: 'resign'; readonly winner: Color }
  | { readonly kind: 'stalemate' | 'fifty' | 'repetition' | 'material'; readonly winner: null };

export interface ChessState extends Position {
  /** Полуходы без взятия и хода пешкой (правило 50 ходов). */
  readonly halfmove: number;
  readonly fullmove: number;
  /** Ключи позиций с начала партии (positionKey) — для троекратного повторения. */
  readonly history: readonly string[];
  readonly phase: 'play' | 'over';
  readonly result: ChessResult | null;
  readonly lastMove: { readonly from: Square; readonly to: Square } | null;
}
