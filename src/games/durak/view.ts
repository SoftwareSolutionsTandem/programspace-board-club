// Проекция состояния для одного места (docs/games/durak.md §9): только то, что этот игрок видит или знает.
// И интерфейс, и ИИ работают только с PlayerView; полное состояние сюда не попадает.
import { legalActionsFor, type DurakAction } from './rules/engine';
import type { Card, Seat, Suit } from './rules/cards';
import type { DurakPhase, DurakResult, DurakState, Pair } from './rules/state';

export interface PlayerView {
  readonly seat: Seat;
  readonly hand: readonly Card[];
  readonly opponentHandCount: number;
  /** Карты, которые точно лежат в руке соперника (видели оба). */
  readonly opponentKnown: readonly Card[];
  /** Что соперник знает о моей руке. */
  readonly myKnown: readonly Card[];
  readonly table: readonly Pair[];
  /** Отбой: карты были открыты на столе, их видели оба. */
  readonly discard: readonly Card[];
  readonly deckCount: number;
  /** Открытый козырь: показан всем при раздаче. */
  readonly trumpCard: Card;
  readonly trumpSuit: Suit;
  /** Лежит ли открытый козырь ещё под колодой. */
  readonly trumpInDeck: boolean;
  readonly attacker: Seat;
  readonly phase: DurakPhase;
  readonly firstBout: boolean;
  readonly boutDefenderHand: number;
  readonly result: DurakResult | null;
}

const copy = (cards: readonly Card[]): Card[] => cards.map((c) => ({ suit: c.suit, rank: c.rank }));

export function projectView(state: DurakState, seat: Seat): PlayerView {
  const opp: Seat = seat === 0 ? 1 : 0;
  // Глубокие копии: никаких ссылок на объекты полного состояния.
  return {
    seat,
    hand: copy(state.hands[seat]),
    opponentHandCount: state.hands[opp].length,
    opponentKnown: copy(state.knowledge.knownInHand[opp]),
    myKnown: copy(state.knowledge.knownInHand[seat]),
    table: state.table.map((p) => ({ attack: { ...p.attack }, defense: p.defense ? { ...p.defense } : null })),
    discard: copy(state.discard),
    deckCount: state.deck.length,
    trumpCard: { ...state.trumpCard },
    trumpSuit: state.trumpSuit,
    trumpInDeck: state.deck.length > 0,
    attacker: state.attacker,
    phase: state.phase,
    firstBout: state.firstBout,
    boutDefenderHand: state.boutDefenderHand,
    result: state.result,
  };
}

/** Допустимые действия, вычисленные только по проекции. */
export type { DurakAction };

export const legalActionsForView = (view: PlayerView): DurakAction[] => legalActionsFor(view);

/** Чей ход по проекции (совпадает с actor() полного состояния). */
export function viewActor(view: PlayerView): Seat | null {
  if (view.phase === 'gameOver') return null;
  if (view.phase === 'defend' && view.table.some((p) => p.defense === null)) return view.attacker === 0 ? 1 : 0;
  return view.attacker;
}
