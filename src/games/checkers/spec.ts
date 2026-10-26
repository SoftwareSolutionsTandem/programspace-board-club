// Русские шашки для общего сеанса доски (src/board/session.ts): ходы как пути, анимации, итог, обучение.
import type { MoveAnim } from '../../board/scene';
import type { BoardGameSpec, MovePath, TutorialStepDef } from '../../board/session';
import { KOSTYAN_LINES } from '../../characters/kostyan/lines';
import { KOSTYAN_MOTION } from '../../characters/kostyan/motions';
import type { AiLevel } from './ai';
import { createCheckersMatch } from './match';
import { reactionFor } from './reactions';
import { colorOf, crownRank, isKing, rankOf, type Color, type Piece } from './rules/board';
import type { CheckersAction, CheckersError, CheckersEvent } from './rules/engine';
import type { CheckersState } from './rules/state';
import { pieceKey } from './scene/pieceArt';
import type { PlayerView } from './view';

/** Дамка дальнобойна — стоит заметно больше простой. */
const KING_VALUE = 2.5;

export const checkersPieces = (v: Pick<PlayerView, 'board'>): (string | null)[] => v.board.map((p) => (p ? pieceKey(p) : null));

export function checkersPaths(actions: readonly CheckersAction[]): MovePath<CheckersAction>[] {
  return actions.flatMap((a) => (a.type === 'move' ? [{ action: a, path: [...a.move.path], captures: [...a.move.captures] }] : []));
}

export function checkersAnim(events: readonly CheckersEvent[], _v: PlayerView, capturer: 'human' | 'opponent'): MoveAnim | null {
  const e = events.find((x) => x.type === 'moved');
  if (!e || e.type !== 'moved') return null;
  return { path: [...e.move.path], captures: e.captured.map((c) => c.square), removeAfter: true, ...(e.crowned ? { promoteTo: pieceKey(e.piece.toUpperCase() as Piece) } : {}), capturer };
}

/** Взятые шашки: у каждой стороны по 12 в начале. Дамка в ряду — как простая (её уже нет на доске). */
export function checkersTrays(v: Pick<PlayerView, 'board'>, human: Color): { human: string[]; opponent: string[] } {
  const left = (c: Color) => v.board.filter((p) => p && colorOf(p) === c).length;
  const opp: Color = human === 'w' ? 'b' : 'w';
  return { human: Array.from({ length: 12 - left(opp) }, () => pieceKey(opp)), opponent: Array.from({ length: 12 - left(human) }, () => pieceKey(human)) };
}

export function checkersLead(v: Pick<PlayerView, 'board'>, side: Color): number {
  let s = 0;
  for (const p of v.board) if (p) s += (colorOf(p) === side ? 1 : -1) * (isKing(p) ? KING_VALUE : 1);
  return s;
}

const TUTORIAL: readonly TutorialStepDef<PlayerView, CheckersAction>[] = [
  { id: 'intro', line: 'tutIntro', when: () => true },
  { id: 'move', line: 'tutMove', when: (c) => c.paths.length > 0 },
  { id: 'capture', line: 'tutCapture', when: (c) => c.paths.some((m) => m.captures.length > 0) },
  { id: 'crown', line: 'tutCrown', when: (c) => c.paths.some((m) => m.path.slice(1).some((s) => rankOf(s) === crownRank(c.view.color))) || c.humanMoves >= 5 },
  { id: 'goal', line: 'tutGoal', when: (c) => c.humanMoves >= 3 },
  { id: 'done', line: 'tutDone', when: (c) => c.humanMoves >= 8 },
];

export const CHECKERS_SPEC: BoardGameSpec<CheckersState, CheckersAction, CheckersEvent, PlayerView, CheckersError, AiLevel> = {
  id: 'checkers',
  prefix: 'chk',
  lines: KOSTYAN_LINES,
  metKey: 'metKostyan',
  tutorialKey: 'checkersTutorialDone',
  motion: KOSTYAN_MOTION,
  // Светлая берёза и тёмно-зелёные игровые поля: и кремовые, и вишнёвые шашки на них хорошо видны.
  skin: { light: 0xf1dfb8, dark: 0x3f6b5c, frame: 0x7a4a2a, frameHi: 0xd29a62, sideL: 0x5e3820, sideR: 0x472814, label: 0xf3dfbd, labels: true },
  gestures: { win: 'fistPump', lose: 'handsOnHead', draw: 'shrug', praise: 'respectClap' },
  match: createCheckersMatch,
  pieces: checkersPieces,
  paths: (actions) => checkersPaths(actions),
  anim: checkersAnim,
  lastMove: (v) => (v.lastMove ? [...v.lastMove.path] : []),
  check: () => null,
  trays: checkersTrays,
  lead: checkersLead,
  reaction: reactionFor,
  reason: (v) => v.result?.kind ?? null,
  mandatoryCapture: true,
  tutorial: TUTORIAL,
  minGapMs: 6000,
};
