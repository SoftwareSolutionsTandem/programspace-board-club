import { describe, expect, it } from 'vitest';
import { parseSquare as S } from '../../../src/games/chess/rules/board';
import { apply, legalActions, newGame, type ChessAction } from '../../../src/games/chess/rules/engine';
import type { ChessState } from '../../../src/games/chess/rules/state';

const mv = (s: ChessState, from: string, to: string, promotion?: 'q' | 'r' | 'b' | 'n'): ChessAction => ({ type: 'move', color: s.turn, move: promotion ? { from: S(from), to: S(to), promotion } : { from: S(from), to: S(to) } });
function go(s: ChessState, ...moves: string[]) {
  let st = s;
  const events = [];
  for (const m of moves) {
    const r = apply(st, mv(st, m.slice(0, 2), m.slice(2, 4), (m[4] as 'q' | undefined) ?? undefined));
    if (!r.ok) throw new Error(`${m}: ${r.error}`);
    st = r.state;
    events.push(...r.events);
  }
  return { s: st, events };
}

describe('шахматы: движок', () => {
  it('начальная позиция: 20 ходов, ходят белые', () => {
    const s = newGame();
    expect(s.turn).toBe('w');
    expect(legalActions(s)).toHaveLength(20);
  });

  it('детский мат', () => {
    const { s, events } = go(newGame(), 'e2e4', 'e7e5', 'f1c4', 'b8c6', 'd1h5', 'g8f6', 'h5f7');
    expect(s.result).toEqual({ kind: 'checkmate', winner: 'w' });
    expect(events.at(-2)).toMatchObject({ type: 'moved', check: true, captured: 'p' });
    expect(events.at(-1)).toEqual({ type: 'gameOver', result: { kind: 'checkmate', winner: 'w' } });
    expect(legalActions(s)).toEqual([]);
  });

  it('пат — ничья', () => {
    const { s } = go(newGame('7k/5Q2/6K1/8/8/8/8/8 w - - 0 1'), 'f7f6');
    expect(s.result?.kind).not.toBe('stalemate');
    const t = go(newGame('7k/8/6K1/8/8/8/8/5Q2 w - - 0 1'), 'f1f7').s;
    expect(t.result).toEqual({ kind: 'stalemate', winner: null });
  });

  it('рокировка: событие с ходом ладьи; через битое поле нельзя', () => {
    const { s, events } = go(newGame('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1'), 'e1g1');
    expect(events[0]).toMatchObject({ castle: { rookFrom: S('h1'), rookTo: S('f1'), side: 'king' } });
    expect(s.board[S('g1')]).toBe('K');
    expect(s.board[S('f1')]).toBe('R');
    expect(s.castling).toMatchObject({ wK: false, wQ: false, bK: true, bQ: true });
    const blocked = newGame('r3k2r/8/8/8/8/8/5r2/R3K2R w KQkq - 0 1');
    expect(legalActions(blocked).some((a) => a.type === 'move' && a.move.from === S('e1') && a.move.to === S('g1'))).toBe(false);
  });

  it('взятие на проходе', () => {
    const { s, events } = go(newGame(), 'e2e4', 'a7a6', 'e4e5', 'd7d5', 'e5d6');
    expect(events.at(-1)).toMatchObject({ enPassant: true, captured: 'p', captureSquare: S('d5') });
    expect(s.board[S('d5')]).toBeNull();
  });

  it('превращение — выбор фигуры', () => {
    const s = newGame('8/P6k/8/8/8/8/8/K7 w - - 0 1');
    const promos = legalActions(s).filter((a) => a.type === 'move' && a.move.from === S('a7'));
    expect(promos.map((a) => (a.type === 'move' ? a.move.promotion : '')).sort()).toEqual(['b', 'n', 'q', 'r']);
    const { s: t, events } = go(s, 'a7a8n');
    expect(t.board[S('a8')]).toBe('N');
    expect(events[0]).toMatchObject({ promotion: 'N' });
    expect(apply(s, mv(s, 'a7', 'a8')).ok).toBe(false);
  });

  it('недостаточно материала — ничья', () => {
    const { s } = go(newGame('8/8/8/3k4/8/8/2Kp4/8 w - - 0 1'), 'c2d2');
    expect(s.result).toEqual({ kind: 'material', winner: null });
  });

  it('правило 50 ходов', () => {
    const { s } = go(newGame('8/8/8/3k4/8/8/2KR4/8 w - - 99 80'), 'd2d1');
    expect(s.result).toEqual({ kind: 'fifty', winner: null });
  });

  it('троекратное повторение', () => {
    const { s } = go(newGame(), 'g1f3', 'g8f6', 'f3g1', 'f6g8', 'g1f3', 'g8f6', 'f3g1', 'f6g8');
    expect(s.result).toEqual({ kind: 'repetition', winner: null });
  });

  it('отказы: чужой ход, нелегальный ход, сдача', () => {
    const s = newGame();
    expect(apply(s, { type: 'move', color: 'b', move: { from: S('e7'), to: S('e5') } })).toEqual({ ok: false, error: 'wrongColor' });
    expect(apply(s, mv(s, 'e2', 'e5'))).toEqual({ ok: false, error: 'illegalMove' });
    const r = apply(s, { type: 'resign', color: 'w' });
    expect(r.ok && r.state.result).toEqual({ kind: 'resign', winner: 'b' });
    if (r.ok) expect(apply(r.state, mv(r.state, 'e2', 'e4'))).toEqual({ ok: false, error: 'gameOver' });
  });

  it('связанная фигура не ходит, под шахом — только защита', () => {
    const s = newGame('4k3/4r3/8/8/8/8/4N3/4K3 w - - 0 1');
    expect(legalActions(s).some((a) => a.type === 'move' && a.move.from === S('e2'))).toBe(false);
  });
});
