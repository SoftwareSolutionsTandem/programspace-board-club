// Состояние матча домино (docs/games/dominoes.md §8). Полное состояние ИИ недоступно — он видит только PlayerView.
import type { RngState } from '../../../core/rng';
import type { Bone, Pip, Seat } from './bones';

/** Кость в цепочке: left — число, обращённое к левому концу, right — к правому. У дубля они равны. */
export interface Placed {
  readonly bone: Bone;
  readonly left: Pip;
  readonly right: Pip;
}

export type End = 'left' | 'right';

/** Чем должен быть первый ход раздачи (§3). */
export type Opening =
  | { readonly kind: 'lowestDouble'; readonly seat: Seat; readonly bone: Bone }
  | { readonly kind: 'heaviest'; readonly seat: Seat; readonly bone: Bone }
  | { readonly kind: 'winner'; readonly seat: Seat };

export type HandResult =
  | { readonly kind: 'domino'; readonly winner: Seat; readonly points: number }
  | { readonly kind: 'fish'; readonly winner: Seat; readonly points: number; readonly pips: readonly [number, number] }
  | { readonly kind: 'fishDraw'; readonly pips: readonly [number, number] };

export type Phase = 'play' | 'handOver' | 'matchOver';

/** Что известно обоим о руках (§10): числа, которых у места точно нет — по добору из базара и стуку. */
export interface PublicKnowledge {
  readonly missing: readonly [readonly Pip[], readonly Pip[]];
}

export interface DominoState {
  /** ГСЧ матча: только для тасования. */
  readonly rng: RngState;
  readonly hands: readonly [readonly Bone[], readonly Bone[]];
  /** Базар: [0] берётся первым. */
  readonly bazaar: readonly Bone[];
  readonly chain: readonly Placed[];
  readonly turn: Seat;
  readonly phase: Phase;
  readonly opening: Opening;
  /** Сколько костей текущий игрок уже взял из базара в этом ходу (добор до первой подходящей, §4). */
  readonly drawnThisTurn: number;
  /** Числа, которых у текущего игрока точно нет с начала добора в этом ходу (база вывода §10). */
  readonly drawBase: readonly Pip[];
  readonly knowledge: PublicKnowledge;
  readonly score: readonly [number, number];
  readonly target: number;
  readonly handNumber: number;
  readonly handResult: HandResult | null;
  /** Победитель матча — после конца матча (§7). */
  readonly matchWinner: Seat | null;
}
