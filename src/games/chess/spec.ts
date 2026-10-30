// Шахматы для общего сеанса доски (src/board/session.ts): ходы как пути, анимации, фигуры, итог, обучение.
import type { MoveAnim } from '../../board/scene';
import type { BoardGameSpec, MovePath, TutorialStepDef } from '../../board/session';
import { KHARITON_LINES } from '../../characters/khariton/lines';
import { KHARITON_MOTION } from '../../characters/khariton/motions';
import type { AiLevel } from './ai';
import { createChessMatch } from './match';
import { reactionFor } from './reactions';
import { colorOf, kindOf, type Color, type Kind } from './rules/board';
import type { ChessAction, ChessError, ChessEvent } from './rules/engine';
import type { ChessState } from './rules/state';
import { pieceKey } from './scene/pieceArt';
import type { PlayerView } from './view';

const VALUE: Readonly<Record<Kind, number>> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const START: Readonly<Record<Kind, number>> = { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 };

export const chessPieces = (v: Pick<PlayerView, 'board'>): (string | null)[] => v.board.map((p) => (p ? pieceKey(colorOf(p), kindOf(p)) : null));

export function chessPaths(actions: readonly ChessAction[], v: PlayerView): MovePath<ChessAction>[] {
  const out: MovePath<ChessAction>[] = [];
  for (const a of actions) {
    if (a.type !== 'move') continue;
    const m = a.move;
    const piece = v.board[m.from];
    const target = v.board[m.to];
    const ep = !!piece && kindOf(piece) === 'p' && m.to === v.ep && !target;
    const captures = target ? [m.to] : ep ? [m.to + (v.turn === 'w' ? -8 : 8)] : [];
    out.push({ action: a, path: [m.from, m.to], captures, ...(m.promotion ? { promotion: m.promotion } : {}) });
  }
  return out;
}

export function chessAnim(events: readonly ChessEvent[], _v: PlayerView, capturer: 'human' | 'opponent'): MoveAnim | null {
  const e = events.find((x) => x.type === 'moved');
  if (!e || e.type !== 'moved') return null;
  return {
    path: [e.move.from, e.move.to],
    captures: e.captureSquare !== null ? [e.captureSquare] : [],
    ...(e.castle ? { rook: { from: e.castle.rookFrom, to: e.castle.rookTo } } : {}),
    ...(e.promotion ? { promoteTo: pieceKey(e.color, kindOf(e.promotion)) } : {}),
    capturer,
  };
}

/** Взятые фигуры: недостача против начальной расстановки (превращённые пешки учтены). */
export function chessTrays(v: Pick<PlayerView, 'board'>, human: Color): { human: string[]; opponent: string[] } {
  const missing = (c: Color): string[] => {
    const n: Record<Kind, number> = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };
    for (const p of v.board) if (p && colorOf(p) === c) n[kindOf(p)]++;
    let promoted = 0;
    for (const k of ['n', 'b', 'r', 'q'] as const) promoted += Math.max(0, n[k] - START[k]);
    const out: string[] = [];
    for (const k of ['q', 'r', 'b', 'n'] as const) for (let i = n[k]; i < START[k]; i++) out.push(pieceKey(c, k));
    for (let i = n.p + promoted; i < START.p; i++) out.push(pieceKey(c, 'p'));
    return out;
  };
  const opp: Color = human === 'w' ? 'b' : 'w';
  return { human: missing(opp), opponent: missing(human) };
}

export function chessLead(v: Pick<PlayerView, 'board'>, side: Color): number {
  let s = 0;
  for (const p of v.board) if (p) s += (colorOf(p) === side ? 1 : -1) * VALUE[kindOf(p)];
  return s;
}

const kingSquare = (v: PlayerView, c: Color) => v.board.findIndex((p) => p === (c === 'w' ? 'K' : 'k'));

const TUTORIAL: readonly TutorialStepDef<PlayerView, ChessAction>[] = [
  { id: 'intro', line: 'tutIntro', when: () => true },
  { id: 'move', line: 'tutMove', when: (c) => c.paths.length > 0 },
  { id: 'check', line: 'tutCheck', when: (c) => c.inCheck },
  { id: 'capture', line: 'tutCapture', when: (c) => c.paths.some((m) => m.captures.length > 0) },
  { id: 'goal', line: 'tutGoal', when: (c) => c.humanMoves >= 3 },
  { id: 'done', line: 'tutDone', when: (c) => c.humanMoves >= 7 },
];

export const CHESS_SPEC: BoardGameSpec<ChessState, ChessAction, ChessEvent, PlayerView, ChessError, AiLevel> = {
  id: 'chess',
  prefix: 'chess',
  lines: KHARITON_LINES,
  metKey: 'metKhariton',
  tutorialKey: 'chessTutorialDone',
  motion: KHARITON_MOTION,
  // Клён и орех; рамка — тёмное дерево с бликом.
  skin: { light: 0xefd9b1, dark: 0x9a6236, frame: 0x6e4126, frameHi: 0xc88d58, sideL: 0x5c3520, sideR: 0x452715, label: 0xf3dfbd, labels: true },
  gestures: { win: 'eureka', lose: 'bow', draw: 'shrug', praise: 'applause' },
  match: createChessMatch,
  pieces: chessPieces,
  paths: chessPaths,
  anim: chessAnim,
  lastMove: (v) => (v.lastMove ? [v.lastMove.from, v.lastMove.to] : []),
  check: (v) => (v.check && v.phase === 'play' ? kingSquare(v, v.turn) : null),
  trays: chessTrays,
  lead: chessLead,
  reaction: reactionFor,
  reason: (v) => v.result?.kind ?? null,
  mandatoryCapture: false,
  tutorial: TUTORIAL,
  // Записи Харитона длинные (в среднем 3,7 с, до 7 с), интервал считается от начала реплики — между фразами нужна пауза (D63).
  minGapMs: 9000,
};
