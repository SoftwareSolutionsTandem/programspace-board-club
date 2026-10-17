// Гипотетические миры для поиска ИИ. Мир строится ТОЛЬКО из PlayerView:
// неизвестные карты раскладываются случайно (детерминизация), поэтому настоящие скрытые карты сюда не попадают.
import { nextInt, shuffle, type RngState } from '../../core/rng';
import { cardCode, createDeck, type Card, type Seat } from './rules/cards';
import { actor, apply, legalActions, type DurakAction } from './rules/engine';
import type { DurakResult, DurakState } from './rules/state';
import { projectView, type PlayerView } from './view';

/** Непрозрачный мир: ИИ может только перечислять ходы, применять их и смотреть проекции. */
export interface World {
  readonly __world: DurakState;
}

const wrap = (s: DurakState): World => ({ __world: s });

/** Карты, местонахождение которых наблюдателю неизвестно. */
export function unseenCards(view: PlayerView): Card[] {
  const seen = new Set<string>([...view.hand, ...view.discard, ...view.opponentKnown, ...view.table.flatMap((p) => (p.defense ? [p.attack, p.defense] : [p.attack]))].map(cardCode));
  if (view.trumpInDeck) seen.add(cardCode(view.trumpCard));
  return createDeck().filter((c) => !seen.has(cardCode(c)));
}

/** Случайный мир, согласованный с проекцией. */
export function sampleWorld(view: PlayerView, rng: RngState): [World, RngState] {
  const [unseen, r1] = shuffle(rng, unseenCards(view));
  const needOpp = view.opponentHandCount - view.opponentKnown.length;
  const oppHand = [...view.opponentKnown, ...unseen.slice(0, needOpp)];
  const rest = unseen.slice(needOpp);
  const deck = view.trumpInDeck ? [...rest, view.trumpCard] : rest;
  const me = view.seat;
  const opp: Seat = me === 0 ? 1 : 0;
  const hands: [Card[], Card[]] = [[], []];
  hands[me] = [...view.hand];
  hands[opp] = oppHand;
  const known: [Card[], Card[]] = [[], []];
  known[me] = [...view.myKnown];
  known[opp] = [...view.opponentKnown];
  const state: DurakState = {
    rng: r1,
    deck,
    trumpCard: view.trumpCard,
    trumpSuit: view.trumpSuit,
    hands,
    table: view.table,
    discard: view.discard,
    attacker: view.attacker,
    phase: view.phase,
    firstBout: view.firstBout,
    boutDefenderHand: view.boutDefenderHand,
    knowledge: { knownInHand: known },
    firstAttackerReason: { kind: 'previousWinner' },
    redeals: 0,
    result: view.result,
  };
  return [wrap(state), r1];
}

export const worldActor = (w: World): Seat | null => actor(w.__world);
export const worldResult = (w: World): DurakResult | null => w.__world.result;
export const worldView = (w: World, seat: Seat): PlayerView => projectView(w.__world, seat);
export const worldLegal = (w: World, seat: Seat): DurakAction[] => legalActions(w.__world, seat);

export function worldApply(w: World, action: DurakAction): World {
  const r = apply(w.__world, action);
  if (!r.ok) throw new Error(`sim: недопустимое действие ${r.error}`);
  return wrap(r.state);
}

export { nextInt };
