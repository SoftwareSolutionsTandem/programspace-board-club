// Выбор и выкладка костей игроком: касание, перетаскивание и клавиши → действие или подсказка.
// Чистые функции поверх PlayerView и списка допустимых действий: интерфейс правил не решает.
import { boneCode, type Bone, type Pip } from './rules/bones';
import type { End } from './rules/state';
import type { DominoAction, PlayerView } from './view';

export type HintCode = 'notYourTurn' | 'doesNotFit' | 'mustPlayOpening' | 'noMove' | 'pickEnd';

export interface Outcome {
  readonly action?: DominoAction;
  /** Кость подходит к обоим концам — нужно выбрать конец. */
  readonly pick?: { readonly code: string; readonly ends: readonly End[] };
  readonly hint?: HintCode;
}

const playsOf = (legal: readonly DominoAction[], code: string) =>
  legal.filter((a): a is Extract<DominoAction, { type: 'play' }> => a.type === 'play' && boneCode(a.bone) === code);

/** Касание кости руки. */
export function tapBone(view: PlayerView, legal: readonly DominoAction[], code: string): Outcome {
  if (view.turn !== view.seat || view.phase !== 'play' || legal.length === 0) return { hint: 'notYourTurn' };
  const plays = playsOf(legal, code);
  if (plays.length === 0) {
    if (!legal.some((a) => a.type === 'play')) return { hint: 'noMove' };
    if (view.chain.length === 0) return { hint: 'mustPlayOpening' };
    return { hint: 'doesNotFit' };
  }
  // Одинаковые числа на концах: всё равно, куда ставить, — ставим справа без вопроса.
  if (plays.length === 1 || (view.ends && view.ends[0] === view.ends[1])) return { action: plays.at(-1)! };
  return { pick: { code, ends: plays.map((p) => p.end) } };
}

/** Выбор конца для кости, ожидающей выбора. */
export function tapEnd(legal: readonly DominoAction[], code: string, end: End): Outcome {
  const a = playsOf(legal, code).find((p) => p.end === end);
  return a ? { action: a } : { hint: 'doesNotFit' };
}

/** Кость брошена у конца цепочки (end) или просто на стол (null — как касание). */
export function dropBone(view: PlayerView, legal: readonly DominoAction[], code: string, end: End | null): Outcome {
  if (end === null) return tapBone(view, legal, code);
  const plays = playsOf(legal, code);
  if (plays.length === 0) return tapBone(view, legal, code);
  return tapEnd(legal, code, end);
}

/** Кости, которые сейчас можно выложить. */
export function playableCodes(legal: readonly DominoAction[]): Set<string> {
  return new Set(legal.flatMap((a) => (a.type === 'play' ? [boneCode(a.bone)] : [])));
}

/** Числа открытых концов — для подсказки «нужно число …». */
export function endNumbers(view: PlayerView): Pip[] {
  return view.ends ? [...new Set(view.ends)] : [];
}

/** Порядок костей в руке: по старшей половине, затем по младшей — так легче искать нужное число. */
export function sortBones(hand: readonly Bone[]): Bone[] {
  return [...hand].sort((a, b) => a.hi - b.hi || a.lo - b.lo);
}
