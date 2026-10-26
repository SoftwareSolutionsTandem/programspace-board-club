// Реакции Костяна на события партии в шашки (docs/games/checkers.md §8): событие → эмоция, жест, реплика.
import type { ReactionContext } from '../../board/session';
import type { Trigger } from '../../characters/director';
import type { CheckersEvent } from './rules/engine';
import type { PlayerView } from './view';

/** Порог перевеса (шашка = 1, дамка = 2,5), после которого Костян замечает, что он впереди или позади. */
export const LEAD_NOTICE = 2;

export function reactionFor(ctx: ReactionContext<CheckersEvent, PlayerView>): Trigger | null {
  const moved = ctx.events.find((e) => e.type === 'moved');
  if (!moved || moved.type !== 'moved') return null;
  if (ctx.events.some((e) => e.type === 'gameOver')) return null;
  const n = moved.captured.length;
  const crossed = ctx.leadBefore < LEAD_NOTICE && ctx.leadAfter >= LEAD_NOTICE;
  const fell = ctx.leadBefore > -LEAD_NOTICE && ctx.leadAfter <= -LEAD_NOTICE;
  if (ctx.mover === 'opponent') {
    if (n >= 2) return { category: 'multiCapture', emotion: 'azart', gesture: 'fistPump', priority: 'reaction', chance: 0.9 };
    if (moved.crowned) return { category: 'crown', emotion: 'azart', gesture: 'fistPump', priority: 'reaction', chance: 0.9 };
    if (crossed) return { category: 'ahead', emotion: 'sly', gesture: 'leanIn', priority: 'reaction', chance: 0.6 };
    if (n === 1) return { category: 'boardCapture', emotion: 'azart', priority: 'reaction', chance: 0.45 };
    return { category: 'boardMove', emotion: 'sly', priority: 'reaction', chance: 0.18 };
  }
  if (n >= 3) return { category: 'praise', emotion: 'surprise', gesture: 'respectClap', priority: 'reaction', chance: 0.9 };
  if (n === 2) return { category: 'playerMultiCapture', emotion: 'surprise', gesture: 'handsOnHead', priority: 'reaction', chance: 0.9 };
  if (moved.crowned) return { category: 'playerCrown', emotion: 'surprise', gesture: 'surprised', priority: 'reaction', chance: 0.85 };
  if (fell) return { category: 'behind', emotion: 'annoyed', gesture: 'facepalm', priority: 'reaction', chance: 0.6 };
  if (n === 1) return { category: 'boardLostPiece', emotion: 'annoyed', gesture: 'facepalm', priority: 'reaction', chance: 0.5 };
  return { category: 'playerPlay', emotion: 'think', gesture: 'watchMove', priority: 'reaction', chance: 0.12 };
}
