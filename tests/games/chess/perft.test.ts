// Перфт — число позиций на глубине N: эталонные значения ловят ошибки рокировки, взятия на проходе,
// превращения и связок (https://www.chessprogramming.org/Perft_Results).
import { describe, expect, it } from 'vitest';
import { parseFen, START_FEN, type Position } from '../../../src/games/chess/rules/board';
import { legalMoves, makeMove } from '../../../src/games/chess/rules/movegen';

function perft(p: Position, depth: number): number {
  if (depth === 0) return 1;
  const moves = legalMoves(p);
  if (depth === 1) return moves.length;
  let n = 0;
  for (const m of moves) n += perft(makeMove(p, m), depth - 1);
  return n;
}
const pos = (fen: string): Position => parseFen(fen);

describe('perft: генерация ходов совпадает с эталоном', () => {
  it('начальная позиция: 20, 400, 8902, 197281', () => {
    const p = pos(START_FEN);
    expect([1, 2, 3, 4].map((d) => perft(p, d))).toEqual([20, 400, 8902, 197281]);
  });
  it('Kiwipete (рокировки, связки, взятие на проходе, превращение): 48, 2039, 97862', () => {
    const p = pos('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1');
    expect([1, 2, 3].map((d) => perft(p, d))).toEqual([48, 2039, 97862]);
  });
  it('позиция 3 (взятие на проходе со связкой по горизонтали): 14, 191, 2812, 43238', () => {
    const p = pos('8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1');
    expect([1, 2, 3, 4].map((d) => perft(p, d))).toEqual([14, 191, 2812, 43238]);
  });
  it('позиция 4 (превращения со взятием, рокировка под шахом): 6, 264, 9467', () => {
    const p = pos('r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1');
    expect([1, 2, 3].map((d) => perft(p, d))).toEqual([6, 264, 9467]);
  });
  it('позиция 5: 44, 1486, 62379', () => {
    const p = pos('rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8');
    expect([1, 2, 3].map((d) => perft(p, d))).toEqual([44, 1486, 62379]);
  });
});
