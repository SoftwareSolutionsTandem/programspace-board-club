import { describe, expect, it } from 'vitest';
import { createRng, nextInt, type RngState } from '../../../src/core/rng';
import { cardCode, sameCard } from '../../../src/games/durak/rules/cards';
import { actor, apply, boutLimit, defender, legalActions, unbeatenCount } from '../../../src/games/durak/rules/engine';
import { newGame } from '../../../src/games/durak/rules/setup';
import type { DurakState } from '../../../src/games/durak/rules/state';

function checkInvariants(s: DurakState) {
  const all = [...s.hands[0], ...s.hands[1], ...s.deck, ...s.discard, ...s.table.flatMap((p) => (p.defense ? [p.attack, p.defense] : [p.attack]))];
  expect(all.length).toBe(36);
  expect(new Set(all.map(cardCode)).size).toBe(36);
  if (s.deck.length > 0) expect(sameCard(s.deck[s.deck.length - 1]!, s.trumpCard)).toBe(true);
  expect(s.table.length).toBeLessThanOrEqual(boutLimit(s));
  if (s.phase !== 'gameOver') expect(unbeatenCount(s.table)).toBeLessThanOrEqual(s.hands[defender(s)].length);
  for (const seat of [0, 1] as const) for (const k of s.knowledge.knownInHand[seat]) expect(s.hands[seat].some((h) => sameCard(h, k))).toBe(true);
}

/** Случайная партия законными ходами; возвращает итог и число действий. */
function randomGame(seed: number, check: boolean) {
  let s = newGame(createRng(seed));
  let rng: RngState = createRng(seed ^ 0x5bd1e995);
  let steps = 0;
  while (s.phase !== 'gameOver') {
    const seat = actor(s);
    expect(seat).not.toBeNull();
    const options = legalActions(s, seat!);
    expect(options.length).toBeGreaterThan(0);
    const [i, next] = nextInt(rng, options.length);
    rng = next;
    const r = apply(s, options[i]!);
    if (!r.ok) throw new Error(`законное действие отклонено: ${r.error}`);
    s = r.state;
    if (check) checkInvariants(s);
    if (++steps > 2000) throw new Error('партия не завершилась');
  }
  return { result: s.result!, steps };
}

describe('случайные партии законными ходами', () => {
  it('инварианты держатся на каждом шаге (300 партий)', () => {
    for (let seed = 0; seed < 300; seed++) randomGame(seed, true);
  });

  it('10 000 партий завершаются, встречаются победы обоих мест и ничьи', () => {
    const tally = { 0: 0, 1: 0, draw: 0 };
    let maxSteps = 0;
    for (let seed = 0; seed < 10_000; seed++) {
      const { result, steps } = randomGame(seed, false);
      if ('draw' in result) tally.draw++;
      else tally[result.winner]++;
      maxSteps = Math.max(maxSteps, steps);
    }
    expect(tally[0]).toBeGreaterThan(1000);
    expect(tally[1]).toBeGreaterThan(1000);
    expect(tally.draw).toBeGreaterThan(0);
    expect(maxSteps).toBeLessThan(2000);
  }, 60_000);

  it('партия воспроизводима: тот же seed — та же последовательность', () => {
    expect(randomGame(123, false)).toEqual(randomGame(123, false));
  });

});
