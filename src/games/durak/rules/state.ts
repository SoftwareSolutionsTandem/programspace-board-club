// Состояние партии (docs/games/durak.md §7). Полное состояние ИИ недоступно — он видит только PlayerView.
import type { RngState } from '../../../core/rng';
import type { Card, Seat, Suit } from './cards';

export interface Pair {
  readonly attack: Card;
  readonly defense: Card | null;
}

export type DurakPhase = 'attack' | 'defend' | 'throwInAfterTake' | 'gameOver';

export type DurakResult = { readonly winner: Seat } | { readonly draw: true };

/** Что известно обоим игрокам о руках друг друга (§9). */
export interface PublicKnowledge {
  /** Карты, которые точно лежат в руке места: показанный младший козырь, взятые со стола, взятый козырь-подкладка. */
  readonly knownInHand: readonly [readonly Card[], readonly Card[]];
}

export type FirstAttackerReason =
  | { readonly kind: 'lowestTrump'; readonly card: Card }
  | { readonly kind: 'previousWinner' };

export interface DurakState {
  /** ГСЧ партии (продолжение после раздачи). */
  readonly rng: RngState;
  /** Колода: [0] — верхняя карта, последний элемент — открытый козырь. */
  readonly deck: readonly Card[];
  /** Открытая карта под колодой; её масть — козырь. */
  readonly trumpCard: Card;
  readonly trumpSuit: Suit;
  readonly hands: readonly [readonly Card[], readonly Card[]];
  readonly table: readonly Pair[];
  readonly discard: readonly Card[];
  readonly attacker: Seat;
  readonly phase: DurakPhase;
  /** В первом отбое партии лимит 5 карт, дальше 6 (§4.4). */
  readonly firstBout: boolean;
  /** Сколько карт было у защитника в начале текущего отбоя (лимит по руке, §4.4). */
  readonly boutDefenderHand: number;
  readonly knowledge: PublicKnowledge;
  readonly firstAttackerReason: FirstAttackerReason;
  /** Сколько раз пересдавали из-за отсутствия козырей (§3). */
  readonly redeals: number;
  readonly result: DurakResult | null;
}
