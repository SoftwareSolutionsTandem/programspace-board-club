// Движок шахмат (docs/games/chess.md): состояние + действие → новое состояние + доменные события.
// Чистые функции без DOM, звука и таймеров; итог партии (мат, пат, 50 ходов, повторение, материал) — в том же шаге.
import { kindOf, other, parseFen, positionKey, START_FEN, type Color, type Piece, type Square } from './board';
import { epCapturable, inCheck, insufficientMaterial, legalMoves, makeMove, moveEffect, sameMove, type Move } from './movegen';
import type { ChessResult, ChessState } from './state';

export type { Move } from './movegen';

export type ChessAction =
  | { readonly type: 'move'; readonly color: Color; readonly move: Move }
  | { readonly type: 'resign'; readonly color: Color };

export type ChessEvent =
  | {
    readonly type: 'moved';
    readonly color: Color;
    readonly move: Move;
    readonly piece: Piece;
    readonly captured: Piece | null;
    readonly captureSquare: Square | null;
    readonly castle: { readonly rookFrom: Square; readonly rookTo: Square; readonly side: 'king' | 'queen' } | null;
    readonly promotion: Piece | null;
    readonly enPassant: boolean;
    /** Ход объявил шах сопернику. */
    readonly check: boolean;
  }
  | { readonly type: 'gameOver'; readonly result: ChessResult };

export type ChessError = 'gameOver' | 'wrongColor' | 'illegalMove';

export type ApplyResult =
  | { readonly ok: true; readonly state: ChessState; readonly events: readonly ChessEvent[] }
  | { readonly ok: false; readonly error: ChessError };

/** Новая партия (или позиция FEN — для тестов и обучения). */
export function newGame(fen: string = START_FEN): ChessState {
  const p = parseFen(fen);
  const pos = { board: p.board, turn: p.turn, castling: p.castling, ep: p.ep };
  const state: ChessState = { ...pos, halfmove: p.halfmove, fullmove: p.fullmove, history: [positionKey(pos, epCapturable(pos))], phase: 'play', result: null, lastMove: null };
  // Позиция без ходов сразу — итог (бывает только в тестовых позициях).
  const r = resultOf(state);
  return r ? { ...state, phase: 'over', result: r } : state;
}

export const actor = (s: ChessState): Color | null => (s.phase === 'play' ? s.turn : null);

export function legalActions(s: ChessState): ChessAction[] {
  if (s.phase !== 'play') return [];
  return legalMoves(s).map((move) => ({ type: 'move', color: s.turn, move }));
}

/** Итог после хода: мат, пат, недостаток материала, 50 ходов, троекратное повторение (автоматически, §5). */
export function resultOf(s: ChessState): ChessResult | null {
  const moves = legalMoves(s);
  if (moves.length === 0) return inCheck(s, s.turn) ? { kind: 'checkmate', winner: other(s.turn) } : { kind: 'stalemate', winner: null };
  if (insufficientMaterial(s.board)) return { kind: 'material', winner: null };
  if (s.halfmove >= 100) return { kind: 'fifty', winner: null };
  const last = s.history[s.history.length - 1];
  if (last && s.history.filter((k) => k === last).length >= 3) return { kind: 'repetition', winner: null };
  return null;
}

export function apply(s: ChessState, action: ChessAction): ApplyResult {
  if (s.phase !== 'play') return { ok: false, error: 'gameOver' };
  if (action.color !== s.turn && action.type === 'move') return { ok: false, error: 'wrongColor' };
  if (action.type === 'resign') {
    const result: ChessResult = { kind: 'resign', winner: other(action.color) };
    return { ok: true, state: { ...s, phase: 'over', result }, events: [{ type: 'gameOver', result }] };
  }
  const m = action.move;
  const legal = legalMoves(s).find((x) => sameMove(x, m));
  if (!legal) return { ok: false, error: 'illegalMove' };
  const e = moveEffect(s, legal);
  const pos = makeMove(s, legal);
  const irreversible = e.captured !== null || kindOf(e.piece) === 'p';
  const next: ChessState = {
    ...pos,
    halfmove: irreversible ? 0 : s.halfmove + 1,
    fullmove: s.turn === 'b' ? s.fullmove + 1 : s.fullmove,
    history: [...s.history, positionKey(pos, epCapturable(pos))],
    phase: 'play',
    result: null,
    lastMove: { from: legal.from, to: legal.to },
  };
  const events: ChessEvent[] = [{ type: 'moved', color: s.turn, move: legal, piece: e.piece, captured: e.captured, captureSquare: e.captureSquare, castle: e.castle, promotion: e.promotion, enPassant: e.enPassant, check: inCheck(pos, pos.turn) }];
  const result = resultOf(next);
  if (!result) return { ok: true, state: next, events };
  events.push({ type: 'gameOver', result });
  return { ok: true, state: { ...next, phase: 'over', result }, events };
}

/** Материал по ценности фигур (для реакций и обучения). */
export function material(s: Pick<ChessState, 'board'>, c: Color): number {
  const V: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  let sum = 0;
  for (const p of s.board) if (p && (p === p.toUpperCase()) === (c === 'w')) sum += V[kindOf(p)]!;
  return sum;
}
