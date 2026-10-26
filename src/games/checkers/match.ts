// Партия в шашки против Костяна: правила, проекция и ИИ через общий контроллер доски.
import { BoardMatch, type BoardRules } from '../../board/match';
import { decide, KOSTYAN, type AiLevel } from './ai';
import { actor, apply, legalActions, newGame, type CheckersAction, type CheckersError, type CheckersEvent } from './rules/engine';
import type { CheckersState } from './rules/state';
import { projectView, type PlayerView } from './view';

export const CHECKERS_RULES: BoardRules<CheckersState, CheckersAction, CheckersEvent, PlayerView, CheckersError, AiLevel> = {
  newGame: () => newGame(),
  apply,
  actor,
  legal: legalActions,
  view: projectView,
  decide: (v, level, rng) => decide(v, level, KOSTYAN, rng),
  winner: (s) => (s.result ? s.result.winner : undefined),
  resign: (color) => ({ type: 'resign', color }),
};

export type CheckersMatch = BoardMatch<CheckersState, CheckersAction, CheckersEvent, PlayerView, CheckersError, AiLevel>;
export const createCheckersMatch = (opts: { seed: number; level: AiLevel }): CheckersMatch => new BoardMatch(CHECKERS_RULES, opts);
