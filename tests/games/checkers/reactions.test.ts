// Реакции Костяна (docs/voice/kostyan-script.md): серия, «почти дамка», «ты серьёзно?», дебют, междометия.
import { describe, expect, it } from 'vitest';
import type { ReactionContext } from '../../../src/board/session';
import { longestCapture, reactionFor } from '../../../src/games/checkers/reactions';
import { boardFrom, parseSquare, startBoard, type Board, type Piece } from '../../../src/games/checkers/rules/board';
import type { CheckersEvent } from '../../../src/games/checkers/rules/engine';
import type { PlayerView } from '../../../src/games/checkers/view';

const view = (board: Board = startBoard()) => ({ color: 'w', board }) as unknown as PlayerView;
const moved = (piece: Piece, path: string[], captured: Piece[] = [], crowned = false): CheckersEvent => ({
  type: 'moved', color: piece.toLowerCase() as 'w' | 'b', move: { path: path.map(parseSquare), captures: [] }, piece,
  captured: captured.map((p, i) => ({ square: i, piece: p })), crowned,
});
const ctx = (e: CheckersEvent, mover: 'human' | 'opponent', o: Partial<ReactionContext<CheckersEvent, PlayerView>> = {}): ReactionContext<CheckersEvent, PlayerView> => ({
  events: [e], mover, before: view(), after: view(), leadBefore: 0, leadAfter: 0, ply: 10, ...o,
});
const cat = (c: ReactionContext<CheckersEvent, PlayerView>) => reactionFor(c)?.category;

describe('реакции Костяна', () => {
  it('три и больше за ход — серия, две — «две за раз»', () => {
    expect(reactionFor(ctx(moved('b', ['h8', 'f6'], ['w', 'w', 'w']), 'opponent'))).toMatchObject({ category: 'streak', gesture: 'fistPump' });
    expect(cat(ctx(moved('b', ['h8', 'f6'], ['w', 'w']), 'opponent'))).toBe('multiCapture');
  });

  it('простая шашка на предпоследней горизонтали — «почти дамка»; у дамки — нет', () => {
    expect(cat(ctx(moved('b', ['a3', 'b2']), 'opponent'))).toBe('nearCrown');
    expect(cat(ctx(moved('B', ['a3', 'b2']), 'opponent'))).toBe('boardMove');
    expect(cat(ctx(moved('w', ['b6', 'c7']), 'human', { before: view(boardFrom('w:b6 b:h8')), after: view(boardFrom('w:c7 b:h8')) }))).toBe('playerNearCrown');
  });

  it('игрок подставил под серию — «ты серьёзно?»', () => {
    const before = boardFrom('w:b6,c3 b:a7');
    const after = boardFrom('w:b6,d4 b:a7');
    expect(longestCapture(before, 'b')).toBe(1);
    expect(longestCapture(after, 'b')).toBe(2);
    expect(reactionFor(ctx(moved('w', ['c3', 'd4']), 'human', { before: view(before), after: view(after) }))).toMatchObject({ category: 'playerBlunder', emotion: 'laugh' });
    // Серия уже была до хода — не «зевок».
    expect(cat(ctx(moved('w', ['c3', 'd4']), 'human', { before: view(after), after: view(after) }))).toBe('playerPlay');
  });

  it('первый ход игрока — дебют', () => {
    expect(cat(ctx(moved('w', ['c3', 'd4']), 'human', { ply: 1 }))).toBe('opening');
    expect(cat(ctx(moved('w', ['c3', 'd4']), 'human', { ply: 4 }))).toBe('playerPlay');
  });

  it('междометия: «ух ты» на взятую дамку, смешок при перевесе, вздох при отставании', () => {
    expect(cat(ctx(moved('w', ['c3', 'e5'], ['B']), 'human'))).toBe('nvAh');
    expect(cat(ctx(moved('w', ['c3', 'e5'], ['b']), 'human'))).toBe('boardLostPiece');
    expect(cat(ctx(moved('b', ['f6', 'e5']), 'opponent', { leadBefore: 3, leadAfter: 3 }))).toBe('nvGiggle');
    expect(cat(ctx(moved('w', ['c3', 'd4']), 'human', { leadBefore: -3, leadAfter: -3 }))).toBe('nvSigh');
  });
});
