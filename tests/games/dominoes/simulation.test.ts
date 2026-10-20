import { describe, expect, it } from 'vitest';
import { hasPip, type Seat } from '../../../src/games/dominoes/rules/bones';
import { actor, legalActions } from '../../../src/games/dominoes/rules/engine';
import { startMatch } from '../../../src/games/dominoes/rules/setup';
import type { DominoState } from '../../../src/games/dominoes/rules/state';
import { legalActionsForView, projectView } from '../../../src/games/dominoes/view';
import { allBones, nextHand, randomHand } from './helpers';

function checkInvariants(s: DominoState) {
  const all = allBones(s);
  expect(all.length).toBe(28);
  expect(new Set(all).size).toBe(28);
  // Цепочка связна, у каждой кости left/right — её половины.
  for (let i = 0; i < s.chain.length; i++) {
    const p = s.chain[i]!;
    expect([p.left, p.right].sort()).toEqual([p.bone.hi, p.bone.lo].sort());
    if (i > 0) expect(s.chain[i - 1]!.right).toBe(p.left);
  }
  // Честные выводы (§10) всегда верны: у места нет ни одной кости с «отсутствующим» числом.
  for (const seat of [0, 1] as const) for (const n of s.knowledge.missing[seat]) expect(s.hands[seat].some((x) => hasPip(x, n))).toBe(false);
  const who = actor(s);
  if (who !== null) {
    const legal = legalActions(s);
    expect(legal.length).toBeGreaterThan(0);
    expect(legalActionsForView(projectView(s, who))).toEqual(legal);
    expect(legalActionsForView(projectView(s, (1 - who) as Seat))).toEqual([]);
  }
}

describe('случайные раздачи законными ходами', () => {
  it('инварианты на каждом шаге (600 раздач)', () => {
    let missingSeen = 0;
    for (let seed = 0; seed < 600; seed++) {
      const end = randomHand(startMatch(seed), seed + 1, (s) => {
        checkInvariants(s);
        missingSeen += s.knowledge.missing[0].length + s.knowledge.missing[1].length;
      });
      expect(['handOver', 'matchOver']).toContain(end.phase);
      expect(end.handResult).not.toBeNull();
    }
    // Выводы действительно появляются, а не всегда пусты.
    expect(missingSeen).toBeGreaterThan(300);
  }, 60_000);

  it('встречаются все исходы раздачи', () => {
    const kinds = new Set<string>();
    for (let seed = 0; seed < 3000 && kinds.size < 3; seed++) kinds.add(randomHand(startMatch(seed), seed).handResult!.kind);
    expect([...kinds].sort()).toEqual(['domino', 'fish', 'fishDraw']);
  });

  it('матч случайными ходами доходит до 101', () => {
    for (let seed = 0; seed < 100; seed++) {
      let s = startMatch(seed);
      for (let hand = 0; s.phase !== 'matchOver'; hand++) {
        if (hand > 200) throw new Error('матч не завершился');
        s = randomHand(s, seed * 1000 + hand);
        checkInvariants(s);
        if (s.phase === 'handOver') {
          const n = nextHand(s);
          if (!n.ok) throw new Error(n.error);
          s = n.state;
        }
      }
      expect(Math.max(...s.score)).toBeGreaterThanOrEqual(101);
      expect(s.score[s.matchWinner!]).toBeGreaterThanOrEqual(101);
    }
  });
});
