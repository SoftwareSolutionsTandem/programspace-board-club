// Гипотетические миры для поиска ИИ. Мир строится ТОЛЬКО из PlayerView:
// невидимые кости раскладываются случайно с учётом честных выводов (§10), поэтому настоящие скрытые кости сюда не попадают.
import { shuffle, type RngState } from '../../core/rng';
import { boneCode, createSet, hasPip, otherSeat, type Bone, type Pip, type Seat } from './rules/bones';
import { actor, apply, legalActions, type DominoAction } from './rules/engine';
import type { DominoState, HandResult } from './rules/state';
import { projectView, type PlayerView } from './view';

/** Непрозрачный мир: ИИ может только перечислять ходы, применять их и смотреть проекции. */
export interface World {
  readonly __world: DominoState;
}

const wrap = (s: DominoState): World => ({ __world: s });

/** Кости, местонахождение которых наблюдателю неизвестно: рука соперника и базар. */
export function unseenBones(view: PlayerView): Bone[] {
  const seen = new Set([...view.hand, ...view.chain.map((p) => p.bone)].map(boneCode));
  return createSet().filter((b) => !seen.has(boneCode(b)));
}

/**
 * Случайный мир, согласованный с проекцией: соперник получает только кости без чисел, которых у него точно нет.
 * Такие кости есть всегда — настоящая рука соперника им удовлетворяет.
 */
export function sampleWorld(view: PlayerView, rng: RngState): [World, RngState] {
  const [unseen, r1] = shuffle(rng, unseenBones(view));
  const allowed = unseen.filter((b) => !view.opponentMissing.some((n) => hasPip(b, n)));
  const opp = allowed.slice(0, view.opponentHandCount);
  const oppSet = new Set(opp.map(boneCode));
  const bazaar = unseen.filter((b) => !oppSet.has(boneCode(b)));
  const me = view.seat;
  const hands: [Bone[], Bone[]] = [[], []];
  hands[me] = [...view.hand];
  hands[otherSeat(me)] = opp;
  const missing: [Pip[], Pip[]] = [[], []];
  missing[me] = [...view.myMissing];
  missing[otherSeat(me)] = [...view.opponentMissing];
  const state: DominoState = {
    rng: r1,
    hands,
    bazaar,
    chain: view.chain,
    turn: view.turn,
    phase: view.phase,
    opening: view.opening,
    drawnThisTurn: view.drawnThisTurn,
    drawBase: [],
    knowledge: { missing },
    score: view.score,
    target: view.target,
    handNumber: view.handNumber,
    handResult: view.handResult,
    matchWinner: view.matchWinner,
  };
  return [wrap(state), r1];
}

export const worldActor = (w: World): Seat | null => actor(w.__world);
export const worldLegal = (w: World): DominoAction[] => legalActions(w.__world);
export const worldView = (w: World, seat: Seat): PlayerView => projectView(w.__world, seat);
export const worldResult = (w: World): HandResult | null => w.__world.handResult;

export function worldApply(w: World, a: DominoAction): World {
  const r = apply(w.__world, a);
  if (!r.ok) throw new Error(`мир ИИ: недопустимое действие ${r.error}`);
  return wrap(r.state);
}
