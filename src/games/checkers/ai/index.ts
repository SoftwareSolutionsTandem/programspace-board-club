// ИИ соперника в шашках (docs/games/checkers.md §7). Вход — только PlayerView и собственный ГСЧ ИИ, выход — ход.
// Альфа-бета с итеративным углублением; пока есть обязательное взятие, поиск не обрывается (иначе оценка врёт).
// Бюджет узлов вместо часов — решения детерминированы. Уровни различаются глубиной, бюджетом и «шумом».
import { nextFloat, nextInt, type RngState } from '../../../core/rng';
import { boardKey, colorOf, isKing, other, rankOf, type Board, type Color } from '../rules/board';
import { captureMoves, legalMoves, makeMove, type Move } from '../rules/movegen';
import { legalActionsForView, type CheckersAction, type PlayerView } from '../view';

export type AiLevel = 'easy' | 'normal' | 'hard';

export interface Personality {
  /** Вес продвижения простых к дамочному полю. */
  readonly advance: number;
  /** Склонность к разменам при перевесе (за каждую шашку меньше на доске). */
  readonly trade: number;
}

/** Характер Костяна: прёт вперёд и охотно меняется, когда впереди (docs/CHARACTERS.md). */
export const KOSTYAN: Personality = { advance: 7, trade: 6 };
export const NEUTRAL: Personality = { advance: 4, trade: 2 };

export interface AiDecision {
  readonly action: CheckersAction;
  readonly rng: RngState;
}

interface LevelSpec {
  readonly depth: number;
  readonly budget: number;
  readonly noise: number;
  readonly slip: number;
  readonly margin: number;
}

export const LEVELS: Readonly<Record<AiLevel, LevelSpec>> = {
  easy: { depth: 2, budget: 3000, noise: 60, slip: 0.3, margin: 150 },
  normal: { depth: 5, budget: 12000, noise: 12, slip: 0.08, margin: 40 },
  hard: { depth: 8, budget: 30000, noise: 0, slip: 0, margin: 0 },
};

const WIN = 100000;
const MAN = 100, KING = 320;
// Центр доски ценнее краёв.
const CENTER = Array.from({ length: 64 }, (_, s) => {
  const f = s & 7, r = s >> 3;
  return 6 - Math.round(Math.abs(3.5 - f) + Math.abs(3.5 - r));
});

/** Оценка с точки зрения стороны me. */
function evaluate(board: Board, me: Color, p: Personality): number {
  let score = 0, mine = 0, theirs = 0;
  for (let s = 0; s < 64; s++) {
    const x = board[s];
    if (!x) continue;
    const c = colorOf(x);
    let v: number;
    if (isKing(x)) v = KING + CENTER[s]!;
    else {
      const progress = c === 'w' ? rankOf(s) : 7 - rankOf(s);
      v = MAN + progress * p.advance + CENTER[s]!;
      // Простые на своей первой горизонтали не пускают в дамки.
      if (progress === 0) v += 8;
    }
    if (c === me) {
      score += v;
      mine += v;
    } else {
      score -= v;
      theirs += v;
    }
  }
  // При перевесе — меньше шашек на доске лучше (размены выгодны).
  const pieces = board.filter(Boolean).length;
  if (mine > theirs + 50) score += (24 - pieces) * p.trade;
  else if (theirs > mine + 50) score -= (24 - pieces) * p.trade;
  return score;
}

class Search {
  nodes = 0;
  stopped = false;
  constructor(readonly budget: number, readonly p: Personality, readonly me: Color, readonly seen: Set<string>) {}

  negamax(board: Board, turn: Color, depth: number, alpha: number, beta: number, ply: number): number {
    if (this.nodes >= this.budget) {
      this.stopped = true;
      return 0;
    }
    this.nodes++;
    const caps = captureMoves(board, turn);
    const ms = caps.length ? caps : depth > 0 ? legalMoves(board, turn) : [];
    if (caps.length === 0 && depth <= 0) {
      // Тихая позиция на краю поиска — статическая оценка (но проигрыш без ходов виден и тут).
      if (legalMoves(board, turn).length === 0) return -WIN + ply;
      const e = evaluate(board, this.me, this.p);
      return turn === this.me ? e : -e;
    }
    if (ms.length === 0) return -WIN + ply;
    const key = boardKey(board, turn);
    if (ply > 0 && this.seen.has(key)) return 0;
    if (ply > 40) {
      const e = evaluate(board, this.me, this.p);
      return turn === this.me ? e : -e;
    }
    this.seen.add(key);
    // Длинные взятия — вперёд.
    const ordered = ms.length > 1 ? [...ms].sort((a, b) => b.captures.length - a.captures.length) : ms;
    let best = -WIN - 1;
    for (const m of ordered) {
      const v = -this.negamax(makeMove(board, m).board, other(turn), depth - 1, -beta, -alpha, ply + 1);
      if (this.stopped) break;
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    this.seen.delete(key);
    return best;
  }
}

const sameMove = (a: Move, b: Move) => a.path.length === b.path.length && a.path.every((s, i) => s === b.path[i]);

export function decide(view: PlayerView, level: AiLevel, personality: Personality, rng: RngState): AiDecision {
  const options = legalActionsForView(view);
  if (options.length === 0) throw new Error('ИИ: нет допустимых ходов');
  if (options.length === 1) return { action: options[0]!, rng };
  const spec = LEVELS[level];
  const ms = options.flatMap((a) => (a.type === 'move' ? [a.move] : []));
  const exact = spec.noise > 0 || spec.slip > 0;
  // Позиции, уже бывшие в партии (после последнего необратимого хода): повтор ведёт к ничьей.
  const search = new Search(spec.budget, personality, view.color, new Set(view.history));
  let scored = ms.map((m) => ({ m, value: 0 }));
  let first: Move | null = null;
  for (let d = 1; d <= spec.depth; d++) {
    const sorted = first ? [first, ...ms.filter((m) => !sameMove(m, first!))] : ms;
    const out: { m: Move; value: number }[] = [];
    let alpha = -WIN - 1;
    for (const m of sorted) {
      const v = -search.negamax(makeMove(view.board, m).board, other(view.color), d - 1, -WIN - 1, exact ? WIN + 1 : -alpha, 1);
      if (search.stopped) break;
      if (v > alpha) alpha = v;
      out.push({ m, value: v });
    }
    if (search.stopped) break;
    scored = out;
    first = out.reduce((a, b) => (b.value > a.value ? b : a)).m;
  }
  let r = rng;
  const ranked = scored.map((s) => {
    let v = s.value;
    if (spec.noise) {
      const [x, n] = nextFloat(r);
      r = n;
      v += Math.round((x - 0.5) * 2 * spec.noise);
    }
    return { m: s.m, value: v };
  });
  ranked.sort((a, b) => b.value - a.value);
  let pick = ranked[0]!.m;
  const [roll, r2] = nextFloat(r);
  r = r2;
  if (roll < spec.slip) {
    const top = ranked[0]!.value;
    const sane = ranked.filter((x) => x.value >= top - spec.margin).slice(0, 3);
    const [i, r3] = nextInt(r, sane.length);
    r = r3;
    pick = sane[i]!.m;
  }
  return { action: { type: 'move', color: view.color, move: pick }, rng: r };
}

export { boardKey };
