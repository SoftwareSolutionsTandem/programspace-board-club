// Эвристическая политика (уровень «средний» и основа для остальных). Работает только с PlayerView.
import { beats, type Card, type Rank } from '../rules/cards';
import type { DurakAction } from '../view';
import type { PlayerView } from '../view';

export interface Personality {
  /** Насколько дороже обычного ценятся козыри, пока в колоде есть карты (Агата копит козыри). */
  readonly trumpHoard: number;
  /** Охота подкидывать, когда у соперника мало карт: сдвиг порога ценности. */
  readonly throwEagerness: number;
}

export const NEUTRAL: Personality = { trumpHoard: 1, throwEagerness: 0 };

/** Ценность карты для удержания: чем выше, тем жальче её отдавать. */
export function cardValue(card: Card, view: PlayerView, p: Personality): number {
  const base = card.rank - 5; // 1…9
  if (card.suit !== view.trumpSuit) return base;
  const hoard = view.deckCount > 0 ? p.trumpHoard : 1;
  return base + 9 * hoard;
}

const isTrump = (c: Card, v: PlayerView) => c.suit === v.trumpSuit;

/** Сколько карт того же достоинства у меня (пары удобно сбрасывать вместе). */
function countRank(hand: readonly Card[], rank: Rank): number {
  return hand.filter((c) => c.rank === rank).length;
}

export function chooseAttack(view: PlayerView, options: readonly Extract<DurakAction, { type: 'attack' }>[], p: Personality): DurakAction {
  const endgame = view.deckCount === 0;
  let best = options[0]!;
  let bestScore = -Infinity;
  for (const a of options) {
    const values = a.cards.map((c) => cardValue(c, view, p));
    const avg = values.reduce((s, x) => s + x, 0) / values.length;
    let score = -avg + (a.cards.length - 1) * 1.6;
    if (a.cards.some((c) => isTrump(c, view)) && !endgame) score -= 6;
    // Конец игры: избавиться от всех карт разом — победа.
    if (endgame && a.cards.length === view.hand.length) score += 100;
    // Не разбивать пару одиночной атакой без причины.
    if (a.cards.length < countRank(view.hand, a.cards[0]!.rank) && !endgame) score -= 0.8;
    if (score > bestScore) {
      bestScore = score;
      best = a;
    }
  }
  return best;
}

/** План защиты: для каждой непобитой карты — самая дешёвая бьющая (сначала самые сильные атаки). */
export function defensePlan(view: PlayerView, p: Personality): { index: number; card: Card }[] | null {
  const pool = [...view.hand];
  const open = view.table.map((pair, index) => ({ pair, index })).filter((x) => x.pair.defense === null);
  open.sort((a, b) => cardValue(b.pair.attack, view, p) - cardValue(a.pair.attack, view, p));
  const plan: { index: number; card: Card }[] = [];
  for (const { pair, index } of open) {
    const candidates = pool.filter((c) => beats(pair.attack, c, view.trumpSuit)).sort((a, b) => cardValue(a, view, p) - cardValue(b, view, p));
    const pick = candidates[0];
    if (!pick) return null;
    plan.push({ index, card: pick });
    pool.splice(pool.indexOf(pick), 1);
  }
  return plan;
}

export function chooseDefense(view: PlayerView, p: Personality): DurakAction {
  const seat = view.seat;
  const plan = defensePlan(view, p);
  if (!plan) return { type: 'take', seat };
  const cost = plan.reduce((s, x) => s + cardValue(x.card, view, p), 0);
  const tableCards = view.table.length + view.table.filter((x) => x.defense).length;
  // Брать дешёвые карты в начале игры иногда выгоднее, чем тратить старшие козыри.
  const takePenalty = view.deckCount === 0 ? 40 : 6 + tableCards * 2.2 - Math.min(view.deckCount, 12) * 0.25;
  const trumpsSpent = plan.filter((x) => isTrump(x.card, view)).length;
  if (view.deckCount > 8 && trumpsSpent > 0 && cost > takePenalty + 10) return { type: 'take', seat };
  const first = plan[0]!;
  return { type: 'defend', seat, attackIndex: first.index, card: first.card };
}

export function chooseThrowIn(view: PlayerView, options: readonly DurakAction[], p: Personality): DurakAction {
  const seat = view.seat;
  const finish: DurakAction = view.phase === 'throwInAfterTake' ? { type: 'doneThrowing', seat } : { type: 'pass', seat };
  const singles = options.filter((a): a is Extract<DurakAction, { type: 'throwIn' }> => a.type === 'throwIn');
  if (singles.length === 0) return finish;
  const endgame = view.deckCount === 0;
  const afterTake = view.phase === 'throwInAfterTake';
  let threshold = afterTake ? 6 : 4;
  if (view.opponentHandCount <= 3) threshold += p.throwEagerness;
  if (endgame) threshold = 30; // в конце партии любая лишняя карта — минус
  let best: DurakAction | null = null;
  let bestValue = Infinity;
  for (const a of singles) {
    const c = a.cards[0]!;
    const v = cardValue(c, view, p);
    if (isTrump(c, view) && !endgame) continue;
    if (v <= threshold && v < bestValue) {
      best = a;
      bestValue = v;
    }
  }
  return best ?? finish;
}

/** Средний уровень: ход по эвристикам, без случайности. */
export function heuristicMove(view: PlayerView, options: readonly DurakAction[], p: Personality): DurakAction {
  const attacks = options.filter((a): a is Extract<DurakAction, { type: 'attack' }> => a.type === 'attack');
  if (attacks.length) return chooseAttack(view, attacks, p);
  if (options.some((a) => a.type === 'defend' || a.type === 'take')) return chooseDefense(view, p);
  return chooseThrowIn(view, options, p);
}
