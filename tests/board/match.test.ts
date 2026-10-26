import { describe, expect, it } from 'vitest';
import type { BoardMatch, Side } from '../../src/board/match';
import { createChessMatch } from '../../src/games/chess/match';
import { createCheckersMatch } from '../../src/games/checkers/match';

describe('контроллер партии на доске', () => {
  it('шахматы: ход игрока, ответ ИИ, сдача, реванш со сменой цвета', () => scenario(createChessMatch({ seed: 1, level: 'easy' })));
  it('шашки: ход игрока, ответ ИИ, сдача, реванш со сменой цвета', () => scenario(createCheckersMatch({ seed: 1, level: 'easy' })));
});

function scenario<S, A extends { readonly type: string; readonly color: Side }, E, V, Err, L>(m: BoardMatch<S, A, E, V, Err, L>) {
  expect(m.human).toBe('w');
  expect(m.turn()).toBe('w');
  expect(m.opponentStep()).toBeNull();
  const a = m.humanActions()[0]!;
  expect(m.act(a).ok).toBe(true);
  expect(m.humanActions()).toEqual([]);
  expect(m.act(a)).toMatchObject({ ok: false });
  expect(m.opponentStep()?.ok).toBe(true);
  expect(m.turn()).toBe('w');
  expect(m.resign()?.ok).toBe(true);
  expect(m.over).toBe(true);
  expect(m.winner).toBe('b');
  expect(m.tallies).toEqual([0, 1, 0]);
  m.newMatch();
  expect(m.human).toBe('b');
  expect(m.turn()).toBe('w');
  expect(m.humanActions()).toEqual([]);
  expect(m.opponentStep()?.ok).toBe(true);
  expect(m.humanActions().length).toBeGreaterThan(0);
}
