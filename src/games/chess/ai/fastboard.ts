// Быстрая доска для поиска ИИ: изменяемый массив, ход/откат без копий, псевдолегальные ходы с проверкой короля.
// Те же правила, что в rules/movegen.ts; совпадение проверяется perft-тестом (tests/games/chess/ai.test.ts).
// Строится из PlayerView (позиция открыта целиком), полного состояния движка не касается.
import { colorOf, kindOf, type Board, type CastlingRights, type Color, type Kind, type Piece } from '../rules/board';
import type { Move } from '../rules/movegen';

// Коды фигур: 1…6 — белые P N B R Q K, 9…14 — чёрные (бит 8 — чёрный цвет).
export const P = 1, N = 2, B = 3, R = 4, Q = 5, K = 6, BLACK = 8;
const KINDS: readonly Kind[] = ['p', 'n', 'b', 'r', 'q', 'k'];
const PROMO: readonly (Move['promotion'])[] = [undefined, undefined, 'n', 'b', 'r', 'q'];
const PROMO_CODE: Readonly<Record<string, number>> = { n: N, b: B, r: R, q: Q };

// Флаги хода.
const CAP = 1, EP = 2, CASTLE = 4, DOUBLE = 8;

export const mFrom = (m: number) => m & 63;
export const mTo = (m: number) => (m >> 6) & 63;
export const mPromo = (m: number) => (m >> 12) & 7;
const mFlags = (m: number) => m >> 15;
export const isCapture = (m: number) => (mFlags(m) & (CAP | EP)) !== 0;
const enc = (from: number, to: number, promo: number, flags: number) => from | (to << 6) | (promo << 12) | (flags << 15);

const DIAG = [9, 7, -7, -9];
const ORTHO = [8, -8, 1, -1];
const ALL = [...DIAG, ...ORTHO];
const SIDES = [-1, 1];
const UNDER = [R, B, N];
const PROMOS = [Q, R, B, N];
const KN = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
const KG = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];

const step = (s: number, df: number, dr: number) => {
  const f = (s & 7) + df, r = (s >> 3) + dr;
  return f >= 0 && f < 8 && r >= 0 && r < 8 ? r * 8 + f : -1;
};
const targets = (deltas: number[][]) => Array.from({ length: 64 }, (_, s) => deltas.map(([df, dr]) => step(s, df!, dr!)).filter((t) => t >= 0));
const KNIGHT = targets(KN);
const KING = targets(KG);
const dirDelta = (d: number): [number, number] => [d === 1 || d === 9 || d === -7 ? 1 : d === -1 || d === 7 || d === -9 ? -1 : 0, d > 1 ? 1 : d < -1 ? -1 : 0];
/** Лучи от каждого поля по направлению: RAYS[s][d] — поля до края. */
const RAYS = Array.from({ length: 64 }, (_, s) => {
  const out: Record<number, number[]> = {};
  for (const d of ALL) {
    const [df, dr] = dirDelta(d);
    const ray: number[] = [];
    for (let t = step(s, df, dr); t >= 0; t = step(t, df, dr)) ray.push(t);
    out[d] = ray;
  }
  return out;
});
/** Поля, с которых пешка стороны (0/1) бьёт поле s. */
const PAWN_FROM = [0, 1].map((side) => Array.from({ length: 64 }, (_, s) => SIDES.map((df) => step(s, df, side ? 1 : -1)).filter((t) => t >= 0)));

// Зобрист-ключи из детерминированного генератора (xorshift) — для повторений внутри поиска.
const Z = (() => {
  let x = 0x9e3779b9;
  const next = () => {
    x ^= x << 13;
    x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    return x;
  };
  return { piece: Array.from({ length: 16 * 64 }, next), side: next(), castle: Array.from({ length: 16 }, next), ep: Array.from({ length: 64 }, next) };
})();

// Какие права рокировки теряются, если с поля ушла или на поле взята фигура.
const LOSE = Array.from({ length: 64 }, (_, s) => (s === 4 ? 3 : s === 7 ? 1 : s === 0 ? 2 : s === 60 ? 12 : s === 63 ? 4 : s === 56 ? 8 : 0));

export const MAX_PLY = 96;
export const MAX_MOVES = 256;

export class FastBoard {
  readonly sq = new Int8Array(64);
  side = 0; // 0 — белые, 1 — чёрные
  castle = 0; // 1 wK, 2 wQ, 4 bK, 8 bQ
  ep = -1;
  halfmove = 0;
  hash = 0;
  readonly kings = [0, 0];
  private readonly undo: number[] = [];
  private readonly hashes: number[] = [];

  static from(pos: { board: Board; turn: Color; castling: CastlingRights; ep: number | null; halfmove: number }): FastBoard {
    const b = new FastBoard();
    for (let s = 0; s < 64; s++) {
      const p = pos.board[s];
      if (!p) continue;
      const code = KINDS.indexOf(kindOf(p)) + 1 + (colorOf(p) === 'b' ? BLACK : 0);
      b.sq[s] = code;
      if ((code & 7) === K) b.kings[code & BLACK ? 1 : 0] = s;
    }
    b.side = pos.turn === 'w' ? 0 : 1;
    const c = pos.castling;
    b.castle = (c.wK ? 1 : 0) | (c.wQ ? 2 : 0) | (c.bK ? 4 : 0) | (c.bQ ? 8 : 0);
    b.ep = pos.ep ?? -1;
    b.halfmove = pos.halfmove;
    b.hash = b.computeHash();
    return b;
  }

  computeHash(): number {
    let h = 0;
    for (let s = 0; s < 64; s++) if (this.sq[s]) h ^= Z.piece[this.sq[s]! * 64 + s]!;
    if (this.side) h ^= Z.side;
    h ^= Z.castle[this.castle]!;
    if (this.ep >= 0) h ^= Z.ep[this.ep]!;
    return h >>> 0;
  }

  /** Поле s бьёт сторона by (0/1). */
  attacked(s: number, by: number): boolean {
    const col = by ? BLACK : 0;
    const sq = this.sq;
    for (const t of PAWN_FROM[by]![s]!) if (sq[t] === (P | col)) return true;
    for (const t of KNIGHT[s]!) if (sq[t] === (N | col)) return true;
    for (const t of KING[s]!) if (sq[t] === (K | col)) return true;
    const rays = RAYS[s]!;
    for (const d of DIAG) {
      for (const t of rays[d]!) {
        const p = sq[t]!;
        if (!p) continue;
        if ((p & BLACK) === col && ((p & 7) === B || (p & 7) === Q)) return true;
        break;
      }
    }
    for (const d of ORTHO) {
      for (const t of rays[d]!) {
        const p = sq[t]!;
        if (!p) continue;
        if ((p & BLACK) === col && ((p & 7) === R || (p & 7) === Q)) return true;
        break;
      }
    }
    return false;
  }

  inCheck(): boolean {
    return this.attacked(this.kings[this.side]!, this.side ^ 1);
  }

  /** Псевдолегальные ходы в out; возвращает их число. capturesOnly — только взятия и превращения в ферзя. */
  gen(out: Int32Array, capturesOnly: boolean): number {
    let n = 0;
    const sq = this.sq;
    const me = this.side ? BLACK : 0;
    const enemy = me ^ BLACK;
    for (let s = 0; s < 64; s++) {
      const p = sq[s]!;
      if (!p || (p & BLACK) !== me) continue;
      const k = p & 7;
      if (k === P) {
        const dir = me ? -1 : 1;
        const last = me ? 0 : 7;
        const one = step(s, 0, dir);
        if (one >= 0 && !sq[one]) {
          if (one >> 3 === last) {
            out[n++] = enc(s, one, Q, 0);
            if (!capturesOnly) for (const pr of UNDER) out[n++] = enc(s, one, pr, 0);
          } else if (!capturesOnly) {
            out[n++] = enc(s, one, 0, 0);
            const two = one + dir * 8;
            if (s >> 3 === (me ? 6 : 1) && !sq[two]) out[n++] = enc(s, two, 0, DOUBLE);
          }
        }
        for (const df of SIDES) {
          const t = step(s, df, dir);
          if (t < 0) continue;
          const q = sq[t]!;
          if (q && (q & BLACK) === enemy) {
            if (t >> 3 === last) for (const pr of PROMOS) out[n++] = enc(s, t, pr, CAP);
            else out[n++] = enc(s, t, 0, CAP);
          } else if (t === this.ep) out[n++] = enc(s, t, 0, EP);
        }
        continue;
      }
      if (k === N || k === K) {
        for (const t of (k === N ? KNIGHT : KING)[s]!) {
          const q = sq[t]!;
          if (!q) {
            if (!capturesOnly) out[n++] = enc(s, t, 0, 0);
          } else if ((q & BLACK) === enemy) out[n++] = enc(s, t, 0, CAP);
        }
        if (k === K && !capturesOnly) n = this.genCastle(s, out, n);
        continue;
      }
      const dirs = k === B ? DIAG : k === R ? ORTHO : ALL;
      const rays = RAYS[s]!;
      for (const d of dirs) {
        for (const t of rays[d]!) {
          const q = sq[t]!;
          if (!q) {
            if (!capturesOnly) out[n++] = enc(s, t, 0, 0);
            continue;
          }
          if ((q & BLACK) === enemy) out[n++] = enc(s, t, 0, CAP);
          break;
        }
      }
    }
    return n;
  }

  private genCastle(s: number, out: Int32Array, n: number): number {
    const white = this.side === 0;
    const home = white ? 4 : 60;
    if (s !== home) return n;
    const enemy = this.side ^ 1;
    const rook = R | (white ? 0 : BLACK);
    const sq = this.sq;
    if (this.castle & (white ? 1 : 4) && !sq[home + 1] && !sq[home + 2] && sq[home + 3] === rook) {
      if (!this.attacked(home, enemy) && !this.attacked(home + 1, enemy) && !this.attacked(home + 2, enemy)) out[n++] = enc(home, home + 2, 0, CASTLE);
    }
    if (this.castle & (white ? 2 : 8) && !sq[home - 1] && !sq[home - 2] && !sq[home - 3] && sq[home - 4] === rook) {
      if (!this.attacked(home, enemy) && !this.attacked(home - 1, enemy) && !this.attacked(home - 2, enemy)) out[n++] = enc(home, home - 2, 0, CASTLE);
    }
    return n;
  }

  /** Сделать ход; false — ход оставил своего короля под боем (тогда он уже откачен). */
  make(m: number): boolean {
    const sq = this.sq;
    const from = mFrom(m), to = mTo(m), promo = mPromo(m), flags = mFlags(m);
    const p = sq[from]!;
    const me = p & BLACK;
    let captured = sq[to]!;
    let capSq = to;
    if (flags & EP) {
      capSq = to + (me ? 8 : -8);
      captured = sq[capSq]!;
    }
    this.undo.push(m, captured, this.castle, this.ep, this.halfmove);
    this.hashes.push(this.hash);
    let h = this.hash ^ Z.castle[this.castle]! ^ (this.ep >= 0 ? Z.ep[this.ep]! : 0) ^ Z.side;
    if (captured) {
      sq[capSq] = 0;
      h ^= Z.piece[captured * 64 + capSq]!;
    }
    sq[from] = 0;
    h ^= Z.piece[p * 64 + from]!;
    const placed = promo ? promo | me : p;
    sq[to] = placed;
    h ^= Z.piece[placed * 64 + to]!;
    if ((p & 7) === K) {
      this.kings[me ? 1 : 0] = to;
      if (flags & CASTLE) {
        const kingSide = to > from;
        const rf = kingSide ? from + 3 : from - 4, rt = kingSide ? from + 1 : from - 1;
        const rook = sq[rf]!;
        sq[rf] = 0;
        sq[rt] = rook;
        h ^= Z.piece[rook * 64 + rf]! ^ Z.piece[rook * 64 + rt]!;
      }
    }
    this.castle &= ~(LOSE[from]! | LOSE[to]!);
    this.ep = flags & DOUBLE ? (from + to) >> 1 : -1;
    this.halfmove = (p & 7) === P || captured ? 0 : this.halfmove + 1;
    this.side ^= 1;
    h ^= Z.castle[this.castle]! ^ (this.ep >= 0 ? Z.ep[this.ep]! : 0);
    this.hash = h >>> 0;
    if (this.attacked(this.kings[me ? 1 : 0]!, this.side)) {
      this.unmake();
      return false;
    }
    return true;
  }

  unmake(): void {
    const sq = this.sq;
    const u = this.undo;
    const halfmove = u.pop()!, ep = u.pop()!, castle = u.pop()!, captured = u.pop()!, m = u.pop()!;
    this.hash = this.hashes.pop()!;
    const from = mFrom(m), to = mTo(m), promo = mPromo(m), flags = mFlags(m);
    this.side ^= 1;
    const me = this.side ? BLACK : 0;
    const p = promo ? P | me : sq[to]!;
    sq[from] = p;
    sq[to] = 0;
    if (flags & EP) sq[to + (me ? 8 : -8)] = captured;
    else sq[to] = captured;
    if ((p & 7) === K) {
      this.kings[me ? 1 : 0] = from;
      if (flags & CASTLE) {
        const kingSide = to > from;
        const rf = kingSide ? from + 3 : from - 4, rt = kingSide ? from + 1 : from - 1;
        sq[rf] = sq[rt]!;
        sq[rt] = 0;
      }
    }
    this.castle = castle;
    this.ep = ep;
    this.halfmove = halfmove;
  }

  /** Хеши позиций на пути поиска, от корня (для повторений). */
  pathHashes(): readonly number[] {
    return this.hashes;
  }

  /** Недостаточно материала для мата (те же случаи, что в правилах). */
  insufficient(): boolean {
    let minors = 0, knights = 0, shade = -1, mixed = false;
    for (let s = 0; s < 64; s++) {
      const k = this.sq[s]! & 7;
      if (!k || k === K) continue;
      if (k === P || k === R || k === Q) return false;
      minors++;
      if (k === N) knights++;
      else {
        const c = ((s >> 3) + (s & 7)) & 1;
        if (shade >= 0 && shade !== c) mixed = true;
        shade = c;
      }
    }
    return minors <= 1 || (knights === 0 && !mixed);
  }
}

export const buffers = () => Array.from({ length: MAX_PLY + 16 }, () => new Int32Array(MAX_MOVES));

export function toMove(m: number): Move {
  const promotion = PROMO[mPromo(m)];
  return promotion ? { from: mFrom(m), to: mTo(m), promotion } : { from: mFrom(m), to: mTo(m) };
}

/** Код быстрого хода для хода правил (среди псевдолегальных ходов позиции). */
export function fromMove(b: FastBoard, move: Move, buf: Int32Array): number {
  const n = b.gen(buf, false);
  const promo = move.promotion ? PROMO_CODE[move.promotion]! : 0;
  for (let i = 0; i < n; i++) {
    const m = buf[i]!;
    if (mFrom(m) === move.from && mTo(m) === move.to && mPromo(m) === promo) return m;
  }
  throw new Error('ИИ: ход не найден на быстрой доске');
}

export const pieceAt = (b: FastBoard, s: number): Piece | null => {
  const c = b.sq[s]!;
  if (!c) return null;
  const k = KINDS[(c & 7) - 1]!;
  return (c & BLACK ? k : k.toUpperCase()) as Piece;
};
