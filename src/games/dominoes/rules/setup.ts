// Раздача и первый ход (docs/games/dominoes.md §2–3, §7).
import { createRng, shuffle, type RngState } from '../../../core/rng';
import { compareHeaviness, createSet, OPENING_DOUBLES, sameBone, type Bone, type Seat } from './bones';
import type { DominoState, Opening } from './state';

export const HAND_SIZE = 7;
export const MATCH_TARGET = 101;

/** Как выбирается первый ход раздачи: по дублю (первая раздача, после ничейной «рыбы») или заходит победитель. */
export type StarterRule = { readonly kind: 'byDouble' } | { readonly kind: 'winner'; readonly seat: Seat };

/** Первый ход по младшему дублю, без дублей — по самой тяжёлой кости (§3). */
export function openingByDouble(hands: readonly [readonly Bone[], readonly Bone[]]): Opening {
  for (const d of OPENING_DOUBLES) {
    for (const seat of [0, 1] as const) if (hands[seat].some((b) => sameBone(b, d))) return { kind: 'lowestDouble', seat, bone: d };
  }
  let best: { seat: Seat; bone: Bone } | null = null;
  for (const seat of [0, 1] as const) {
    for (const b of hands[seat]) if (!best || compareHeaviness(b, best.bone) > 0) best = { seat, bone: b };
  }
  if (!best) throw new Error('раздача без костей');
  return { kind: 'heaviest', seat: best.seat, bone: best.bone };
}

interface MatchFields {
  readonly score: readonly [number, number];
  readonly target: number;
  readonly handNumber: number;
}

/** Раздача: тасование, по 7 костей, 14 в базар (§2), первый ход (§3). */
export function dealHand(rng: RngState, starter: StarterRule, match: MatchFields): DominoState {
  const [set, next] = shuffle(rng, createSet());
  const hands: [Bone[], Bone[]] = [set.slice(0, HAND_SIZE), set.slice(HAND_SIZE, HAND_SIZE * 2)];
  const opening: Opening = starter.kind === 'winner' ? { kind: 'winner', seat: starter.seat } : openingByDouble(hands);
  return {
    rng: next,
    hands,
    bazaar: set.slice(HAND_SIZE * 2),
    chain: [],
    turn: opening.seat,
    phase: 'play',
    opening,
    drawnThisTurn: 0,
    drawBase: [],
    knowledge: { missing: [[], []] },
    score: match.score,
    target: match.target,
    handNumber: match.handNumber,
    handResult: null,
    matchWinner: null,
  };
}

/** Новый матч до 101 (§7). */
export function startMatch(seed: number, target: number = MATCH_TARGET): DominoState {
  return dealHand(createRng(seed), { kind: 'byDouble' }, { score: [0, 0], target, handNumber: 1 });
}
