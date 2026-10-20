// Проекция состояния для одного места (docs/games/dominoes.md §10): только то, что этот игрок видит или честно выводит.
// И интерфейс, и ИИ работают только с PlayerView; кости соперника и порядок базара сюда не попадают.
import { otherSeat, sameBone, type Bone, type Pip, type Seat } from './rules/bones';
import { chainEnds, playsFor } from './rules/chain';
import type { DominoAction } from './rules/engine';
import type { DominoState, HandResult, Opening, Phase, Placed } from './rules/state';

export interface PlayerView {
  readonly seat: Seat;
  readonly hand: readonly Bone[];
  readonly opponentHandCount: number;
  /** Числа, которых у соперника точно нет: по его добору и стуку (§10). */
  readonly opponentMissing: readonly Pip[];
  /** Что соперник знает о моей руке. */
  readonly myMissing: readonly Pip[];
  readonly chain: readonly Placed[];
  readonly ends: readonly [Pip, Pip] | null;
  readonly bazaarCount: number;
  readonly turn: Seat;
  readonly phase: Phase;
  /** Правило первого хода раздачи; дубль или тяжёлая кость показаны обоим (§3). */
  readonly opening: Opening;
  /** Сколько костей текущий игрок взял из базара в этом ходу — видно обоим. */
  readonly drawnThisTurn: number;
  readonly score: readonly [number, number];
  readonly target: number;
  readonly handNumber: number;
  readonly handResult: HandResult | null;
  readonly matchWinner: Seat | null;
  /** Кости соперника открываются только после конца раздачи — для подсчёта очков (§6, §11). Во время раздачи — null. */
  readonly opponentRevealed: readonly Bone[] | null;
}

const copyBone = (b: Bone): Bone => ({ hi: b.hi, lo: b.lo });

export function projectView(state: DominoState, seat: Seat): PlayerView {
  const opp = otherSeat(seat);
  const o = state.opening;
  // Глубокие копии: никаких ссылок на объекты полного состояния.
  return {
    seat,
    hand: state.hands[seat].map(copyBone),
    opponentHandCount: state.hands[opp].length,
    opponentMissing: [...state.knowledge.missing[opp]],
    myMissing: [...state.knowledge.missing[seat]],
    chain: state.chain.map((p) => ({ bone: copyBone(p.bone), left: p.left, right: p.right })),
    ends: chainEnds(state.chain),
    bazaarCount: state.bazaar.length,
    turn: state.turn,
    phase: state.phase,
    opening: o.kind === 'winner' ? { kind: 'winner', seat: o.seat } : { kind: o.kind, seat: o.seat, bone: copyBone(o.bone) },
    drawnThisTurn: state.drawnThisTurn,
    score: [state.score[0], state.score[1]],
    target: state.target,
    handNumber: state.handNumber,
    handResult: state.handResult,
    matchWinner: state.matchWinner,
    opponentRevealed: state.phase === 'play' ? null : state.hands[opp].map(copyBone),
  };
}

export type { DominoAction };

/** Допустимые действия, вычисленные только по проекции (совпадают с legalActions полного состояния для своего хода). */
export function legalActionsForView(view: PlayerView): DominoAction[] {
  if (view.phase !== 'play' || view.turn !== view.seat) return [];
  const seat = view.seat;
  if (view.chain.length === 0) {
    const o = view.opening;
    const allowed = o.kind === 'winner' ? view.hand : view.hand.filter((b) => sameBone(b, o.bone));
    return allowed.map((b) => ({ type: 'play', seat, bone: b, end: 'left' }));
  }
  const plays = playsFor(view.hand, view.chain);
  if (plays.length) return plays.map((p) => ({ type: 'play', seat, bone: p.bone, end: p.end }));
  return view.bazaarCount ? [{ type: 'draw', seat }] : [{ type: 'knock', seat }];
}
