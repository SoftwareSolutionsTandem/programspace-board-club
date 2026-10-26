// Партия в шахматы против Харитона: правила, проекция и ИИ через общий контроллер доски.
import { BoardMatch, type BoardRules } from '../../board/match';
import { decide, KHARITON, type AiLevel } from './ai';
import { actor, apply, legalActions, newGame, type ChessAction, type ChessError, type ChessEvent } from './rules/engine';
import type { ChessState } from './rules/state';
import { projectView, type PlayerView } from './view';

export const CHESS_RULES: BoardRules<ChessState, ChessAction, ChessEvent, PlayerView, ChessError, AiLevel> = {
  newGame: () => newGame(),
  apply,
  actor,
  legal: legalActions,
  view: projectView,
  decide: (v, level, rng) => decide(v, level, KHARITON, rng),
  winner: (s) => (s.result ? s.result.winner : undefined),
  resign: (color) => ({ type: 'resign', color }),
};

export type ChessMatch = BoardMatch<ChessState, ChessAction, ChessEvent, PlayerView, ChessError, AiLevel>;
export const createChessMatch = (opts: { seed: number; level: AiLevel }): ChessMatch => new BoardMatch(CHESS_RULES, opts);
