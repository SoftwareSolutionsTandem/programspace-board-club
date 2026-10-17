// ИИ соперника. Вход — только PlayerView и собственный ГСЧ ИИ (не ГСЧ колоды), выход — действие.
import { nextFloat, nextInt, type RngState } from '../../../core/rng';
import { sampleWorld, worldActor, worldApply, worldLegal, worldResult, worldView } from '../sim';
import { legalActionsForView, type DurakAction, type PlayerView } from '../view';
import { heuristicMove, NEUTRAL, type Personality } from './heuristics';

export type AiLevel = 'easy' | 'normal' | 'hard';
export type { Personality };
export { NEUTRAL };

export interface AiDecision {
  readonly action: DurakAction;
  readonly rng: RngState;
}

/** Характер Агаты (docs/games/durak.md §11): копит козыри, охотно подкидывает, когда у игрока мало карт. */
export const AGATA: Personality = { trumpHoard: 1.35, throwEagerness: 2 };

export function decide(view: PlayerView, level: AiLevel, personality: Personality, rng: RngState): AiDecision {
  const options = legalActionsForView(view);
  if (options.length === 0) throw new Error('ИИ: нет допустимых действий');
  if (options.length === 1) return { action: options[0]!, rng };
  switch (level) {
    case 'easy':
      return easyMove(view, options, personality, rng);
    case 'normal':
      return { action: heuristicMove(view, options, personality), rng };
    case 'hard':
      return searchMove(view, options, personality, rng);
  }
}

/**
 * Лёгкий уровень: реальные ошибки, а не задержки. Козыри не бережёт, иногда делает
 * случайный законный ход, никогда не подкидывает вдогонку взявшему.
 */
function easyMove(view: PlayerView, options: readonly DurakAction[], p: Personality, rng: RngState): AiDecision {
  const careless: Personality = { trumpHoard: 0.35, throwEagerness: 0 };
  const [roll, r1] = nextFloat(rng);
  if (view.phase === 'throwInAfterTake') return { action: { type: 'doneThrowing', seat: view.seat }, rng: r1 };
  if (roll < 0.3) {
    const safe = options.filter((a) => a.type !== 'take' || options.length === 1);
    const pool = safe.length ? safe : options;
    const [i, r2] = nextInt(r1, pool.length);
    return { action: pool[i]!, rng: r2 };
  }
  void p;
  return { action: heuristicMove(view, options, careless), rng: r1 };
}

const WORLDS = 14;
const MAX_CANDIDATES = 8;
const MAX_PLAYOUT_STEPS = 400;

/**
 * Сильный уровень: детерминизация. Неизвестные карты раскладываются случайно согласно проекции,
 * каждый кандидат доигрывается эвристикой в нескольких мирах; выбирается лучший средний исход.
 */
function searchMove(view: PlayerView, options: readonly DurakAction[], p: Personality, rng: RngState): AiDecision {
  const me = view.seat;
  const candidates = pruneCandidates(view, options, p);
  if (candidates.length === 1) return { action: candidates[0]!, rng };
  const scores = new Array<number>(candidates.length).fill(0);
  let r = rng;
  for (let w = 0; w < WORLDS; w++) {
    const [world, next] = sampleWorld(view, r);
    r = next;
    candidates.forEach((action, i) => {
      let s = worldApply(world, action);
      for (let step = 0; step < MAX_PLAYOUT_STEPS && worldResult(s) === null; step++) {
        const seat = worldActor(s);
        if (seat === null) break;
        const v = worldView(s, seat);
        s = worldApply(s, heuristicMove(v, worldLegal(s, seat), seat === me ? p : NEUTRAL));
      }
      const res = worldResult(s);
      scores[i] = (scores[i] ?? 0) + (res === null || 'draw' in res ? 0.5 : res.winner === me ? 1 : 0);
    });
  }
  let best = 0;
  for (let i = 1; i < candidates.length; i++) if (scores[i]! > scores[best]!) best = i;
  return { action: candidates[best]!, rng: r };
}

/** Ограничиваем перебор: эвристический ход всегда в списке, плюс разнообразные варианты. */
function pruneCandidates(view: PlayerView, options: readonly DurakAction[], p: Personality): DurakAction[] {
  const preferred = heuristicMove(view, options, p);
  const key = (a: DurakAction) => JSON.stringify(a);
  const out = [preferred];
  const seen = new Set([key(preferred)]);
  // Для защиты: «Беру» и по одной лучшей карте на каждую непобитую карту.
  for (const a of options) {
    if (out.length >= MAX_CANDIDATES) break;
    if (!seen.has(key(a))) {
      out.push(a);
      seen.add(key(a));
    }
  }
  return out;
}
