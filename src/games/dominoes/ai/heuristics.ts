// Эвристики среднего уровня (docs/games/dominoes.md §12). Вход — только PlayerView.
import { hasPip, isDouble, pips, sameBone, type Bone } from '../rules/bones';
import { attach, chainEnds, fittingEnds } from '../rules/chain';
import type { DominoAction, PlayerView } from '../view';

/** Характер соперника: веса эвристик. Нейтральный — 1. */
export interface Personality {
  /** Охота сбрасывать тяжёлые кости. */
  readonly heavyDump: number;
  /** Охота закрывать сопернику числа, которых у него нет. */
  readonly blocking: number;
  /** Охота выкладывать дубли пораньше. */
  readonly doubleEager: number;
}

export const NEUTRAL: Personality = { heavyDump: 1, blocking: 1, doubleEager: 1 };

/** Оценка выкладки: больше — лучше. */
export function scorePlay(view: PlayerView, b: Bone, end: 'left' | 'right', p: Personality): number {
  const rest = view.hand.filter((x) => !sameBone(x, b));
  const chain = attach(view.chain, b, end);
  const ends = chainEnds(chain)!;
  let s = p.heavyDump * (pips(b) / 12) * 3;
  if (isDouble(b)) s += p.doubleEager * 1.5;
  // Разнообразие чисел в руке — меньше риск остаться без хода.
  s += new Set(rest.flatMap((x) => [x.hi, x.lo])).size * 0.4;
  // Будет ли у меня ход на новые концы.
  s += rest.filter((x) => fittingEnds(x, chain).length > 0).length * 0.6;
  for (const n of ends) {
    // Честный вывод (§10): у соперника нет этих чисел — конец для него закрыт.
    if (view.opponentMissing.includes(n)) s += p.blocking * 1.5;
    else if (view.opponentHandCount <= 2) s -= 0.5;
  }
  // Не оставлять себе одинокое число, которое уже почти всё на столе.
  const onTable = (n: number) => view.chain.filter((x) => hasPip(x.bone, n)).length;
  for (const x of rest) if (!isDouble(x) && onTable(x.hi) >= 6 && onTable(x.lo) >= 6) s -= 0.3;
  return s;
}

/** Лучший ход по эвристикам; при равенстве — первый по порядку (детерминированно). */
export function heuristicMove(view: PlayerView, options: readonly DominoAction[], p: Personality): DominoAction {
  let best = options[0]!;
  let bestScore = -Infinity;
  for (const a of options) {
    if (a.type !== 'play') return a;
    const s = view.chain.length === 0 ? pips(a.bone) + (isDouble(a.bone) ? 2 : 0) : scorePlay(view, a.bone, a.end, p);
    if (s > bestScore) {
      best = a;
      bestScore = s;
    }
  }
  return best;
}
