// Раздача и выбор первого атакующего (docs/games/durak.md §2–3).
import { shuffle, type RngState } from '../../../core/rng';
import { createDeck, lowestTrump, otherSeat, type Card, type Seat, type Suit } from './cards';
import type { DurakResult, DurakState, FirstAttackerReason } from './state';

export const HAND_SIZE = 6;

export interface Deal {
  readonly hands: readonly [readonly Card[], readonly Card[]];
  /** [0] — верх колоды, последний элемент — открытый козырь. */
  readonly deck: readonly Card[];
  readonly trumpCard: Card;
  readonly rng: RngState;
}

/** Тасует колоду и сдаёт по 6 карт поочерёдно, начиная с места 0; следующая карта — козырь под колоду. */
export function deal(rng: RngState): Deal {
  const [shuffled, next] = shuffle(rng, createDeck());
  const hands: [Card[], Card[]] = [[], []];
  for (let i = 0; i < HAND_SIZE * 2; i++) hands[(i % 2) as Seat].push(shuffled[i] as Card);
  const trumpCard = shuffled[HAND_SIZE * 2] as Card;
  // Козырь кладётся под колоду и будет взят последним.
  const deck = [...shuffled.slice(HAND_SIZE * 2 + 1), trumpCard];
  return { hands, deck, trumpCard, rng: next };
}

/** Итог предыдущей партии серии с тем же соперником; null — первая партия серии. */
export type SeriesContext = { readonly previousResult: DurakResult | null };

export type FirstAttackerChoice = { readonly seat: Seat; readonly reason: FirstAttackerReason };

/**
 * Первый атакующий:
 * - после победы в прошлой партии серии — победитель («ходят под дурака»), козыри не важны;
 * - в первой партии серии и после ничьей — владелец младшего козыря;
 * - если козырей нет ни у кого — null (нужна пересдача).
 * Открытый козырь под колодой в выборе не участвует.
 */
export function chooseFirstAttacker(
  hands: readonly [readonly Card[], readonly Card[]],
  trumpSuit: Suit,
  series: SeriesContext,
): FirstAttackerChoice | null {
  const prev = series.previousResult;
  if (prev !== null && 'winner' in prev) return { seat: prev.winner, reason: { kind: 'previousWinner' } };
  const low0 = lowestTrump(hands[0], trumpSuit);
  const low1 = lowestTrump(hands[1], trumpSuit);
  if (low0 === null && low1 === null) return null;
  if (low1 === null || (low0 !== null && low0.rank < low1.rank)) return { seat: 0, reason: { kind: 'lowestTrump', card: low0 as Card } };
  return { seat: 1, reason: { kind: 'lowestTrump', card: low1 } };
}

/** Защита от бесконечного цикла; вероятность 100 пересдач подряд ≈ 0,021^100. */
export const MAX_REDEALS = 100;

/** Новая партия: раздача, при необходимости пересдача, выбор первого атакующего. */
export function newGame(rng: RngState, series: SeriesContext = { previousResult: null }): DurakState {
  let state = rng;
  for (let redeals = 0; redeals <= MAX_REDEALS; redeals++) {
    const d = deal(state);
    state = d.rng;
    const choice = chooseFirstAttacker(d.hands, d.trumpCard.suit, series);
    if (choice === null) continue;
    // Показанный младший козырь становится известен обоим (§3, §9).
    const known: [Card[], Card[]] = [[], []];
    if (choice.reason.kind === 'lowestTrump') known[choice.seat].push(choice.reason.card);
    return {
      rng: d.rng,
      deck: d.deck,
      trumpCard: d.trumpCard,
      trumpSuit: d.trumpCard.suit,
      hands: d.hands,
      table: [],
      discard: [],
      attacker: choice.seat,
      phase: 'attack',
      firstBout: true,
      knowledge: { knownInHand: known },
      firstAttackerReason: choice.reason,
      redeals,
      result: null,
    };
  }
  throw new Error(`newGame: больше ${MAX_REDEALS} пересдач подряд`);
}

export const defenderOf = (state: Pick<DurakState, 'attacker'>): Seat => otherSeat(state.attacker);
