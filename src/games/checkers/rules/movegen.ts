// Ходы русских шашек (docs/games/checkers.md §2–4): тихие ходы, обязательное взятие, бой назад простой,
// многоходовое взятие, «турецкий удар» (сбитые шашки снимаются после хода и мешают, перепрыгивать их снова нельзя),
// дальнобойная дамка, превращение посреди взятия с продолжением боя дамкой. Чистые функции.
import { colorOf, crown, crownRank, fileOf, isKing, onBoard, other, rankOf, sq, type Board, type Color, type Piece, type Square } from './board';

/** Ход — путь шашки по полям (первое — откуда) и сбитые поля по порядку. Путь однозначно задаёт ход. */
export interface Move {
  readonly path: readonly Square[];
  readonly captures: readonly Square[];
}

export const DIRS = [[1, 1], [-1, 1], [1, -1], [-1, -1]] as const;

export const sameMove = (a: Move, b: Move): boolean => a.path.length === b.path.length && a.path.every((s, i) => s === b.path[i]);

/** Все взятия стороны turn (с полным продолжением). Пусто — взятий нет. */
export function captureMoves(board: Board, turn: Color): Move[] {
  const out: Move[] = [];
  for (let s = 0; s < 64; s++) {
    const p = board[s];
    if (p && colorOf(p) === turn) collect(board, s, p, [s], [], out);
  }
  return out;
}

/**
 * Продолжение взятия шашкой piece, стоящей (на время хода) на path.at(-1); captured — уже сбитые (они ещё на доске).
 * Исходное поле считается пустым: шашка с него ушла.
 */
function collect(board: Board, origin: Square, piece: Piece, path: Square[], captured: Square[], out: Move[]): void {
  const from = path[path.length - 1]!;
  const color = colorOf(piece);
  const at = (s: Square): Piece | null => (s === origin ? null : board[s] ?? null);
  const f0 = fileOf(from), r0 = rankOf(from);
  for (const [df, dr] of DIRS) {
    if (isKing(piece)) {
      // Дальнобойная дамка: по диагонали через пустые поля до шашки соперника, за ней — любое пустое поле.
      let f = f0 + df, r = r0 + dr;
      while (onBoard(f, r) && !at(sq(f, r))) {
        f += df;
        r += dr;
      }
      if (!onBoard(f, r)) continue;
      const over = sq(f, r);
      const victim = at(over);
      if (!victim || colorOf(victim) === color || captured.includes(over)) continue;
      const lands: Square[] = [];
      f += df;
      r += dr;
      while (onBoard(f, r) && !at(sq(f, r))) {
        lands.push(sq(f, r));
        f += df;
        r += dr;
      }
      if (lands.length === 0) continue;
      // Если с какого-то поля приземления бой продолжается — бить дальше обязательно (только такие поля).
      const nextCaptured = [...captured, over];
      const continuing = lands.filter((l) => canCapture(board, origin, piece, l, nextCaptured));
      for (const l of continuing.length ? continuing : lands) {
        if (continuing.length) collect(board, origin, piece, [...path, l], nextCaptured, out);
        else out.push({ path: [...path, l], captures: nextCaptured });
      }
    } else {
      // Простая бьёт во все четыре стороны — и вперёд, и назад.
      const over = onBoard(f0 + df, r0 + dr) ? sq(f0 + df, r0 + dr) : -1;
      const land = onBoard(f0 + 2 * df, r0 + 2 * dr) ? sq(f0 + 2 * df, r0 + 2 * dr) : -1;
      if (over < 0 || land < 0) continue;
      const victim = at(over);
      if (!victim || colorOf(victim) === color || captured.includes(over) || at(land)) continue;
      const nextCaptured = [...captured, over];
      // Дошла до края — сразу дамка и бьёт дальше уже как дамка.
      const nextPiece = rankOf(land) === crownRank(color) ? crown(piece) : piece;
      const before = out.length;
      collect(board, origin, nextPiece, [...path, land], nextCaptured, out);
      if (out.length === before) out.push({ path: [...path, land], captures: nextCaptured });
    }
  }
}

function canCapture(board: Board, origin: Square, piece: Piece, from: Square, captured: Square[]): boolean {
  const probe: Move[] = [];
  collect(board, origin, piece, [from], captured, probe);
  return probe.length > 0;
}

/** Тихие ходы: простая — на соседнее поле вперёд, дамка — на любое свободное по диагонали. */
export function quietMoves(board: Board, turn: Color): Move[] {
  const out: Move[] = [];
  const fwd = turn === 'w' ? 1 : -1;
  for (let s = 0; s < 64; s++) {
    const p = board[s];
    if (!p || colorOf(p) !== turn) continue;
    const f0 = fileOf(s), r0 = rankOf(s);
    for (const [df, dr] of DIRS) {
      if (!isKing(p)) {
        if (dr !== fwd) continue;
        const f = f0 + df, r = r0 + dr;
        if (onBoard(f, r) && !board[sq(f, r)]) out.push({ path: [s, sq(f, r)], captures: [] });
        continue;
      }
      let f = f0 + df, r = r0 + dr;
      while (onBoard(f, r) && !board[sq(f, r)]) {
        out.push({ path: [s, sq(f, r)], captures: [] });
        f += df;
        r += dr;
      }
    }
  }
  return out;
}

/** Легальные ходы: взятие обязательно (любое из возможных, не обязательно самое длинное). */
export function legalMoves(board: Board, turn: Color): Move[] {
  const caps = captureMoves(board, turn);
  return caps.length ? caps : quietMoves(board, turn);
}

/** Доска после хода: шашка на последнем поле пути, сбитые сняты, превращение — если путь прошёл через край. */
export function makeMove(board: Board, m: Move): { board: Board; crowned: boolean } {
  const b = board.slice();
  const from = m.path[0]!;
  const to = m.path[m.path.length - 1]!;
  let piece = b[from]!;
  const color = colorOf(piece);
  const crowned = !isKing(piece) && m.path.slice(1).some((s) => rankOf(s) === crownRank(color));
  if (crowned) piece = crown(piece);
  b[from] = null;
  for (const c of m.captures) b[c] = null;
  b[to] = piece;
  return { board: b, crowned };
}

export const count = (board: Board, c: Color): { men: number; kings: number } => {
  let men = 0, kings = 0;
  for (const p of board) {
    if (!p || colorOf(p) !== c) continue;
    if (isKing(p)) kings++;
    else men++;
  }
  return { men, kings };
};

export { other };
