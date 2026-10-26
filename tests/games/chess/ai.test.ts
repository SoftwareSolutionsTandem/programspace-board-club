import { describe, expect, it } from 'vitest';
import { createRng } from '../../../src/core/rng';
import { decide, KHARITON, NEUTRAL, type AiLevel } from '../../../src/games/chess/ai';
import { buffers, FastBoard } from '../../../src/games/chess/ai/fastboard';
import { parseFen, parseSquare as S, START_FEN } from '../../../src/games/chess/rules/board';
import { apply, legalActions, newGame } from '../../../src/games/chess/rules/engine';
import { projectView } from '../../../src/games/chess/view';

const bufs = buffers();
function perft(b: FastBoard, depth: number, ply = 0): number {
  if (depth === 0) return 1;
  const ms = bufs[ply]!;
  const n = b.gen(ms, false);
  let total = 0;
  for (let i = 0; i < n; i++) {
    if (!b.make(ms[i]!)) continue;
    total += perft(b, depth - 1, ply + 1);
    b.unmake();
  }
  return total;
}
const fast = (fen: string) => {
  const p = parseFen(fen);
  return FastBoard.from({ ...p });
};

describe('быстрая доска ИИ совпадает с правилами (perft)', () => {
  it.each([
    [START_FEN, [20, 400, 8902, 197281]],
    ['r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', [48, 2039, 97862]],
    ['8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', [14, 191, 2812, 43238]],
    ['r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', [6, 264, 9467]],
    ['rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', [44, 1486, 62379]],
  ] as const)('%s', (fen, want) => {
    const b = fast(fen);
    const hash = b.hash;
    expect(want.map((_, i) => perft(b, i + 1))).toEqual([...want]);
    // Ход/откат возвращают доску и хеш точно.
    expect(b.hash).toBe(hash);
    expect(b.computeHash()).toBe(hash);
  });
});

const play = (fen: string, level: AiLevel, seed = 1) => {
  const s = newGame(fen);
  return decide(projectView(s, s.turn), level, KHARITON, createRng(seed)).action;
};

describe('ИИ шахмат', () => {
  it('ставит мат в один ход (средний и сильный)', () => {
    // Линейный мат ладьёй: Ra8#.
    const fen = '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1';
    for (const lvl of ['normal', 'hard'] as const) {
      for (let seed = 1; seed <= 5; seed++) expect(play(fen, lvl, seed)).toMatchObject({ type: 'move', move: { from: S('a1'), to: S('a8') } });
    }
  });

  it('сильный уровень забирает висящего ферзя', () => {
    const s = newGame('rnb1kbnr/pppp1ppp/8/4p3/4P2q/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3');
    expect(decide(projectView(s, 'w'), 'hard', NEUTRAL, createRng(3)).action).toMatchObject({ move: { from: S('f3'), to: S('h4') } });
  });

  it('средний и сильный уровни защищаются от мата по последней горизонтали', () => {
    // Чёрные грозят Ra1#; белым надо дать королю форточку или закрыться.
    const s = newGame('r5k1/5ppp/8/8/8/8/5PPP/6K1 w - - 0 1');
    for (const lvl of ['normal', 'hard'] as const) {
      for (let seed = 1; seed <= 4; seed++) {
        const r = apply(s, decide(projectView(s, 'w'), lvl, NEUTRAL, createRng(seed)).action);
        if (!r.ok) throw new Error(r.error);
        const mateNext = legalActions(r.state).some((a) => {
          const x = apply(r.state, a);
          return x.ok && x.state.result?.kind === 'checkmate';
        });
        expect(mateNext).toBe(false);
      }
    }
  });

  it('детерминирован: одна проекция и одно зерно — один ход', () => {
    const s = newGame('r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3');
    for (const lvl of ['easy', 'normal', 'hard'] as const) {
      const a = decide(projectView(s, 'w'), lvl, KHARITON, createRng(9));
      const b = decide(projectView(s, 'w'), lvl, KHARITON, createRng(9));
      expect(a).toEqual(b);
    }
  });

  it('партии ИИ против ИИ идут только легальными ходами и заканчиваются', () => {
    for (const [w, b] of [['easy', 'easy'], ['easy', 'normal']] as const) {
      let s = newGame();
      let rng = createRng(5);
      for (let ply = 0; ply < 400 && s.phase === 'play'; ply++) {
        const d = decide(projectView(s, s.turn), s.turn === 'w' ? w : b, KHARITON, rng);
        rng = d.rng;
        const r = apply(s, d.action);
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        s = r.state;
      }
      expect(s.history.length).toBeGreaterThan(10);
    }
  }, 60000);

  it('средний уровень сильнее лёгкого', () => {
    let score = 0;
    for (let g = 0; g < 4; g++) {
      let s = newGame();
      let rng = createRng(100 + g);
      const strong = g % 2 ? 'b' : 'w';
      for (let ply = 0; ply < 160 && s.phase === 'play'; ply++) {
        const d = decide(projectView(s, s.turn), s.turn === strong ? 'normal' : 'easy', NEUTRAL, rng);
        rng = d.rng;
        const r = apply(s, d.action);
        if (!r.ok) throw new Error(r.error);
        s = r.state;
      }
      // Незаконченные партии судим по материалу.
      const res = s.result;
      if (res && res.winner) score += res.winner === strong ? 1 : -1;
      else if (!res) {
        let m = 0;
        for (const p of s.board) if (p) m += (p === p.toUpperCase() ? 1 : -1) * ({ p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 } as Record<string, number>)[p.toLowerCase()]!;
        score += Math.sign(strong === 'w' ? m : -m);
      }
    }
    expect(score).toBeGreaterThan(0);
  }, 120000);
});
