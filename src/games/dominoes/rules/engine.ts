// Движок правил домино «с базаром», 1 на 1 (docs/games/dominoes.md §3–7).
// Чистые функции: состояние + действие → новое состояние + доменные события. Без DOM, звука и таймеров.
import { handPips, otherSeat, sameBone, type Bone, type Pip, type Seat } from './bones';
import { attach, chainEnds, fittingEnds, playsFor } from './chain';
import { dealHand, type StarterRule } from './setup';
import type { DominoState, End, HandResult, Placed } from './state';

export type DominoAction =
  | { readonly type: 'play'; readonly seat: Seat; readonly bone: Bone; readonly end: End }
  | { readonly type: 'draw'; readonly seat: Seat }
  | { readonly type: 'knock'; readonly seat: Seat };

export type DominoEvent =
  | { readonly type: 'firstMove'; readonly seat: Seat; readonly bone: Bone; readonly reason: DominoState['opening']['kind'] }
  | { readonly type: 'played'; readonly seat: Seat; readonly bone: Bone; readonly end: End; readonly ends: readonly [Pip, Pip]; readonly left: number }
  // Кость в «drew» видна только взявшему: сцена показывает сопернику лишь факт добора и счётчик.
  | { readonly type: 'drew'; readonly seat: Seat; readonly bone: Bone; readonly drawnThisTurn: number }
  | { readonly type: 'bazaarEmpty' }
  | { readonly type: 'knocked'; readonly seat: Seat }
  | { readonly type: 'domino'; readonly winner: Seat; readonly points: number }
  | { readonly type: 'fish'; readonly winner: Seat | null; readonly points: number; readonly pips: readonly [number, number] }
  | { readonly type: 'handOver'; readonly result: HandResult; readonly score: readonly [number, number] }
  | { readonly type: 'matchOver'; readonly winner: Seat; readonly score: readonly [number, number] };

export type DominoError =
  | 'matchOver'
  | 'handOver'
  | 'notHandOver'
  | 'wrongSeat'
  | 'boneNotInHand'
  | 'doesNotFit'
  | 'mustPlayOpening'
  | 'mustPlay'
  | 'bazaarEmpty'
  | 'mustDraw';

export type ApplyResult =
  | { readonly ok: true; readonly state: DominoState; readonly events: readonly DominoEvent[] }
  | { readonly ok: false; readonly error: DominoError };

// Геометрия цепочки — rules/chain.ts (её используют и ИИ, и сцена).
export { attach, chainEnds, fittingEnds, playsFor } from './chain';

const hasPlay = (hand: readonly Bone[], chain: readonly Placed[]): boolean => hand.some((b) => fittingEnds(b, chain).length > 0);

/** Чей ход; null — раздача или матч окончены. */
export const actor = (state: DominoState): Seat | null => (state.phase === 'play' ? state.turn : null);

/** Все допустимые действия (§4, §9). */
export function legalActions(state: DominoState): DominoAction[] {
  if (state.phase !== 'play') return [];
  const seat = state.turn;
  const hand = state.hands[seat];
  if (state.chain.length === 0) {
    const o = state.opening;
    const allowed = o.kind === 'winner' ? hand : hand.filter((b) => sameBone(b, o.bone));
    return allowed.map((b) => ({ type: 'play', seat, bone: b, end: 'left' }));
  }
  const plays = playsFor(hand, state.chain);
  if (plays.length) return plays.map((p) => ({ type: 'play', seat, bone: p.bone, end: p.end }));
  return state.bazaar.length ? [{ type: 'draw', seat }] : [{ type: 'knock', seat }];
}

// ---------- применение ----------

const fail = (error: DominoError): ApplyResult => ({ ok: false, error });

const endPips = (chain: readonly Placed[]): Pip[] => {
  const e = chainEnds(chain);
  return e ? [...new Set(e)] : [];
};

const union = (a: readonly Pip[], b: readonly Pip[]): Pip[] => [...new Set([...a, ...b])].sort((x, y) => x - y);

function setMissing(state: DominoState, seat: Seat, value: readonly Pip[]): DominoState['knowledge'] {
  const missing: [readonly Pip[], readonly Pip[]] = [state.knowledge.missing[0], state.knowledge.missing[1]];
  missing[seat] = [...value].sort((x, y) => x - y);
  return { missing };
}

export function apply(state: DominoState, action: DominoAction): ApplyResult {
  if (state.phase === 'matchOver') return fail('matchOver');
  if (state.phase === 'handOver') return fail('handOver');
  if (action.seat !== state.turn) return fail('wrongSeat');
  switch (action.type) {
    case 'play':
      return applyPlay(state, action.seat, action.bone, action.end);
    case 'draw':
      return applyDraw(state, action.seat);
    case 'knock':
      return applyKnock(state, action.seat);
  }
}

function applyPlay(state: DominoState, seat: Seat, b: Bone, end: End): ApplyResult {
  const hand = state.hands[seat];
  const idx = hand.findIndex((x) => sameBone(x, b));
  if (idx < 0) return fail('boneNotInHand');
  const first = state.chain.length === 0;
  if (first && state.opening.kind !== 'winner' && !sameBone(b, state.opening.bone)) return fail('mustPlayOpening');
  if (!first && !fittingEnds(b, state.chain).includes(end)) return fail('doesNotFit');
  const placed = hand[idx]!;
  // Вывод для соперника (§10): после добора в этом ходу рука без сыгранной кости не содержит чисел концов.
  let knowledge = state.knowledge;
  if (state.drawnThisTurn > 0) knowledge = setMissing(state, seat, state.drawnThisTurn === 1 ? state.drawBase : endPips(state.chain));
  const chain = attach(state.chain, placed, first ? 'left' : end);
  const hands: [readonly Bone[], readonly Bone[]] = [state.hands[0], state.hands[1]];
  hands[seat] = hand.filter((_, i) => i !== idx);
  const events: DominoEvent[] = [];
  if (first) events.push({ type: 'firstMove', seat, bone: placed, reason: state.opening.kind });
  events.push({ type: 'played', seat, bone: placed, end: first ? 'left' : end, ends: chainEnds(chain)!, left: hands[seat].length });
  const next: DominoState = { ...state, hands, chain, knowledge, turn: otherSeat(seat), drawnThisTurn: 0, drawBase: [] };
  if (hands[seat].length === 0) return finishHand(next, { kind: 'domino', winner: seat, points: handPips(hands[otherSeat(seat)]) }, events);
  return checkFish(next, events);
}

function applyDraw(state: DominoState, seat: Seat): ApplyResult {
  if (state.chain.length === 0 || hasPlay(state.hands[seat], state.chain)) return fail('mustPlay');
  if (state.bazaar.length === 0) return fail('bazaarEmpty');
  const drawn = state.bazaar[0]!;
  const hands: [readonly Bone[], readonly Bone[]] = [state.hands[0], state.hands[1]];
  hands[seat] = [...state.hands[seat], drawn];
  // Пока добор не закончен, о руке ничего не известно наверняка: последняя кость может подойти.
  const drawBase = state.drawnThisTurn === 0 ? union(state.knowledge.missing[seat], endPips(state.chain)) : state.drawBase;
  const bazaar = state.bazaar.slice(1);
  const events: DominoEvent[] = [{ type: 'drew', seat, bone: drawn, drawnThisTurn: state.drawnThisTurn + 1 }];
  if (bazaar.length === 0) events.push({ type: 'bazaarEmpty' });
  return { ok: true, state: { ...state, hands, bazaar, drawnThisTurn: state.drawnThisTurn + 1, drawBase, knowledge: setMissing(state, seat, []) }, events };
}

function applyKnock(state: DominoState, seat: Seat): ApplyResult {
  if (state.chain.length === 0 || hasPlay(state.hands[seat], state.chain)) return fail('mustPlay');
  if (state.bazaar.length > 0) return fail('mustDraw');
  const ends = endPips(state.chain);
  // Стук: в руке нет чисел концов. Без добора в этом ходу прежние выводы тоже верны.
  const knowledge = setMissing(state, seat, state.drawnThisTurn > 0 ? ends : union(state.knowledge.missing[seat], ends));
  const next: DominoState = { ...state, knowledge, turn: otherSeat(seat), drawnThisTurn: 0, drawBase: [] };
  return checkFish(next, [{ type: 'knocked', seat }]);
}

/** «Рыба» (§6.2): базар пуст и ни у одного игрока нет легального хода. Проверяется в том же шаге. */
export function isFish(state: Pick<DominoState, 'bazaar' | 'hands' | 'chain'>): boolean {
  return state.chain.length > 0 && state.bazaar.length === 0 && !hasPlay(state.hands[0], state.chain) && !hasPlay(state.hands[1], state.chain);
}

function checkFish(state: DominoState, events: DominoEvent[]): ApplyResult {
  if (!isFish(state)) return { ok: true, state, events };
  const p: [number, number] = [handPips(state.hands[0]), handPips(state.hands[1])];
  const result: HandResult = p[0] === p[1] ? { kind: 'fishDraw', pips: p } : { kind: 'fish', winner: p[0] < p[1] ? 0 : 1, points: Math.max(p[0], p[1]), pips: p };
  return finishHand(state, result, events);
}

function finishHand(state: DominoState, result: HandResult, events: DominoEvent[]): ApplyResult {
  const score: [number, number] = [state.score[0], state.score[1]];
  if (result.kind === 'domino') events.push({ type: 'domino', winner: result.winner, points: result.points });
  else events.push({ type: 'fish', winner: result.kind === 'fish' ? result.winner : null, points: result.kind === 'fish' ? result.points : 0, pips: result.pips });
  if (result.kind !== 'fishDraw') score[result.winner] += result.points;
  events.push({ type: 'handOver', result, score });
  const winner = result.kind === 'fishDraw' ? null : result.winner;
  if (winner !== null && score[winner] >= state.target) {
    events.push({ type: 'matchOver', winner, score });
    return { ok: true, state: { ...state, score, handResult: result, phase: 'matchOver', matchWinner: winner }, events };
  }
  return { ok: true, state: { ...state, score, handResult: result, phase: 'handOver' }, events };
}

/** Следующая раздача матча (§3): заходит победитель любой костью; после ничейной «рыбы» — снова по дублю. */
export function nextHand(state: DominoState): { ok: true; state: DominoState } | { ok: false; error: DominoError } {
  if (state.phase !== 'handOver' || !state.handResult) return { ok: false, error: state.phase === 'matchOver' ? 'matchOver' : 'notHandOver' };
  const r = state.handResult;
  const starter: StarterRule = r.kind === 'fishDraw' ? { kind: 'byDouble' } : { kind: 'winner', seat: r.winner };
  return { ok: true, state: dealHand(state.rng, starter, { score: state.score, target: state.target, handNumber: state.handNumber + 1 }) };
}
