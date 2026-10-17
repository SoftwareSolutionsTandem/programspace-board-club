import { describe, expect, it } from 'vitest';
import { createRng, nextInt, type RngState } from '../../../src/core/rng';
import { DurakMatch, HUMAN, OPPONENT } from '../../../src/games/durak/match';

/** Играет за человека случайными законными ходами, за Агату — ИИ. */
function playOut(m: DurakMatch, seed: number): number {
  let rng: RngState = createRng(seed);
  let steps = 0;
  while (!m.over) {
    if (++steps > 3000) throw new Error('партия не завершилась');
    const turn = m.turn();
    if (turn === OPPONENT) {
      const r = m.opponentStep();
      expect(r?.ok).toBe(true);
      continue;
    }
    expect(turn).toBe(HUMAN);
    const auto = m.autoHumanAction();
    if (auto) { expect(m.act(auto).ok).toBe(true); continue; }
    const opts = m.humanActions();
    const [i, next] = nextInt(rng, opts.length);
    rng = next;
    expect(m.act(opts[i]!).ok).toBe(true);
  }
  return steps;
}

describe('контроллер партии', () => {
  it('полная партия человек (случайные ходы) против ИИ завершается и пишется в серию', () => {
    for (const level of ['easy', 'normal', 'hard'] as const) {
      const m = new DurakMatch({ seed: 5, level });
      playOut(m, 1);
      const s = m.series;
      expect(s.wins[0] + s.wins[1] + s.draws).toBe(1);
    }
  });
  it('серия: следующая партия «под дурака», сброс серии', () => {
    const m = new DurakMatch({ seed: 9, level: 'normal' });
    playOut(m, 2);
    const last = m.series.lastResult!;
    m.nextGame();
    if ('winner' in last) expect(m.view().attacker).toBe(last.winner);
    playOut(m, 3);
    expect(m.series.wins[0] + m.series.wins[1] + m.series.draws).toBe(2);
    m.resetSeries();
    expect(m.series).toEqual({ wins: [0, 0], draws: 0, lastResult: null });
    expect(m.over).toBe(false);
  });
  it('ИИ не ходит в очередь игрока, игрок не ходит за ИИ', () => {
    const m = new DurakMatch({ seed: 3, level: 'normal' });
    if (m.turn() === HUMAN) expect(m.opponentStep()).toBeNull();
    const fake = { type: 'pass', seat: OPPONENT } as const;
    expect(m.act(fake)).toEqual({ ok: false, error: 'wrongSeat' });
  });
  it('недопустимое действие игрока объясняется и ничего не меняет', () => {
    const m = new DurakMatch({ seed: 4, level: 'normal' });
    const before = JSON.stringify(m.view());
    const r = m.act({ type: 'take', seat: HUMAN });
    expect(r.ok).toBe(false);
    expect(JSON.stringify(m.view())).toBe(before);
  });
  it('воспроизводимость: тот же seed и те же действия — та же партия', () => {
    const a = new DurakMatch({ seed: 21, level: 'hard' });
    const b = new DurakMatch({ seed: 21, level: 'hard' });
    playOut(a, 7);
    playOut(b, 7);
    expect(a.series).toEqual(b.series);
    expect(a.view()).toEqual(b.view());
  });
  it('проекция игрока не содержит руки соперника', () => {
    const m = new DurakMatch({ seed: 2, level: 'normal' });
    const v = m.view() as unknown as Record<string, unknown>;
    expect(v.hands).toBeUndefined();
    expect(v.deck).toBeUndefined();
    expect(m.view().opponentHandCount).toBe(6);
  });
});
