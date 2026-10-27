// Реакции Костяна на события партии в шашки (docs/games/checkers.md §8): событие → эмоция, жест, реплика.
import type { ReactionContext } from '../../board/session';
import type { Trigger } from '../../characters/director';
import { crownRank, isKing, other, rankOf, type Board, type Color } from './rules/board';
import type { CheckersEvent } from './rules/engine';
import { captureMoves } from './rules/movegen';
import type { PlayerView } from './view';

/** Порог перевеса (шашка = 1, дамка = 2,5), после которого Костян замечает, что он впереди или позади. */
export const LEAD_NOTICE = 2;

/** Самая длинная серия взятий, которая есть у стороны c (0 — бить нечего). */
export function longestCapture(board: Board, c: Color): number {
  return captureMoves(board, c).reduce((m, mv) => Math.max(m, mv.captures.length), 0);
}

export function reactionFor(ctx: ReactionContext<CheckersEvent, PlayerView>): Trigger | null {
  const moved = ctx.events.find((e) => e.type === 'moved');
  if (!moved || moved.type !== 'moved') return null;
  if (ctx.events.some((e) => e.type === 'gameOver')) return null;
  const n = moved.captured.length;
  const crossed = ctx.leadBefore < LEAD_NOTICE && ctx.leadAfter >= LEAD_NOTICE;
  const fell = ctx.leadBefore > -LEAD_NOTICE && ctx.leadAfter <= -LEAD_NOTICE;
  const last = moved.move.path[moved.move.path.length - 1]!;
  // Простая шашка встала на предпоследнюю горизонталь — до дамки один шаг.
  const nearCrown = !isKing(moved.piece) && !moved.crowned && Math.abs(rankOf(last) - crownRank(moved.color)) === 1;
  if (ctx.mover === 'opponent') {
    if (n >= 3) return { category: 'streak', emotion: 'laugh', gesture: 'fistPump', priority: 'reaction', chance: 0.9 };
    if (n >= 2) return { category: 'multiCapture', emotion: 'azart', gesture: 'fistPump', priority: 'reaction', chance: 0.9 };
    if (moved.crowned) return { category: 'crown', emotion: 'azart', gesture: 'fistPump', priority: 'reaction', chance: 0.9 };
    if (crossed) return { category: 'ahead', emotion: 'sly', gesture: 'leanIn', priority: 'reaction', chance: 0.6 };
    if (n === 1) return { category: 'boardCapture', emotion: 'azart', priority: 'reaction', chance: 0.45 };
    if (nearCrown) return { category: 'nearCrown', emotion: 'sly', gesture: 'leanIn', priority: 'reaction', chance: 0.5 };
    // Тихий ход с перевесом — довольный смешок.
    if (ctx.leadAfter >= LEAD_NOTICE) return { category: 'nvGiggle', emotion: 'sly', priority: 'reaction', chance: 0.15 };
    return { category: 'boardMove', emotion: 'sly', priority: 'reaction', chance: 0.18 };
  }
  if (n >= 3) return { category: 'praise', emotion: 'surprise', gesture: 'respectClap', priority: 'reaction', chance: 0.9 };
  if (n === 2) return { category: 'playerMultiCapture', emotion: 'surprise', gesture: 'handsOnHead', priority: 'reaction', chance: 0.9 };
  if (moved.crowned) return { category: 'playerCrown', emotion: 'surprise', gesture: 'surprised', priority: 'reaction', chance: 0.85 };
  if (fell) return { category: 'behind', emotion: 'annoyed', gesture: 'facepalm', priority: 'reaction', chance: 0.6 };
  // Игрок забрал дамку — короткое «ух ты», простую шашку — досада.
  if (n === 1 && moved.captured.some((c) => isKing(c.piece))) return { category: 'nvAh', emotion: 'surprise', gesture: 'surprised', priority: 'reaction', chance: 0.6 };
  if (n === 1) return { category: 'boardLostPiece', emotion: 'annoyed', gesture: 'facepalm', priority: 'reaction', chance: 0.5 };
  // Тихий ход подставил под серию: до хода у Костяна такой не было, теперь есть — «ты серьёзно?».
  const me = other(moved.color);
  if (n === 0 && longestCapture(ctx.after.board, me) >= 2 && longestCapture(ctx.before.board, me) < 2)
    return { category: 'playerBlunder', emotion: 'laugh', gesture: 'leanIn', priority: 'reaction', chance: 0.7 };
  if (nearCrown) return { category: 'playerNearCrown', emotion: 'surprise', gesture: 'watchMove', priority: 'reaction', chance: 0.5 };
  if (ctx.ply <= 2) return { category: 'opening', emotion: 'warm', gesture: 'watchMove', priority: 'reaction', chance: 0.5 };
  if (ctx.leadAfter <= -LEAD_NOTICE) return { category: 'nvSigh', emotion: 'sad', priority: 'reaction', chance: 0.15 };
  return { category: 'playerPlay', emotion: 'think', gesture: 'watchMove', priority: 'reaction', chance: 0.12 };
}
