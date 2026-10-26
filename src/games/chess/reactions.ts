// Реакции Харитона на события шахматной партии (docs/games/chess.md §8): событие → эмоция, жест, реплика.
// Чистая функция: решает «что показать и сказать», воспроизводит сеанс (src/board/session.ts).
import type { ReactionContext } from '../../board/session';
import type { Trigger } from '../../characters/director';
import type { ChessEvent } from './rules/engine';
import type { PlayerView } from './view';

/** Порог перевеса (в пешках), после которого Харитон замечает, что он впереди или позади. */
export const LEAD_NOTICE = 3;

export function reactionFor(ctx: ReactionContext<ChessEvent, PlayerView>): Trigger | null {
  const moved = ctx.events.find((e) => e.type === 'moved');
  if (!moved || moved.type !== 'moved') return null;
  // Итог партии озвучивает сеанс (win / lose / draw).
  if (ctx.events.some((e) => e.type === 'gameOver')) return null;
  const crossed = (k: number) => ctx.leadBefore < k && ctx.leadAfter >= k;
  const fell = (k: number) => ctx.leadBefore > -k && ctx.leadAfter <= -k;
  if (ctx.mover === 'opponent') {
    if (moved.promotion) return { category: 'promote', emotion: 'azart', gesture: 'eureka', priority: 'reaction', chance: 0.9 };
    if (moved.check) return { category: 'check', emotion: 'azart', gesture: 'lecture', priority: 'reaction', chance: 0.75 };
    if (moved.castle) return { category: 'castle', emotion: 'warm', priority: 'reaction', chance: 0.55 };
    if (crossed(LEAD_NOTICE)) return { category: 'ahead', emotion: 'sly', gesture: 'satisfied', priority: 'reaction', chance: 0.6 };
    if (moved.captured) return { category: 'boardCapture', emotion: 'sly', priority: 'reaction', chance: 0.45 };
    return { category: 'boardMove', emotion: 'think', priority: 'reaction', chance: 0.18 };
  }
  // Ход игрока.
  const bigCapture = moved.captured !== null && 'qr'.includes(moved.captured.toLowerCase());
  if (moved.promotion) return { category: 'playerPromote', emotion: 'surprise', gesture: 'surprised', priority: 'reaction', chance: 0.9 };
  if (moved.check && bigCapture) return { category: 'praise', emotion: 'surprise', gesture: 'applause', priority: 'reaction', chance: 0.9 };
  if (moved.check) return { category: 'inCheck', emotion: 'surprise', gesture: 'surprised', priority: 'reaction', chance: 0.75 };
  if (fell(LEAD_NOTICE)) return { category: 'behind', emotion: 'annoyed', gesture: 'facepalm', priority: 'reaction', chance: 0.6 };
  if (bigCapture) return { category: 'boardLostPiece', emotion: 'annoyed', gesture: 'facepalm', priority: 'reaction', chance: 0.8 };
  if (moved.captured) return { category: 'boardLostPiece', emotion: 'surprise', gesture: 'shakeHead', priority: 'reaction', chance: 0.5 };
  if (moved.castle) return { category: 'playerCastle', emotion: 'warm', priority: 'reaction', chance: 0.4 };
  return { category: 'playerPlay', emotion: 'think', gesture: 'watchMove', priority: 'reaction', chance: 0.12 };
}
