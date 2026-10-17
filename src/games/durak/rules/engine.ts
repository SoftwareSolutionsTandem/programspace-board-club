// Движок правил подкидного дурака 1 на 1 (docs/games/durak.md §4–6).
// Чистые функции: состояние + действие → новое состояние + доменные события. Без DOM, звука и таймеров.
import { beats, cardCode, otherSeat, sameCard, type Card, type Rank, type Seat } from './cards';
import { HAND_SIZE } from './setup';
import type { DurakResult, DurakState, Pair } from './state';

export type DurakAction =
  | { readonly type: 'attack'; readonly seat: Seat; readonly cards: readonly Card[] }
  | { readonly type: 'throwIn'; readonly seat: Seat; readonly cards: readonly Card[] }
  | { readonly type: 'defend'; readonly seat: Seat; readonly attackIndex: number; readonly card: Card }
  | { readonly type: 'take'; readonly seat: Seat }
  | { readonly type: 'pass'; readonly seat: Seat }
  | { readonly type: 'doneThrowing'; readonly seat: Seat };

export type DurakEvent =
  | { readonly type: 'attacked'; readonly seat: Seat; readonly cards: readonly Card[] }
  | { readonly type: 'thrownIn'; readonly seat: Seat; readonly cards: readonly Card[]; readonly afterTake: boolean }
  | { readonly type: 'defended'; readonly seat: Seat; readonly attack: Card; readonly card: Card; readonly withTrump: boolean }
  | { readonly type: 'takeDeclared'; readonly seat: Seat }
  | { readonly type: 'took'; readonly seat: Seat; readonly cards: readonly Card[] }
  | { readonly type: 'bito'; readonly cards: readonly Card[] }
  | { readonly type: 'drew'; readonly seat: Seat; readonly cards: readonly Card[]; readonly trumpTaken: boolean }
  | { readonly type: 'deckEmpty' }
  | { readonly type: 'boutStarted'; readonly attacker: Seat; readonly limit: number }
  | { readonly type: 'gameOver'; readonly result: DurakResult };

export type DurakError =
  | 'gameOver'
  | 'wrongSeat'
  | 'wrongPhase'
  | 'noCards'
  | 'duplicateCards'
  | 'cardNotInHand'
  | 'mixedRanks'
  | 'rankNotOnTable'
  | 'limitExceeded'
  | 'badAttackIndex'
  | 'alreadyBeaten'
  | 'cannotBeat'
  | 'nothingToTake'
  | 'unbeatenCards';

export type ApplyResult =
  | { readonly ok: true; readonly state: DurakState; readonly events: readonly DurakEvent[] }
  | { readonly ok: false; readonly error: DurakError };

// ---------- вспомогательные функции правил ----------

export { beats };

export const boutCap = (state: Pick<DurakState, 'firstBout'>): number => (state.firstBout ? 5 : HAND_SIZE);

/** Сколько атакующих карт всего можно выложить в текущем отбое (§4.4). */
export const boutLimit = (state: Pick<DurakState, 'firstBout' | 'boutDefenderHand'>): number => Math.min(boutCap(state), state.boutDefenderHand);

export const defender = (state: Pick<DurakState, 'attacker'>): Seat => otherSeat(state.attacker);

export const unbeatenCount = (table: readonly Pair[]): number => table.filter((p) => p.defense === null).length;

export function ranksOnTable(table: readonly Pair[]): Set<Rank> {
  const ranks = new Set<Rank>();
  for (const p of table) {
    ranks.add(p.attack.rank);
    if (p.defense) ranks.add(p.defense.rank);
  }
  return ranks;
}

/** Чей сейчас ход: кто должен действовать, чтобы партия продвинулась. */
export function actor(state: DurakState): Seat | null {
  switch (state.phase) {
    case 'gameOver':
      return null;
    case 'attack':
    case 'throwInAfterTake':
      return state.attacker;
    case 'defend':
      return unbeatenCount(state.table) > 0 ? defender(state) : state.attacker;
  }
}

/** Сколько ещё карт атакующий может подкинуть прямо сейчас. */
export const throwInRoom = (state: DurakState): number => Math.max(0, boutLimit(state) - state.table.length);

const inHand = (hand: readonly Card[], card: Card): boolean => hand.some((c) => sameCard(c, card));
const removeCards = (hand: readonly Card[], cards: readonly Card[]): Card[] => hand.filter((c) => !cards.some((x) => sameCard(x, c)));
const hasDuplicates = (cards: readonly Card[]): boolean => new Set(cards.map(cardCode)).size !== cards.length;

// ---------- проверка допустимости ----------

export function validate(state: DurakState, action: DurakAction): DurakError | null {
  if (state.phase === 'gameOver') return 'gameOver';
  const attacker = state.attacker;
  const def = defender(state);
  const hand = state.hands[action.seat];
  switch (action.type) {
    case 'attack': {
      if (action.seat !== attacker) return 'wrongSeat';
      if (state.phase !== 'attack') return 'wrongPhase';
      return validateCards(hand, action.cards) ?? (new Set(action.cards.map((c) => c.rank)).size > 1 ? 'mixedRanks' : null) ?? (action.cards.length > boutLimit(state) ? 'limitExceeded' : null);
    }
    case 'throwIn': {
      if (action.seat !== attacker) return 'wrongSeat';
      if (state.phase !== 'defend' && state.phase !== 'throwInAfterTake') return 'wrongPhase';
      const err = validateCards(hand, action.cards);
      if (err) return err;
      const ranks = ranksOnTable(state.table);
      if (action.cards.some((c) => !ranks.has(c.rank))) return 'rankNotOnTable';
      if (action.cards.length > throwInRoom(state)) return 'limitExceeded';
      return null;
    }
    case 'defend': {
      if (action.seat !== def) return 'wrongSeat';
      if (state.phase !== 'defend') return 'wrongPhase';
      const pair = state.table[action.attackIndex];
      if (!pair) return 'badAttackIndex';
      if (pair.defense) return 'alreadyBeaten';
      if (!inHand(hand, action.card)) return 'cardNotInHand';
      return beats(pair.attack, action.card, state.trumpSuit) ? null : 'cannotBeat';
    }
    case 'take': {
      if (action.seat !== def) return 'wrongSeat';
      if (state.phase !== 'defend') return 'wrongPhase';
      return unbeatenCount(state.table) > 0 ? null : 'nothingToTake';
    }
    case 'pass': {
      if (action.seat !== attacker) return 'wrongSeat';
      if (state.phase !== 'defend') return 'wrongPhase';
      return unbeatenCount(state.table) > 0 ? 'unbeatenCards' : null;
    }
    case 'doneThrowing': {
      if (action.seat !== attacker) return 'wrongSeat';
      return state.phase === 'throwInAfterTake' ? null : 'wrongPhase';
    }
  }
}

function validateCards(hand: readonly Card[], cards: readonly Card[]): DurakError | null {
  if (cards.length === 0) return 'noCards';
  if (hasDuplicates(cards)) return 'duplicateCards';
  if (cards.some((c) => !inHand(hand, c))) return 'cardNotInHand';
  return null;
}

// ---------- применение действий ----------

export function apply(state: DurakState, action: DurakAction): ApplyResult {
  const error = validate(state, action);
  if (error) return { ok: false, error };
  const events: DurakEvent[] = [];
  const next = reduce(state, action, events);
  return { ok: true, state: next, events };
}

function withHand(hands: DurakState['hands'], seat: Seat, hand: readonly Card[]): DurakState['hands'] {
  return seat === 0 ? [hand, hands[1]] : [hands[0], hand];
}

/** Сыгранные со стола карты больше не считаются «известными в руке». */
function forgetKnown(state: DurakState, seat: Seat, cards: readonly Card[]): DurakState['knowledge'] {
  const known = state.knowledge.knownInHand;
  const updated = removeCards(known[seat], cards);
  return { knownInHand: seat === 0 ? [updated, known[1]] : [known[0], updated] };
}

function reduce(state: DurakState, action: DurakAction, events: DurakEvent[]): DurakState {
  switch (action.type) {
    case 'attack':
    case 'throwIn': {
      const seat = action.seat;
      const table = [...state.table, ...action.cards.map((attack) => ({ attack, defense: null }))];
      if (action.type === 'attack') events.push({ type: 'attacked', seat, cards: action.cards });
      else events.push({ type: 'thrownIn', seat, cards: action.cards, afterTake: state.phase === 'throwInAfterTake' });
      return {
        ...state,
        hands: withHand(state.hands, seat, removeCards(state.hands[seat], action.cards)),
        knowledge: forgetKnown(state, seat, action.cards),
        table,
        phase: state.phase === 'throwInAfterTake' ? 'throwInAfterTake' : 'defend',
      };
    }
    case 'defend': {
      const seat = action.seat;
      const pair = state.table[action.attackIndex] as Pair;
      const table = state.table.map((p, i) => (i === action.attackIndex ? { attack: p.attack, defense: action.card } : p));
      events.push({ type: 'defended', seat, attack: pair.attack, card: action.card, withTrump: action.card.suit === state.trumpSuit && pair.attack.suit !== state.trumpSuit });
      return {
        ...state,
        hands: withHand(state.hands, seat, removeCards(state.hands[seat], [action.card])),
        knowledge: forgetKnown(state, seat, [action.card]),
        table,
      };
    }
    case 'take': {
      events.push({ type: 'takeDeclared', seat: action.seat });
      const next: DurakState = { ...state, phase: 'throwInAfterTake' };
      // Подкинуть вдогонку нечего — защитник сразу забирает карты.
      return throwInRoom(next) > 0 && canThrowAny(next) ? next : finishTake(next, events);
    }
    case 'doneThrowing':
      return finishTake(state, events);
    case 'pass': {
      const cards = state.table.flatMap((p) => [p.attack, p.defense as Card]);
      events.push({ type: 'bito', cards });
      return endBout({ ...state, table: [], discard: [...state.discard, ...cards] }, defender(state), events);
    }
  }
}

/** Есть ли у атакующего хоть одна карта, которую можно подкинуть. */
export function canThrowAny(state: DurakState): boolean {
  if (throwInRoom(state) === 0) return false;
  const ranks = ranksOnTable(state.table);
  return state.hands[state.attacker].some((c) => ranks.has(c.rank));
}

function finishTake(state: DurakState, events: DurakEvent[]): DurakState {
  const def = defender(state);
  const cards = state.table.flatMap((p) => (p.defense ? [p.attack, p.defense] : [p.attack]));
  events.push({ type: 'took', seat: def, cards });
  const known = state.knowledge.knownInHand;
  // Взятые со стола карты видели оба — теперь они известны в руке взявшего.
  const knownDef = [...known[def], ...cards];
  const taken: DurakState = {
    ...state,
    hands: withHand(state.hands, def, [...state.hands[def], ...cards]),
    knowledge: { knownInHand: def === 0 ? [knownDef, known[1]] : [known[0], knownDef] },
    table: [],
  };
  // Взявший пропускает ход: атакующий остаётся прежним.
  return endBout(taken, state.attacker, events);
}

/** Добор (§5), проверка конца партии (§6) и начало следующего отбоя. */
function endBout(state: DurakState, nextAttacker: Seat, events: DurakEvent[]): DurakState {
  let s = state;
  const order: Seat[] = [state.attacker, defender(state)];
  for (const seat of order) {
    const need = Math.max(0, HAND_SIZE - s.hands[seat].length);
    if (need === 0 || s.deck.length === 0) continue;
    const drawn = s.deck.slice(0, need);
    const deck = s.deck.slice(drawn.length);
    const trumpTaken = deck.length === 0 && drawn.some((c) => sameCard(c, s.trumpCard));
    const known = s.knowledge.knownInHand;
    // Открытый козырь видели оба: кто его взял — известно.
    const knownSeat = trumpTaken ? [...known[seat], s.trumpCard] : known[seat];
    s = {
      ...s,
      deck,
      hands: withHand(s.hands, seat, [...s.hands[seat], ...drawn]),
      knowledge: { knownInHand: seat === 0 ? [knownSeat, known[1]] : [known[0], knownSeat] },
    };
    events.push({ type: 'drew', seat, cards: drawn, trumpTaken });
    if (deck.length === 0) events.push({ type: 'deckEmpty' });
  }
  if (s.deck.length === 0) {
    const empty0 = s.hands[0].length === 0;
    const empty1 = s.hands[1].length === 0;
    if (empty0 || empty1) {
      const result: DurakResult = empty0 && empty1 ? { draw: true } : { winner: empty0 ? 0 : 1 };
      events.push({ type: 'gameOver', result });
      return { ...s, phase: 'gameOver', result };
    }
  }
  const started: DurakState = { ...s, attacker: nextAttacker, phase: 'attack', firstBout: false, boutDefenderHand: s.hands[otherSeat(nextAttacker)].length };
  events.push({ type: 'boutStarted', attacker: nextAttacker, limit: boutLimit(started) });
  return started;
}

// ---------- перечисление допустимых действий ----------

function subsets<T>(items: readonly T[], maxSize: number): T[][] {
  const out: T[][] = [];
  const n = items.length;
  for (let mask = 1; mask < 1 << n; mask++) {
    const pick = items.filter((_, i) => mask & (1 << i));
    if (pick.length <= maxSize) out.push(pick);
  }
  return out;
}

/** Всё, что нужно для перечисления действий одного места: только его рука и открытая часть стола. */
export interface ActionContext {
  readonly seat: Seat;
  readonly hand: readonly Card[];
  readonly table: readonly Pair[];
  readonly phase: DurakState['phase'];
  readonly attacker: Seat;
  readonly trumpSuit: DurakState['trumpSuit'];
  readonly firstBout: boolean;
  readonly boutDefenderHand: number;
}

/**
 * Допустимые действия места. Атака — все наборы карт одного достоинства в пределах лимита;
 * подкидывание — по одной карте (несколько карт за раз тоже допустимы, их проверяет validate).
 */
export function legalActions(state: DurakState, seat: Seat): DurakAction[] {
  return legalActionsFor({ ...state, seat, hand: state.hands[seat] });
}

export function legalActionsFor(ctx: ActionContext): DurakAction[] {
  if (ctx.phase === 'gameOver') return [];
  const { seat, hand } = ctx;
  const out: DurakAction[] = [];
  const room = Math.max(0, boutLimit(ctx) - ctx.table.length);
  if (ctx.phase === 'attack' && seat === ctx.attacker) {
    const byRank = new Map<Rank, Card[]>();
    for (const c of hand) byRank.set(c.rank, [...(byRank.get(c.rank) ?? []), c]);
    for (const group of byRank.values()) for (const cards of subsets(group, boutLimit(ctx))) out.push({ type: 'attack', seat, cards });
    return out;
  }
  if (seat === ctx.attacker && (ctx.phase === 'defend' || ctx.phase === 'throwInAfterTake')) {
    if (room > 0) {
      const ranks = ranksOnTable(ctx.table);
      for (const c of hand) if (ranks.has(c.rank)) out.push({ type: 'throwIn', seat, cards: [c] });
    }
    if (ctx.phase === 'defend' && unbeatenCount(ctx.table) === 0) out.push({ type: 'pass', seat });
    if (ctx.phase === 'throwInAfterTake') out.push({ type: 'doneThrowing', seat });
    return out;
  }
  if (seat === otherSeat(ctx.attacker) && ctx.phase === 'defend') {
    ctx.table.forEach((p, attackIndex) => {
      if (p.defense) return;
      for (const card of hand) if (beats(p.attack, card, ctx.trumpSuit)) out.push({ type: 'defend', seat, attackIndex, card });
    });
    if (unbeatenCount(ctx.table) > 0) out.push({ type: 'take', seat });
  }
  return out;
}
