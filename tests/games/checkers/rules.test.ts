import { describe, expect, it } from 'vitest';
import { boardFrom, parseSquare as P, squareName, startBoard, type Color } from '../../../src/games/checkers/rules/board';
import { legalMoves, makeMove, type Move } from '../../../src/games/checkers/rules/movegen';
import { apply, KING_PLIES_DRAW, legalActions, newGame, pieceCount } from '../../../src/games/checkers/rules/engine';
import type { CheckersState } from '../../../src/games/checkers/rules/state';
import { createRng, nextInt, type RngState } from '../../../src/core/rng';

function picker(seed: number) {
  let r: RngState = createRng(seed);
  return (n: number) => {
    const [i, next] = nextInt(r, n);
    r = next;
    return i;
  };
}

const names = (ms: Move[]) => ms.map((m) => m.path.map(squareName).join(m.captures.length ? ':' : '-')).sort();
const moves = (spec: string, turn: Color = 'w') => names(legalMoves(boardFrom(spec), turn));

describe('русские шашки: ходы', () => {
  it('начальная позиция: 12 на 12, у белых 7 ходов', () => {
    const b = startBoard();
    expect(pieceCount({ board: b }, 'w')).toEqual({ men: 12, kings: 0 });
    expect(pieceCount({ board: b }, 'b')).toEqual({ men: 12, kings: 0 });
    expect(names(legalMoves(b, 'w'))).toEqual(['a3-b4', 'c3-b4', 'c3-d4', 'e3-d4', 'e3-f4', 'g3-f4', 'g3-h4']);
    expect(legalMoves(b, 'b')).toHaveLength(7);
  });

  it('простая ходит только вперёд', () => {
    expect(moves('w:d4 b:h8')).toEqual(['d4-c5', 'd4-e5']);
    expect(moves('w:a1 b:d4', 'b')).toEqual(['d4-c3', 'd4-e3']);
  });

  it('взятие обязательно', () => {
    expect(moves('w:c3,h2 b:d4')).toEqual(['c3:e5']);
  });

  it('простая бьёт назад', () => {
    expect(moves('w:e5 b:d4,h8')).toEqual(['e5:c3']);
  });

  it('многоходовое взятие идёт до конца', () => {
    expect(moves('w:a1 b:b2,d4,f6')).toEqual(['a1:c3:e5:g7']);
  });

  it('можно выбрать любую ветку взятия, не обязательно самую длинную', () => {
    // c3 бьёт либо b4 (одна шашка), либо d4→f6 (две).
    const ms = legalMoves(boardFrom('w:c3 b:b4,d4,f6,h8'), 'w');
    expect(names(ms)).toEqual(['c3:a5', 'c3:e5:g7']);
  });

  it('превращение посреди взятия: дальше бьёт уже дамкой', () => {
    // b6 бьёт c7 → d8 (дамка), дальше дамкой издалека бьёт f6 и встаёт на g5 или h4. Простая f6 не достала бы.
    const ms = legalMoves(boardFrom('w:b6 b:c7,f6'), 'w');
    expect(names(ms)).toEqual(['b6:d8:g5', 'b6:d8:h4']);
    const { board, crowned } = makeMove(boardFrom('w:b6 b:c7,f6'), ms[0]!);
    expect(crowned).toBe(true);
    expect(board.filter(Boolean)).toEqual(['W']);
  });

  it('простая, ставшая дамкой и без продолжения, — дамка', () => {
    const b = boardFrom('w:b6 b:c7');
    const [m] = legalMoves(b, 'w');
    expect(m && squareName(m.path[1]!)).toBe('d8');
    expect(makeMove(b, m!).board[P('d8')]).toBe('W');
  });

  it('дальнобойная дамка: тихие ходы на любое поле', () => {
    expect(moves('w:Ka1 b:h8')).toHaveLength(6);
  });

  it('дамка бьёт издалека и встаёт на любое поле за шашкой', () => {
    expect(moves('w:Ka1 b:d4,a7')).toEqual(['a1:e5', 'a1:f6', 'a1:g7', 'a1:h8']);
  });

  it('дамка обязана выбрать поле, с которого бой продолжается', () => {
    // После d4 бой продолжается только с f6 (по g7? нет) — ставим e7: с f6 бьётся e7→d8.
    expect(moves('w:Ka1 b:d4,e7')).toEqual(['a1:f6:d8']);
  });

  it('турецкий удар: сбитая шашка остаётся до конца хода и мешает', () => {
    // Дамка бьёт c3 и d6... классический случай: сбитые нельзя бить повторно и через них нельзя прыгать.
    const ms = legalMoves(boardFrom('w:Ke1 b:d2,b4,d6,f4'), 'w');
    for (const m of ms) expect(new Set(m.captures).size).toBe(m.captures.length);
    // Ни один путь не проходит через уже сбитую шашку второй раз — проверка на конкретной позиции:
    // e1:c3 (по d2), c3:a5 (по b4) — дальше бить нечего; или c3→e5 по d4 — нет шашки.
    expect(names(ms).every((n) => n.startsWith('e1:'))).toBe(true);
  });

  it('взятие по кругу: исходное поле свободно, сбитую дважды не бьют', () => {
    expect(moves('w:c3 b:d4,f4,f2,d2')).toEqual(['c3:e1:g3:e5:c3', 'c3:e5:g3:e1:c3']);
  });

  it('сбитые снимаются после хода и загораживают путь', () => {
    // Дамка h2 бьёт g3, встаёт на f4 (e5 мешает идти дальше) и обязана бить e5.
    expect(moves('w:Kh2 b:g3,e5')).toEqual(['h2:f4:b8', 'h2:f4:c7', 'h2:f4:d6']);
  });
});

describe('русские шашки: итоги партии', () => {
  it('нет ходов — поражение', () => {
    const s = newGame(boardFrom('w:a1 b:b2,c3'), 'w');
    expect(s.phase).toBe('over');
    expect(s.result).toEqual({ kind: 'noMoves', winner: 'b' });
  });

  it('последнюю шашку сбили — поражение', () => {
    let s = newGame(boardFrom('w:c3 b:d4'), 'w');
    const r = apply(s, legalActions(s)[0]!);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    s = r.state;
    expect(s.result).toEqual({ kind: 'noMoves', winner: 'w' });
    expect(r.events.map((e) => e.type)).toEqual(['moved', 'gameOver']);
  });

  it('чужой ход и неверный ход отклоняются', () => {
    const s = newGame();
    expect(apply(s, { type: 'move', color: 'b', move: { path: [P('b6'), P('a5')], captures: [] } })).toEqual({ ok: false, error: 'wrongColor' });
    expect(apply(s, { type: 'move', color: 'w', move: { path: [P('a3'), P('a4')], captures: [] } })).toEqual({ ok: false, error: 'illegalMove' });
  });

  it('сдача', () => {
    const r = apply(newGame(), { type: 'resign', color: 'w' });
    expect(r.ok && r.state.result).toEqual({ kind: 'resign', winner: 'b' });
  });

  it(`ничья после ${KING_PLIES_DRAW} полуходов только дамками`, () => {
    let s: CheckersState = newGame(boardFrom('w:Ka1,Kc1 b:Kh8,Kf8'), 'w');
    const pick = picker(7);
    let plies = 0;
    while (s.phase === 'play' && plies < 200) {
      const acts = legalActions(s);
      const r = apply(s, acts[pick(acts.length)]!);
      if (!r.ok) throw new Error(r.error);
      s = r.state;
      plies++;
    }
    expect(s.phase).toBe('over');
    expect(['kingMoves', 'repetition', 'noMoves']).toContain(s.result?.kind);
    if (s.result?.kind === 'kingMoves') expect(plies).toBe(KING_PLIES_DRAW);
  });

  it('троекратное повторение — ничья', () => {
    let s: CheckersState = newGame(boardFrom('w:Ka1 b:Kh2'), 'w');
    const go = (a: string, b: string) => {
      const r = apply(s, { type: 'move', color: s.turn, move: { path: [P(a), P(b)], captures: [] } });
      if (!r.ok) throw new Error(`${a}-${b}: ${r.error}`);
      s = r.state;
    };
    go('a1', 'b2'); go('h2', 'g1'); go('b2', 'a1'); go('g1', 'h2');
    go('a1', 'b2'); go('h2', 'g1'); go('b2', 'a1'); go('g1', 'h2');
    expect(s.result).toEqual({ kind: 'repetition', winner: null });
  });
});

describe('русские шашки: случайные партии', () => {
  it('шашек не становится больше, взятия снимают ровно сбитых, партии заканчиваются', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const pick = picker(seed);
      let s = newGame();
      let plies = 0;
      while (s.phase === 'play') {
        const acts = legalActions(s);
        const a = acts[pick(acts.length)]!;
        const before = s.board.filter(Boolean).length;
        const r = apply(s, a);
        if (!r.ok) throw new Error(r.error);
        const after = r.state.board.filter(Boolean).length;
        if (a.type === 'move') expect(before - after).toBe(a.move.captures.length);
        for (let i = 0; i < 64; i++) if (r.state.board[i]) expect((Math.floor(i / 8) + (i % 8)) % 2).toBe(0);
        s = r.state;
        if (++plies > 2000) throw new Error('партия не закончилась');
      }
      expect(s.result).not.toBeNull();
    }
  });
});
