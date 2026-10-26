// Проекция партии для одного игрока (docs/games/checkers.md §6). Шашки — игра с полной информацией:
// проекция открыта целиком, но и интерфейс, и ИИ работают только с ней, а не с состоянием движка.
import type { Board, Color, Square } from './rules/board';
import type { CheckersAction } from './rules/engine';
import { legalMoves, type Move } from './rules/movegen';
import type { CheckersResult, CheckersState } from './rules/state';

export interface PlayerView {
  readonly color: Color;
  readonly board: Board;
  readonly turn: Color;
  readonly kingPlies: number;
  /** Ключи позиций с последнего необратимого хода — для повторений. */
  readonly history: readonly string[];
  readonly phase: CheckersState['phase'];
  readonly result: CheckersResult | null;
  readonly lastMove: { readonly path: readonly Square[] } | null;
  readonly moveNo: number;
}

export function projectView(s: CheckersState, color: Color): PlayerView {
  return {
    color,
    board: s.board.slice(),
    turn: s.turn,
    kingPlies: s.kingPlies,
    history: [...s.history],
    phase: s.phase,
    result: s.result,
    lastMove: s.lastMove ? { path: [...s.lastMove.path] } : null,
    moveNo: s.moveNo,
  };
}

export type { CheckersAction, Move };

/** Допустимые ходы по проекции (совпадают с legalActions движка для своего хода). */
export function legalActionsForView(v: PlayerView): CheckersAction[] {
  if (v.phase !== 'play' || v.turn !== v.color) return [];
  return legalMoves(v.board, v.turn).map((move) => ({ type: 'move', color: v.color, move }));
}
