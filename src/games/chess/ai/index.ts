// ИИ соперника в шахматах (docs/games/chess.md §7). Вход — только PlayerView и собственный ГСЧ ИИ, выход — ход.
// Альфа-бета с итеративным углублением, «киллер»-ходами, форсированными взятиями в листьях и бюджетом узлов
// (детерминированно, без часов). Уровни различаются глубиной, бюджетом и «шумом» — слабый ошибается по-настоящему.
import { nextFloat, nextInt, type RngState } from '../../../core/rng';
import { positionKey } from '../rules/board';
import { legalActionsForView, type ChessAction, type Move, type PlayerView } from '../view';
import { evaluate, type EvalWeights } from './evaluate';
import { buffers, FastBoard, fromMove, isCapture, MAX_MOVES, MAX_PLY, mFrom, mPromo, mTo, pieceAt, toMove } from './fastboard';

export type AiLevel = 'easy' | 'normal' | 'hard';

export interface Personality extends EvalWeights {
  /** Склонность объявлять шах, когда ходы почти равны (сантипешки). */
  readonly flair: number;
}

/** Характер Харитона: любит пару слонов и эффектный шах (docs/CHARACTERS.md). */
export const KHARITON: Personality = { bishopPair: 40, flair: 15 };
export const NEUTRAL: Personality = { bishopPair: 30, flair: 0 };

export interface AiDecision {
  readonly action: ChessAction;
  readonly rng: RngState;
}

interface LevelSpec {
  readonly depth: number;
  readonly budget: number;
  /** Разброс случайной добавки к оценке корневых ходов (сантипешки). */
  readonly noise: number;
  /** Вероятность сыграть не лучший, а случайный из трёх лучших… */
  readonly slip: number;
  /** …но только среди ходов, уступающих лучшему не больше чем на margin (сантипешки). */
  readonly margin: number;
}

export const LEVELS: Readonly<Record<AiLevel, LevelSpec>> = {
  easy: { depth: 2, budget: 6000, noise: 120, slip: 0.3, margin: 350 },
  normal: { depth: 4, budget: 40000, noise: 25, slip: 0.08, margin: 90 },
  hard: { depth: 6, budget: 100000, noise: 0, slip: 0, margin: 0 },
};

const MATE = 100000;
/** Цена фигуры по коду быстрой доски (& 7) — для порядка взятий. */
const KIND_VALUE = [0, 100, 320, 330, 500, 900, 0];

class Search {
  nodes = 0;
  stopped = false;
  private readonly bufs = buffers();
  private readonly scores = Array.from({ length: MAX_PLY + 16 }, () => new Int32Array(MAX_MOVES));
  private readonly killers = new Int32Array((MAX_PLY + 16) * 2);
  constructor(readonly b: FastBoard, readonly budget: number, readonly w: EvalWeights, readonly rootHashes: number) {}

  private stand(): number {
    const e = evaluate(this.b.sq, this.w);
    return this.b.side ? -e : e;
  }

  /** Сортировка ходов уровня ply по убыванию оценки (вставками — ходов немного). */
  private order(ply: number, n: number, first: number): void {
    const ms = this.bufs[ply]!, sc = this.scores[ply]!, sq = this.b.sq;
    for (let i = 0; i < n; i++) {
      const m = ms[i]!;
      let v = 0;
      if (m === first) v = 1 << 28;
      else if (isCapture(m)) v = (1 << 20) + 10 * (KIND_VALUE[sq[mTo(m)]! & 7] || 100) - KIND_VALUE[sq[mFrom(m)]! & 7]!;
      else if (m === this.killers[ply * 2] || m === this.killers[ply * 2 + 1]) v = 1 << 19;
      if (mPromo(m) === 5) v += 1 << 21;
      sc[i] = v;
    }
    for (let i = 1; i < n; i++) {
      const m = ms[i]!, v = sc[i]!;
      let j = i - 1;
      while (j >= 0 && sc[j]! < v) {
        ms[j + 1] = ms[j]!;
        sc[j + 1] = sc[j]!;
        j--;
      }
      ms[j + 1] = m;
      sc[j + 1] = v;
    }
  }

  private quiesce(alpha: number, beta: number, ply: number): number {
    this.nodes++;
    const stand = this.stand();
    if (stand >= beta || ply >= MAX_PLY) return stand;
    if (stand > alpha) alpha = stand;
    const n = this.b.gen(this.bufs[ply]!, true);
    this.order(ply, n, 0);
    const ms = this.bufs[ply]!;
    for (let i = 0; i < n; i++) {
      if (!this.b.make(ms[i]!)) continue;
      const v = -this.quiesce(-beta, -alpha, ply + 1);
      this.b.unmake();
      if (v >= beta) return v;
      if (v > alpha) alpha = v;
    }
    return alpha;
  }

  /** Повтор позиции на пути поиска (от корня) — ничья. */
  private repeated(): boolean {
    const hs = this.b.pathHashes();
    const h = this.b.hash;
    for (let i = hs.length - 2; i >= this.rootHashes && i >= hs.length - this.b.halfmove; i -= 2) if (hs[i] === h) return true;
    return false;
  }

  negamax(depth: number, alpha: number, beta: number, ply: number): number {
    if (this.nodes >= this.budget) {
      this.stopped = true;
      return 0;
    }
    if (ply > 0 && (this.b.halfmove >= 100 || this.repeated() || this.b.insufficient())) return 0;
    const check = this.b.inCheck();
    if (check) depth++; // шах — продлеваем, чтобы не пропустить мат
    if (depth <= 0 || ply >= MAX_PLY) return this.quiesce(alpha, beta, ply);
    this.nodes++;
    const ms = this.bufs[ply]!;
    const n = this.b.gen(ms, false);
    this.order(ply, n, 0);
    let legal = 0;
    let best = -MATE - 1;
    for (let i = 0; i < n; i++) {
      const m = ms[i]!;
      if (!this.b.make(m)) continue;
      legal++;
      const v = -this.negamax(depth - 1, -beta, -alpha, ply + 1);
      this.b.unmake();
      if (this.stopped) return 0;
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) {
        if (!isCapture(m) && this.killers[ply * 2] !== m) {
          this.killers[ply * 2 + 1] = this.killers[ply * 2]!;
          this.killers[ply * 2] = m;
        }
        break;
      }
    }
    if (legal === 0) return check ? -MATE + ply : 0;
    return best;
  }

  /** Оценки корневых ходов на глубине depth; exact — полное окно (нужно для выбора «с ошибкой»). */
  root(ms: readonly number[], depth: number, first: number, exact: boolean, drawish: () => boolean): { m: number; value: number }[] | null {
    const out: { m: number; value: number }[] = [];
    const sorted = [...ms].sort((a, b) => (a === first ? -1 : b === first ? 1 : 0));
    let alpha = -MATE - 1;
    for (const m of sorted) {
      this.b.make(m);
      const v = drawish() ? 0 : -this.negamax(depth - 1, -MATE - 1, exact ? MATE + 1 : -alpha, 1);
      this.b.unmake();
      if (this.stopped) return null;
      if (v > alpha) alpha = v;
      out.push({ m, value: v });
    }
    return out;
  }
}

export function decide(view: PlayerView, level: AiLevel, personality: Personality, rng: RngState): AiDecision {
  const options = legalActionsForView(view);
  if (options.length === 0) throw new Error('ИИ: нет допустимых ходов');
  if (options.length === 1) return { action: options[0]!, rng };
  const spec = LEVELS[level];
  const board = FastBoard.from(view);
  const buf = new Int32Array(MAX_MOVES);
  const ms = options.flatMap((a) => (a.type === 'move' ? [fromMove(board, a.move, buf)] : []));
  // Ход в позицию, которая уже дважды была в партии, — ничья повторением (§5); один раз — тоже ведёт к ней.
  const past = new Set(view.history);
  const drawish = () => past.has(keyOfBoard(board));
  const search = new Search(board, spec.budget, personality, 0);
  let scored: { m: number; value: number }[] = ms.map((m) => ({ m, value: 0 }));
  let first = 0;
  for (let d = 1; d <= spec.depth; d++) {
    const r = search.root(ms, d, first, spec.noise > 0 || spec.slip > 0, drawish);
    if (!r) break;
    scored = r;
    first = r.reduce((a, b) => (b.value > a.value ? b : a)).m;
  }
  let r = rng;
  const ranked: { m: number; value: number }[] = [];
  for (const s of scored) {
    let v = s.value;
    if (spec.noise) {
      const [x, n] = nextFloat(r);
      r = n;
      v += Math.round((x - 0.5) * 2 * spec.noise);
    }
    if (personality.flair) {
      board.make(s.m);
      if (board.inCheck()) v += personality.flair;
      board.unmake();
    }
    ranked.push({ m: s.m, value: v });
  }
  ranked.sort((a, b) => b.value - a.value);
  let pick = ranked[0]!.m;
  const [roll, r2] = nextFloat(r);
  r = r2;
  if (roll < spec.slip) {
    // Ошибка правдоподобная: ход чуть хуже лучшего, а не любой (мат в один ход так не упустить).
    const top = ranked[0]!.value;
    const sane = ranked.filter((x) => x.value >= top - spec.margin).slice(0, 3);
    if (sane.length) {
      const [i, r3] = nextInt(r, sane.length);
      r = r3;
      pick = sane[i]!.m;
    }
  }
  const move: Move = toMove(pick);
  return { action: { type: 'move', color: view.color, move }, rng: r };
}

/** Ключ позиции в формате правил — для сверки с историей партии. */
function keyOfBoard(b: FastBoard): string {
  const board = Array.from({ length: 64 }, (_, s) => pieceAt(b, s));
  const castling = { wK: !!(b.castle & 1), wQ: !!(b.castle & 2), bK: !!(b.castle & 4), bQ: !!(b.castle & 8) };
  const turn = b.side ? 'b' : 'w';
  const pos = { board, turn, castling, ep: b.ep >= 0 ? b.ep : null } as const;
  // Взятие на проходе учитывается, только если оно реально возможно: проверяем быстрой доской.
  let epOk = false;
  if (b.ep >= 0) {
    const buf = new Int32Array(MAX_MOVES);
    const n = b.gen(buf, true);
    for (let i = 0; i < n && !epOk; i++) {
      const m = buf[i]!;
      if (mTo(m) === b.ep && (b.sq[mFrom(m)]! & 7) === 1 && b.make(m)) {
        b.unmake();
        epOk = true;
      }
    }
  }
  return positionKey(pos, epOk);
}
