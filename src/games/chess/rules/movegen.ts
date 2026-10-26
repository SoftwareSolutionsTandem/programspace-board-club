// Генерация ходов по правилам FIDE (docs/games/chess.md §2–4): атаки, псевдоходы, легальные ходы (свой король
// не под ударом), рокировка, взятие на проходе, превращение. Чистые функции.
import { colorOf, fileOf, kindOf, onBoard, other, pieceOf, rankOf, sq, type Board, type CastlingRights, type Color, type Kind, type Piece, type Position, type Square } from './board';

export interface Move {
  readonly from: Square;
  readonly to: Square;
  /** Во что превращается пешка на последней горизонтали. */
  readonly promotion?: 'q' | 'r' | 'b' | 'n';
}

export const PROMOTIONS = ['q', 'r', 'b', 'n'] as const;

const KNIGHT = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]] as const;
const KING = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]] as const;
const ROOK_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;
const BISHOP_DIRS = [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const;

export const sameMove = (a: Move, b: Move): boolean => a.from === b.from && a.to === b.to && (a.promotion ?? null) === (b.promotion ?? null);

/** Бьёт ли сторона by клетку s. */
export function attacked(board: Board, s: Square, by: Color): boolean {
  const f = fileOf(s), r = rankOf(s);
  const at = (ff: number, rr: number): Piece | null => (onBoard(ff, rr) ? board[sq(ff, rr)] ?? null : null);
  // Пешки: белая бьёт вверх, значит, на клетку s нападает белая пешка снизу.
  const pr = by === 'w' ? r - 1 : r + 1;
  const pawn = pieceOf(by, 'p');
  if (at(f - 1, pr) === pawn || at(f + 1, pr) === pawn) return true;
  const knight = pieceOf(by, 'n');
  for (const [df, dr] of KNIGHT) if (at(f + df, r + dr) === knight) return true;
  const king = pieceOf(by, 'k');
  for (const [df, dr] of KING) if (at(f + df, r + dr) === king) return true;
  const slide = (dirs: readonly (readonly [number, number])[], a: Piece, b: Piece): boolean => {
    for (const [df, dr] of dirs) {
      let ff = f + df, rr = r + dr;
      while (onBoard(ff, rr)) {
        const x = board[sq(ff, rr)];
        if (x) {
          if (x === a || x === b) return true;
          break;
        }
        ff += df;
        rr += dr;
      }
    }
    return false;
  };
  const queen = pieceOf(by, 'q');
  return slide(ROOK_DIRS, pieceOf(by, 'r'), queen) || slide(BISHOP_DIRS, pieceOf(by, 'b'), queen);
}

export function kingSquare(board: Board, c: Color): Square {
  const k = pieceOf(c, 'k');
  for (let s = 0; s < 64; s++) if (board[s] === k) return s;
  return -1;
}

export function inCheck(pos: Pick<Position, 'board'>, c: Color): boolean {
  const k = kingSquare(pos.board, c);
  return k >= 0 && attacked(pos.board, k, other(c));
}

/** Псевдоходы стороны turn: по правилам движения фигур, без проверки собственного короля (кроме рокировки). */
export function pseudoMoves(pos: Position): Move[] {
  const { board, turn } = pos;
  const out: Move[] = [];
  for (let s = 0; s < 64; s++) {
    const p = board[s];
    if (!p || colorOf(p) !== turn) continue;
    const f = fileOf(s), r = rankOf(s);
    const k = kindOf(p);
    const push = (to: Square) => out.push({ from: s, to });
    const target = (ff: number, rr: number): 'empty' | 'enemy' | 'own' | 'off' => {
      if (!onBoard(ff, rr)) return 'off';
      const x = board[sq(ff, rr)];
      return !x ? 'empty' : colorOf(x) === turn ? 'own' : 'enemy';
    };
    if (k === 'p') {
      const dir = turn === 'w' ? 1 : -1;
      const startRank = turn === 'w' ? 1 : 6;
      const lastRank = turn === 'w' ? 7 : 0;
      const addPawn = (to: Square) => {
        if (rankOf(to) === lastRank) for (const pr of ['q', 'r', 'b', 'n'] as const) out.push({ from: s, to, promotion: pr });
        else push(to);
      };
      if (target(f, r + dir) === 'empty') {
        addPawn(sq(f, r + dir));
        if (r === startRank && target(f, r + 2 * dir) === 'empty') push(sq(f, r + 2 * dir));
      }
      for (const df of [-1, 1]) {
        const t = target(f + df, r + dir);
        if (t === 'enemy') addPawn(sq(f + df, r + dir));
        else if (t === 'empty' && pos.ep === sq(f + df, r + dir)) push(pos.ep);
      }
      continue;
    }
    if (k === 'n' || k === 'k') {
      for (const [df, dr] of k === 'n' ? KNIGHT : KING) {
        const t = target(f + df, r + dr);
        if (t === 'empty' || t === 'enemy') push(sq(f + df, r + dr));
      }
      if (k === 'k') castles(pos, s, out);
      continue;
    }
    const dirs = k === 'r' ? ROOK_DIRS : k === 'b' ? BISHOP_DIRS : [...ROOK_DIRS, ...BISHOP_DIRS];
    for (const [df, dr] of dirs) {
      let ff = f + df, rr = r + dr;
      for (;;) {
        const t = target(ff, rr);
        if (t === 'off' || t === 'own') break;
        push(sq(ff, rr));
        if (t === 'enemy') break;
        ff += df;
        rr += dr;
      }
    }
  }
  return out;
}

/** Рокировка (§3): права не потеряны, клетки между королём и ладьёй пусты, король не под шахом и не проходит битое поле. */
function castles(pos: Position, from: Square, out: Move[]): void {
  const { board, turn, castling } = pos;
  const home = turn === 'w' ? 4 : 60;
  if (from !== home) return;
  const enemy = other(turn);
  const rook = pieceOf(turn, 'r');
  const can = (side: 'K' | 'Q'): boolean => castling[`${turn}${side}` as keyof CastlingRights];
  if (attacked(board, home, enemy)) return;
  if (can('K') && board[home + 3] === rook && !board[home + 1] && !board[home + 2] && !attacked(board, home + 1, enemy) && !attacked(board, home + 2, enemy)) out.push({ from: home, to: home + 2 });
  if (can('Q') && board[home - 4] === rook && !board[home - 1] && !board[home - 2] && !board[home - 3] && !attacked(board, home - 1, enemy) && !attacked(board, home - 2, enemy)) out.push({ from: home, to: home - 2 });
}

/** Что делает ход: взятие (с клеткой — у взятия на проходе она другая), рокировка, превращение. */
export interface MoveEffect {
  readonly piece: Piece;
  readonly captured: Piece | null;
  readonly captureSquare: Square | null;
  readonly castle: { readonly rookFrom: Square; readonly rookTo: Square; readonly side: 'king' | 'queen' } | null;
  readonly promotion: Piece | null;
  readonly enPassant: boolean;
}

export function moveEffect(pos: Position, m: Move): MoveEffect {
  const piece = pos.board[m.from]!;
  const k = kindOf(piece);
  const enPassant = k === 'p' && m.to === pos.ep && !pos.board[m.to] && fileOf(m.from) !== fileOf(m.to);
  const captureSquare = enPassant ? sq(fileOf(m.to), rankOf(m.from)) : pos.board[m.to] ? m.to : null;
  const castle = k === 'k' && Math.abs(m.to - m.from) === 2
    ? (m.to > m.from ? { rookFrom: m.from + 3, rookTo: m.from + 1, side: 'king' as const } : { rookFrom: m.from - 4, rookTo: m.from - 1, side: 'queen' as const })
    : null;
  return {
    piece,
    captured: captureSquare === null ? null : pos.board[captureSquare] ?? null,
    captureSquare,
    castle,
    promotion: m.promotion ? pieceOf(colorOf(piece), m.promotion as Kind) : null,
    enPassant,
  };
}

/** Позиция после хода (без проверки легальности). */
export function makeMove(pos: Position, m: Move): Position {
  const e = moveEffect(pos, m);
  const board = pos.board.slice();
  if (e.captureSquare !== null) board[e.captureSquare] = null;
  board[m.from] = null;
  board[m.to] = e.promotion ?? e.piece;
  if (e.castle) {
    board[e.castle.rookTo] = board[e.castle.rookFrom] ?? null;
    board[e.castle.rookFrom] = null;
  }
  // Права рокировки теряются ходом короля или ладьи и взятием ладьи на исходной клетке.
  let { wK, wQ, bK, bQ } = pos.castling;
  const touch = (s: Square) => {
    if (s === 4) wK = wQ = false;
    if (s === 60) bK = bQ = false;
    if (s === 0) wQ = false;
    if (s === 7) wK = false;
    if (s === 56) bQ = false;
    if (s === 63) bK = false;
  };
  touch(m.from);
  touch(m.to);
  const k = kindOf(e.piece);
  const ep = k === 'p' && Math.abs(m.to - m.from) === 16 ? (m.from + m.to) / 2 : null;
  return { board, turn: other(pos.turn), castling: { wK, wQ, bK, bQ }, ep };
}

/** Легальные ходы: после хода свой король не под ударом. */
export function legalMoves(pos: Position): Move[] {
  return pseudoMoves(pos).filter((m) => !inCheck(makeMove(pos, m), pos.turn));
}

/** Возможно ли сейчас взятие на проходе (для ключа повторений). */
export function epCapturable(pos: Position): boolean {
  if (pos.ep === null) return false;
  return legalMoves(pos).some((m) => m.to === pos.ep && kindOf(pos.board[m.from]!) === 'p');
}

/** Недостаточно материала для мата ни у кого (FIDE 5.2.2, простые случаи): K–K, K+лёгкая–K, K+С–K+С на полях одного цвета. */
export function insufficientMaterial(board: Board): boolean {
  const minors: { k: Kind; s: Square }[] = [];
  for (let s = 0; s < 64; s++) {
    const p = board[s];
    if (!p) continue;
    const k = kindOf(p);
    if (k === 'k') continue;
    if (k === 'p' || k === 'r' || k === 'q') return false;
    minors.push({ k, s });
  }
  if (minors.length <= 1) return true;
  // Только слоны, все на полях одного цвета.
  if (minors.every((m) => m.k === 'b')) {
    const shade = (s: Square) => (fileOf(s) + rankOf(s)) % 2;
    return minors.every((m) => shade(m.s) === shade(minors[0]!.s));
  }
  return false;
}
