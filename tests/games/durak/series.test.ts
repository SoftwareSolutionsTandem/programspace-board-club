import { describe, expect, it } from 'vitest';
import { createRng } from '../../../src/core/rng';
import { newSeries, recordResult, seriesContext } from '../../../src/games/durak/rules/series';
import { newGame } from '../../../src/games/durak/rules/setup';

describe('серия партий (§3)', () => {
  it('новая серия — первая партия по младшему козырю', () => {
    expect(seriesContext(newSeries())).toEqual({ previousResult: null });
    expect(newGame(createRng(3), seriesContext(newSeries())).firstAttackerReason.kind).toBe('lowestTrump');
  });
  it('счёт и «под дурака» после победы', () => {
    let s = recordResult(newSeries(), { winner: 1 });
    expect(s.wins).toEqual([0, 1]);
    expect(newGame(createRng(3), seriesContext(s))).toMatchObject({ attacker: 1, firstAttackerReason: { kind: 'previousWinner' } });
    s = recordResult(s, { winner: 0 });
    expect(s.wins).toEqual([1, 1]);
    expect(newGame(createRng(4), seriesContext(s)).attacker).toBe(0);
  });
  it('после ничьей — младший козырь, ничьи считаются', () => {
    const s = recordResult(recordResult(newSeries(), { winner: 0 }), { draw: true });
    expect(s.draws).toBe(1);
    expect(s.wins).toEqual([1, 0]);
    expect(newGame(createRng(5), seriesContext(s)).firstAttackerReason.kind).toBe('lowestTrump');
  });
  it('счёт не мутирует исходную серию', () => {
    const a = newSeries();
    recordResult(a, { winner: 0 });
    expect(a.wins).toEqual([0, 0]);
  });
});
