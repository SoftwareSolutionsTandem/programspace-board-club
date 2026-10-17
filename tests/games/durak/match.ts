// Партия ИИ против ИИ для тестов и замеров силы уровней.
import { createRng, type RngState } from '../../../src/core/rng';
import { decide, type AiLevel, type Personality, NEUTRAL } from '../../../src/games/durak/ai';
import { actor, apply } from '../../../src/games/durak/rules/engine';
import { newGame } from '../../../src/games/durak/rules/setup';
import { projectView } from '../../../src/games/durak/view';
import type { DurakResult } from '../../../src/games/durak/rules/state';

export interface Side { level: AiLevel; personality?: Personality }

export function playMatch(seed: number, sides: [Side, Side]): DurakResult {
  let s = newGame(createRng(seed));
  const rngs: [RngState, RngState] = [createRng(seed * 7 + 1), createRng(seed * 13 + 2)];
  for (let steps = 0; s.phase !== 'gameOver'; steps++) {
    if (steps > 3000) throw new Error('партия ИИ не завершилась');
    const seat = actor(s)!;
    const side = sides[seat];
    const d = decide(projectView(s, seat), side.level, side.personality ?? NEUTRAL, rngs[seat]);
    rngs[seat] = d.rng;
    const r = apply(s, d.action);
    if (!r.ok) throw new Error(`ИИ сделал недопустимый ход: ${r.error}`);
    s = r.state;
  }
  return s.result!;
}

/** Доля очков стороны A (победа 1, ничья 0,5), стороны чередуют места. */
export function scoreA(a: Side, b: Side, games: number, seed0 = 0): number {
  let pts = 0;
  for (let g = 0; g < games; g++) {
    const aSeat = g % 2;
    const sides: [Side, Side] = aSeat === 0 ? [a, b] : [b, a];
    const r = playMatch(seed0 + g, sides);
    pts += 'draw' in r ? 0.5 : r.winner === aSeat ? 1 : 0;
  }
  return pts / games;
}
