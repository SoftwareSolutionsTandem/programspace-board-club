// Построение состояний партии для тестов правил.
import { parseCard, parseCards, type Seat, type Suit } from '../../../src/games/durak/rules/cards';
import { createRng } from '../../../src/core/rng';
import type { DurakState, Pair } from '../../../src/games/durak/rules/state';

export interface StateSpec {
  hands: [string, string];
  deck?: string;
  trump: Suit;
  /** Козырь-подкладка; по умолчанию — последняя карта колоды или туз козырей вне игры. */
  trumpCard?: string;
  attacker?: Seat;
  phase?: DurakState['phase'];
  table?: [string, string | null][];
  discard?: string;
  firstBout?: boolean;
  boutDefenderHand?: number;
}

export function makeState(spec: StateSpec): DurakState {
  const deck = parseCards(spec.deck ?? '');
  const attacker = spec.attacker ?? 0;
  const hands: [ReturnType<typeof parseCards>, ReturnType<typeof parseCards>] = [parseCards(spec.hands[0]), parseCards(spec.hands[1])];
  const table: Pair[] = (spec.table ?? []).map(([a, d]) => ({ attack: parseCard(a), defense: d ? parseCard(d) : null }));
  const lastDeck = deck[deck.length - 1];
  const trumpCard = spec.trumpCard ? parseCard(spec.trumpCard) : (lastDeck ?? { suit: spec.trump, rank: 14 });
  const defenderSeat: Seat = attacker === 0 ? 1 : 0;
  return {
    rng: createRng(1),
    deck,
    trumpCard,
    trumpSuit: spec.trump,
    hands,
    table,
    discard: parseCards(spec.discard ?? ''),
    attacker,
    phase: spec.phase ?? (table.length ? 'defend' : 'attack'),
    firstBout: spec.firstBout ?? false,
    boutDefenderHand: spec.boutDefenderHand ?? hands[defenderSeat].length + table.filter((p) => p.defense).length,
    knowledge: { knownInHand: [[], []] },
    firstAttackerReason: { kind: 'previousWinner' },
    redeals: 0,
    result: null,
  };
}
