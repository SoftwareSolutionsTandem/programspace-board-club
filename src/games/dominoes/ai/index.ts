// ИИ соперника в домино. Вход — только PlayerView и собственный ГСЧ ИИ (не ГСЧ тасования), выход — действие.
import { nextFloat, nextInt, type RngState } from '../../../core/rng';
import { pips, type Seat } from '../rules/bones';
import { sampleWorld, worldActor, worldApply, worldLegal, worldResult, worldView, type World } from '../sim';
import { legalActionsForView, type DominoAction, type PlayerView } from '../view';
import { heuristicMove, NEUTRAL, type Personality } from './heuristics';

export type AiLevel = 'easy' | 'normal' | 'hard';
export type { Personality };
export { NEUTRAL };

export interface AiDecision {
  readonly action: DominoAction;
  readonly rng: RngState;
}

/** Характер Деда Матвея (docs/games/dominoes.md §12): охотно закрывает числа, тяжёлое сбрасывает без спешки. */
export const MATVEY: Personality = { heavyDump: 0.9, blocking: 1.6, doubleEager: 1.2 };

export function decide(view: PlayerView, level: AiLevel, personality: Personality, rng: RngState): AiDecision {
  const options = legalActionsForView(view);
  if (options.length === 0) throw new Error('ИИ: нет допустимых действий');
  if (options.length === 1) return { action: options[0]!, rng };
  switch (level) {
    case 'easy':
      return easyMove(options, rng);
    case 'normal':
      return { action: heuristicMove(view, options, personality), rng };
    case 'hard':
      return searchMove(view, options, personality, rng);
  }
}

/** Лёгкий уровень: настоящие ошибки — половина ходов случайна, иначе просто сбрасывает тяжёлое. */
function easyMove(options: readonly DominoAction[], rng: RngState): AiDecision {
  const [roll, r1] = nextFloat(rng);
  if (roll < 0.5) {
    const [i, r2] = nextInt(r1, options.length);
    return { action: options[i]!, rng: r2 };
  }
  let best = options[0]!;
  for (const a of options) if (a.type === 'play' && best.type === 'play' && pips(a.bone) > pips(best.bone)) best = a;
  return { action: best, rng: r1 };
}

const WORLDS = 16;
const MAX_ROLLOUT_STEPS = 80;

/** Доигрывание раздачи эвристиками обеих сторон; итог — очки раздачи с точки зрения seat. */
function rollout(w: World, seat: Seat): number {
  let world = w;
  for (let i = 0; i < MAX_ROLLOUT_STEPS; i++) {
    const who = worldActor(world);
    if (who === null) break;
    const v = worldView(world, who);
    world = worldApply(world, heuristicMove(v, worldLegal(world), NEUTRAL));
  }
  const r = worldResult(world);
  if (!r || r.kind === 'fishDraw') return 0;
  return r.winner === seat ? r.points : -r.points;
}

/**
 * Сильный уровень: детерминизация. Невидимые кости раскладываются случайно с учётом честных выводов (§10);
 * каждый ход оценивается доигрыванием раздачи в нескольких мирах. Равенство — по эвристике характера.
 */
function searchMove(view: PlayerView, options: readonly DominoAction[], p: Personality, rng: RngState): AiDecision {
  let r = rng;
  const worlds: World[] = [];
  for (let i = 0; i < WORLDS; i++) {
    const [w, next] = sampleWorld(view, r);
    worlds.push(w);
    r = next;
  }
  const preferred = heuristicMove(view, options, p);
  let best = preferred;
  let bestValue = -Infinity;
  for (const a of options) {
    let total = 0;
    for (const w of worlds) total += rollout(worldApply(w, a), view.seat);
    const value = total / worlds.length + (a === preferred ? 0.01 : 0);
    if (value > bestValue) {
      best = a;
      bestValue = value;
    }
  }
  return { action: best, rng: r };
}
