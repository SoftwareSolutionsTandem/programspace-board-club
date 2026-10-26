// Движок русских шашек (docs/games/checkers.md): состояние + действие → новое состояние + доменные события.
// Чистые функции без DOM, звука и таймеров; итог партии — в том же шаге.
import { boardKey, colorOf, isKing, other, startBoard, type Board, type Color, type Piece, type Square } from './board';
import { count, legalMoves, makeMove, sameMove, type Move } from './movegen';
import type { CheckersResult, CheckersState } from './state';

export type { Move } from './movegen';

/** Ничья: столько полуходов подряд только дамками без взятий (по 15 ходов каждой стороны, §5). */
export const KING_PLIES_DRAW = 30;

export type CheckersAction =
  | { readonly type: 'move'; readonly color: Color; readonly move: Move }
  | { readonly type: 'resign'; readonly color: Color };

export type CheckersEvent =
  | {
    readonly type: 'moved';
    readonly color: Color;
    readonly move: Move;
    readonly piece: Piece;
    /** Сбитые шашки по порядку взятия. */
    readonly captured: readonly { readonly square: Square; readonly piece: Piece }[];
    readonly crowned: boolean;
  }
  | { readonly type: 'gameOver'; readonly result: CheckersResult };

export type CheckersError = 'gameOver' | 'wrongColor' | 'illegalMove';

export type ApplyResult =
  | { readonly ok: true; readonly state: CheckersState; readonly events: readonly CheckersEvent[] }
  | { readonly ok: false; readonly error: CheckersError };

export function newGame(board: Board = startBoard(), turn: Color = 'w'): CheckersState {
  const s: CheckersState = { board, turn, kingPlies: 0, history: [boardKey(board, turn)], phase: 'play', result: null, lastMove: null, moveNo: 1 };
  const r = resultOf(s);
  return r ? { ...s, phase: 'over', result: r } : s;
}

export const actor = (s: CheckersState): Color | null => (s.phase === 'play' ? s.turn : null);

export function legalActions(s: CheckersState): CheckersAction[] {
  if (s.phase !== 'play') return [];
  return legalMoves(s.board, s.turn).map((move) => ({ type: 'move', color: s.turn, move }));
}

export function resultOf(s: CheckersState): CheckersResult | null {
  if (legalMoves(s.board, s.turn).length === 0) return { kind: 'noMoves', winner: other(s.turn) };
  if (s.kingPlies >= KING_PLIES_DRAW) return { kind: 'kingMoves', winner: null };
  const last = s.history[s.history.length - 1];
  if (last && s.history.filter((k) => k === last).length >= 3) return { kind: 'repetition', winner: null };
  return null;
}

export function apply(s: CheckersState, action: CheckersAction): ApplyResult {
  if (s.phase !== 'play') return { ok: false, error: 'gameOver' };
  if (action.type === 'resign') {
    const result: CheckersResult = { kind: 'resign', winner: other(action.color) };
    return { ok: true, state: { ...s, phase: 'over', result }, events: [{ type: 'gameOver', result }] };
  }
  if (action.color !== s.turn) return { ok: false, error: 'wrongColor' };
  const legal = legalMoves(s.board, s.turn).find((m) => sameMove(m, action.move));
  if (!legal) return { ok: false, error: 'illegalMove' };
  const piece = s.board[legal.path[0]!]!;
  const { board, crowned } = makeMove(s.board, legal);
  const turn = other(s.turn);
  const kingOnly = isKing(piece) && legal.captures.length === 0;
  const next: CheckersState = {
    board,
    turn,
    kingPlies: kingOnly ? s.kingPlies + 1 : 0,
    // После взятия или хода простой прежние позиции повториться уже не могут.
    history: kingOnly ? [...s.history, boardKey(board, turn)] : [boardKey(board, turn)],
    phase: 'play',
    result: null,
    lastMove: { path: legal.path },
    moveNo: s.turn === 'b' ? s.moveNo + 1 : s.moveNo,
  };
  const events: CheckersEvent[] = [{ type: 'moved', color: s.turn, move: legal, piece, captured: legal.captures.map((c) => ({ square: c, piece: s.board[c]! })), crowned }];
  const result = resultOf(next);
  if (!result) return { ok: true, state: next, events };
  events.push({ type: 'gameOver', result });
  return { ok: true, state: { ...next, phase: 'over', result }, events };
}

export const pieceCount = (s: Pick<CheckersState, 'board'>, c: Color) => count(s.board, c);
export { colorOf };
