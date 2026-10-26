// Проекция партии для одного игрока (docs/games/chess.md §6). Шахматы — игра с полной информацией:
// проекция открыта целиком, но и интерфейс, и ИИ работают только с ней, а не с состоянием движка.
import type { Board, CastlingRights, Color, Square } from './rules/board';
import type { ChessAction } from './rules/engine';
import { inCheck, legalMoves, type Move } from './rules/movegen';
import type { ChessResult, ChessState } from './rules/state';

export interface PlayerView {
  readonly color: Color;
  readonly board: Board;
  readonly turn: Color;
  readonly castling: CastlingRights;
  readonly ep: Square | null;
  readonly halfmove: number;
  readonly fullmove: number;
  /** Ключи прошлых позиций — чтобы ИИ видел угрозу повторения. */
  readonly history: readonly string[];
  readonly phase: ChessState['phase'];
  readonly result: ChessResult | null;
  readonly lastMove: { readonly from: Square; readonly to: Square } | null;
  /** Король стороны, чей ход, под шахом. */
  readonly check: boolean;
}

export function projectView(s: ChessState, color: Color): PlayerView {
  return {
    color,
    board: s.board.slice(),
    turn: s.turn,
    castling: { ...s.castling },
    ep: s.ep,
    halfmove: s.halfmove,
    fullmove: s.fullmove,
    history: [...s.history],
    phase: s.phase,
    result: s.result,
    lastMove: s.lastMove ? { ...s.lastMove } : null,
    check: inCheck(s, s.turn),
  };
}

export type { ChessAction, Move };

/** Допустимые ходы по проекции (совпадают с legalActions движка для своего хода). */
export function legalActionsForView(v: PlayerView): ChessAction[] {
  if (v.phase !== 'play' || v.turn !== v.color) return [];
  return legalMoves(v).map((move) => ({ type: 'move', color: v.color, move }));
}
