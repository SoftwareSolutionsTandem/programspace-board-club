import { describe, expect, it } from 'vitest';
import { createRng } from '../../../src/core/rng';
import { decide, KOSTYAN, NEUTRAL, type AiLevel } from '../../../src/games/checkers/ai';
import { boardFrom, parseSquare as S } from '../../../src/games/checkers/rules/board';
import { apply, legalActions, newGame } from '../../../src/games/checkers/rules/engine';
import { legalActionsForView, projectView } from '../../../src/games/checkers/view';

describe('шашки: проекция', () => {
  it('ходы по проекции совпадают с движком; ссылок на состояние нет', () => {
    let s = newGame();
    let rng = createRng(3);
    for (let i = 0; i < 30 && s.phase === 'play'; i++) {
      const v = projectView(s, s.turn);
      expect(legalActionsForView(v)).toEqual(legalActions(s));
      expect(v.board).not.toBe(s.board);
      expect(legalActionsForView(projectView(s, s.turn === 'w' ? 'b' : 'w'))).toEqual([]);
      const d = decide(v, 'easy', NEUTRAL, rng);
      rng = d.rng;
      const r = apply(s, d.action);
      if (!r.ok) throw new Error(r.error);
      s = r.state;
    }
  });
});

describe('ИИ шашек', () => {
  it('выбирает взятие с бо́льшим выигрышем (сильный)', () => {
    // Можно бить одну (c3:a5) или две (c3:e5:g7).
    const s = newGame(boardFrom('w:c3,a1 b:b4,d4,f6,b8'), 'w');
    const a = decide(projectView(s, 'w'), 'hard', NEUTRAL, createRng(1)).action;
    expect(a.type === 'move' && a.move.captures.length).toBe(2);
  });

  it('видит размен: не берёт одну, если за неё теряет две (сильный)', () => {
    // c3:e5:g7 бьёт две, но h8 тут же отбивает g7 (итог +1 и шашка под ударом), c3:a5 бьёт одну без ответа.
    const s = newGame(boardFrom('w:c3,a1 b:b4,d4,f6,h8'), 'w');
    const a = decide(projectView(s, 'w'), 'hard', NEUTRAL, createRng(1)).action;
    expect(a.type === 'move' && a.move.path.at(-1)).toBe(S('a5'));
  });

  it('детерминирован', () => {
    const s = newGame();
    for (const lvl of ['easy', 'normal', 'hard'] as AiLevel[]) {
      expect(decide(projectView(s, 'w'), lvl, KOSTYAN, createRng(4))).toEqual(decide(projectView(s, 'w'), lvl, KOSTYAN, createRng(4)));
    }
  });

  it('добивает: дамка против простой', () => {
    let s = newGame(boardFrom('w:Kc1,Ka1 b:h4'), 'w');
    let rng = createRng(1);
    for (let i = 0; i < 40 && s.phase === 'play'; i++) {
      const d = decide(projectView(s, s.turn), 'hard', NEUTRAL, rng);
      rng = d.rng;
      const r = apply(s, d.action);
      if (!r.ok) throw new Error(r.error);
      s = r.state;
    }
    expect(s.result).toEqual({ kind: 'noMoves', winner: 'w' });
  });

  it('сильный уровень обыгрывает лёгкий', () => {
    let score = 0;
    for (let g = 0; g < 4; g++) {
      let s = newGame();
      let rng = createRng(50 + g);
      const strong = g % 2 ? 'b' : 'w';
      for (let ply = 0; ply < 200 && s.phase === 'play'; ply++) {
        const d = decide(projectView(s, s.turn), s.turn === strong ? 'hard' : 'easy', NEUTRAL, rng);
        rng = d.rng;
        const r = apply(s, d.action);
        if (!r.ok) throw new Error(r.error);
        s = r.state;
      }
      if (s.result?.winner) score += s.result.winner === strong ? 1 : -1;
    }
    expect(score).toBeGreaterThanOrEqual(3);
  }, 120000);
});
